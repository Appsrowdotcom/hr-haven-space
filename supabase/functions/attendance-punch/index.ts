import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface PunchRequest {
  card_id: string
  punch_time?: string
  device_id?: string
  device_location?: string
  punch_type?: 'in' | 'out' // Optional - will auto-detect if not provided
}

interface BulkPunchRequest {
  punches: PunchRequest[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify API key from header (simple authentication for punch device)
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('PUNCH_API_KEY')
    
    if (!expectedApiKey) {
      console.error('PUNCH_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (apiKey !== expectedApiKey) {
      console.warn('Invalid API key attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('Received punch request:', JSON.stringify(body))

    // Handle both single punch and bulk punches
    const punches: PunchRequest[] = body.punches ? body.punches : [body]

    const results = []

    for (const punch of punches) {
      const { card_id, punch_time, device_id, device_location, punch_type } = punch

      if (!card_id) {
        results.push({ card_id, success: false, error: 'card_id is required' })
        continue
      }

      // Look up employee by card ID
      const { data: cardData, error: cardError } = await supabase
        .from('employee_cards')
        .select('profile_id, is_active, expires_at')
        .eq('card_id', card_id)
        .single()

      if (cardError || !cardData) {
        console.warn(`Card not found: ${card_id}`)
        results.push({ card_id, success: false, error: 'Card not registered' })
        continue
      }

      if (!cardData.is_active) {
        console.warn(`Card inactive: ${card_id}`)
        results.push({ card_id, success: false, error: 'Card is inactive' })
        continue
      }

      if (cardData.expires_at && new Date(cardData.expires_at) < new Date()) {
        console.warn(`Card expired: ${card_id}`)
        results.push({ card_id, success: false, error: 'Card has expired' })
        continue
      }

      const profile_id = cardData.profile_id
      const punchTimestamp = punch_time ? new Date(punch_time) : new Date()

      // Auto-detect punch type if not provided
      let detectedPunchType = punch_type
      if (!detectedPunchType) {
        // Get the last punch for this employee today
        const todayStart = new Date(punchTimestamp)
        todayStart.setHours(0, 0, 0, 0)

        const { data: lastPunch } = await supabase
          .from('attendance_punches')
          .select('punch_type')
          .eq('profile_id', profile_id)
          .gte('punch_time', todayStart.toISOString())
          .order('punch_time', { ascending: false })
          .limit(1)
          .single()

        // Toggle: if last punch was 'in', this should be 'out', and vice versa
        detectedPunchType = lastPunch?.punch_type === 'in' ? 'out' : 'in'
      }

      // Insert the punch record
      const { data: punchData, error: punchError } = await supabase
        .from('attendance_punches')
        .insert({
          profile_id,
          punch_time: punchTimestamp.toISOString(),
          punch_type: detectedPunchType,
          card_id,
          device_id,
          device_location,
          source: 'card',
        })
        .select()
        .single()

      if (punchError) {
        console.error(`Failed to record punch for card ${card_id}:`, punchError)
        results.push({ card_id, success: false, error: 'Failed to record punch' })
        continue
      }

      console.log(`Punch recorded successfully: ${card_id} - ${detectedPunchType}`)

      // Also update the daily attendance summary
      const dateStr = punchTimestamp.toISOString().split('T')[0]

      // Check if there's an attendance record for today
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile_id)
        .eq('date', dateStr)
        .single()

      if (!existingAttendance) {
        // Create new attendance record
        await supabase.from('attendance').insert({
          profile_id,
          date: dateStr,
          check_in: detectedPunchType === 'in' ? punchTimestamp.toISOString() : null,
          check_out: detectedPunchType === 'out' ? punchTimestamp.toISOString() : null,
          status: 'present',
        })
      } else {
        // Update existing record with first check-in and last check-out
        const updates: Record<string, any> = {}
        
        if (detectedPunchType === 'in' && !existingAttendance.check_in) {
          updates.check_in = punchTimestamp.toISOString()
        }
        
        if (detectedPunchType === 'out') {
          updates.check_out = punchTimestamp.toISOString()
          
          // Calculate total work hours from all punches
          const { data: allPunches } = await supabase
            .from('attendance_punches')
            .select('punch_time, punch_type')
            .eq('profile_id', profile_id)
            .gte('punch_time', `${dateStr}T00:00:00`)
            .lt('punch_time', `${dateStr}T23:59:59`)
            .order('punch_time', { ascending: true })

          if (allPunches) {
            let totalMinutes = 0
            let lastInTime: Date | null = null

            for (const p of allPunches) {
              if (p.punch_type === 'in') {
                lastInTime = new Date(p.punch_time)
              } else if (p.punch_type === 'out' && lastInTime) {
                const outTime = new Date(p.punch_time)
                totalMinutes += (outTime.getTime() - lastInTime.getTime()) / (1000 * 60)
                lastInTime = null
              }
            }

            updates.work_hours = Math.round((totalMinutes / 60) * 100) / 100
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('attendance')
            .update(updates)
            .eq('id', existingAttendance.id)
        }
      }

      results.push({
        card_id,
        success: true,
        punch_id: punchData.id,
        punch_type: detectedPunchType,
        punch_time: punchTimestamp.toISOString(),
      })
    }

    const allSuccessful = results.every(r => r.success)

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        results,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }),
      {
        status: allSuccessful ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Punch API error:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})