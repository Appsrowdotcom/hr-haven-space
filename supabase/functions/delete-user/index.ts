import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if requesting user is a company admin
    const { data: isAdmin } = await supabaseAdmin.rpc('is_company_admin', { _user_id: requestingUser.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Not authorized. Only company admins can delete users." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the user's company to verify they belong to the same company
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user_id)
      .single();

    const { data: requestingProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', requestingUser.id)
      .single();

    if (!targetProfile || !requestingProfile || targetProfile.company_id !== requestingProfile.company_id) {
      return new Response(
        JSON.stringify({ error: "User not found or not in your company" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clear foreign key references before deleting the user
    // This prevents FK constraint violations when deleting the profile
    await supabaseAdmin.from('company_modules').update({ enabled_by: null }).eq('enabled_by', user_id);
    await supabaseAdmin.from('departments').update({ head_id: null }).eq('head_id', user_id);
    await supabaseAdmin.from('employee_details').update({ reporting_manager_id: null }).eq('reporting_manager_id', user_id);
    await supabaseAdmin.from('leave_requests').update({ approved_by: null }).eq('approved_by', user_id);
    await supabaseAdmin.from('leave_requests').update({ manager_approved_by: null }).eq('manager_approved_by', user_id);
    await supabaseAdmin.from('leave_requests').update({ hr_approved_by: null }).eq('hr_approved_by', user_id);
    await supabaseAdmin.from('attendance_overrides').update({ overridden_by: null }).eq('overridden_by', user_id);
    await supabaseAdmin.from('expenses').update({ approved_by: null }).eq('approved_by', user_id);
    await supabaseAdmin.from('payroll_runs').update({ approved_by: null }).eq('approved_by', user_id);
    await supabaseAdmin.from('payroll_runs').update({ processed_by: null }).eq('processed_by', user_id);
    await supabaseAdmin.from('employee_onboarding_items').update({ completed_by: null }).eq('completed_by', user_id);

    // Delete the user from auth (this will cascade to profiles due to foreign key)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in delete-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
