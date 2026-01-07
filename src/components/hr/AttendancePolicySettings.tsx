import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Clock, Calendar, AlertTriangle, Timer, Save } from 'lucide-react';

interface AttendancePolicy {
  id: string;
  company_id: string;
  name: string;
  is_default: boolean;
  working_days: string[];
  shift_start_time: string;
  shift_end_time: string;
  min_work_hours: number;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  late_deduction_enabled: boolean;
  late_deduction_per_instance: number;
  max_late_per_month: number;
  early_exit_threshold_minutes: number;
  early_exit_deduction_enabled: boolean;
  short_hours_threshold: number;
  auto_half_day_enabled: boolean;
  half_day_min_hours: number;
  half_day_max_hours: number;
  auto_absent_enabled: boolean;
  absent_if_no_punch: boolean;
  absent_if_less_than_hours: number;
  overtime_enabled: boolean;
  overtime_after_hours: number;
  overtime_multiplier: number;
}

const defaultPolicy: Omit<AttendancePolicy, 'id' | 'company_id'> = {
  name: 'Default Policy',
  is_default: true,
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  shift_start_time: '09:00',
  shift_end_time: '18:00',
  min_work_hours: 8,
  grace_period_minutes: 15,
  late_threshold_minutes: 15,
  late_deduction_enabled: false,
  late_deduction_per_instance: 0,
  max_late_per_month: 3,
  early_exit_threshold_minutes: 15,
  early_exit_deduction_enabled: false,
  short_hours_threshold: 4,
  auto_half_day_enabled: true,
  half_day_min_hours: 4,
  half_day_max_hours: 6,
  auto_absent_enabled: true,
  absent_if_no_punch: true,
  absent_if_less_than_hours: 4,
  overtime_enabled: false,
  overtime_after_hours: 9,
  overtime_multiplier: 1.5,
};

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const AttendancePolicySettings: React.FC = () => {
  const { company } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [hasPolicy, setHasPolicy] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchPolicy();
    }
  }, [company?.id]);

  const fetchPolicy = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_policies')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPolicy({
          ...data,
          working_days: data.working_days as string[],
          shift_start_time: data.shift_start_time?.substring(0, 5) || '09:00',
          shift_end_time: data.shift_end_time?.substring(0, 5) || '18:00',
        });
        setHasPolicy(true);
      } else {
        setPolicy({
          id: '',
          company_id: company.id,
          ...defaultPolicy,
        });
        setHasPolicy(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company?.id || !policy) return;
    setIsSaving(true);
    try {
      const policyData = {
        company_id: company.id,
        name: policy.name,
        is_default: true,
        working_days: policy.working_days,
        shift_start_time: policy.shift_start_time + ':00',
        shift_end_time: policy.shift_end_time + ':00',
        min_work_hours: policy.min_work_hours,
        grace_period_minutes: policy.grace_period_minutes,
        late_threshold_minutes: policy.late_threshold_minutes,
        late_deduction_enabled: policy.late_deduction_enabled,
        late_deduction_per_instance: policy.late_deduction_per_instance,
        max_late_per_month: policy.max_late_per_month,
        early_exit_threshold_minutes: policy.early_exit_threshold_minutes,
        early_exit_deduction_enabled: policy.early_exit_deduction_enabled,
        short_hours_threshold: policy.short_hours_threshold,
        auto_half_day_enabled: policy.auto_half_day_enabled,
        half_day_min_hours: policy.half_day_min_hours,
        half_day_max_hours: policy.half_day_max_hours,
        auto_absent_enabled: policy.auto_absent_enabled,
        absent_if_no_punch: policy.absent_if_no_punch,
        absent_if_less_than_hours: policy.absent_if_less_than_hours,
        overtime_enabled: policy.overtime_enabled,
        overtime_after_hours: policy.overtime_after_hours,
        overtime_multiplier: policy.overtime_multiplier,
      };

      if (hasPolicy && policy.id) {
        const { error } = await supabase
          .from('attendance_policies')
          .update(policyData)
          .eq('id', policy.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('attendance_policies')
          .insert(policyData)
          .select()
          .single();
        if (error) throw error;
        setPolicy({ ...policy, id: data.id });
        setHasPolicy(true);
      }

      toast.success('Attendance policy saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWorkingDay = (day: string) => {
    if (!policy) return;
    const days = policy.working_days.includes(day)
      ? policy.working_days.filter(d => d !== day)
      : [...policy.working_days, day];
    setPolicy({ ...policy, working_days: days });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!policy) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendance Policy</h2>
          <p className="text-sm text-muted-foreground">Configure attendance rules for your organization</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Policy
        </Button>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule"><Calendar className="mr-2 h-4 w-4" />Schedule</TabsTrigger>
          <TabsTrigger value="rules"><Clock className="mr-2 h-4 w-4" />Rules</TabsTrigger>
          <TabsTrigger value="auto"><Timer className="mr-2 h-4 w-4" />Auto Rules</TabsTrigger>
          <TabsTrigger value="overtime"><AlertTriangle className="mr-2 h-4 w-4" />Overtime</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Working Schedule</CardTitle>
              <CardDescription>Define the standard work schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={policy.working_days.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleWorkingDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Shift Start Time</Label>
                  <Input
                    type="time"
                    value={policy.shift_start_time}
                    onChange={(e) => setPolicy({ ...policy, shift_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shift End Time</Label>
                  <Input
                    type="time"
                    value={policy.shift_end_time}
                    onChange={(e) => setPolicy({ ...policy, shift_end_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Work Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={policy.min_work_hours}
                    onChange={(e) => setPolicy({ ...policy, min_work_hours: parseFloat(e.target.value) || 8 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Grace Period & Late Arrival</CardTitle>
                <CardDescription>Configure grace period and late arrival rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grace Period (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      value={policy.grace_period_minutes}
                      onChange={(e) => setPolicy({ ...policy, grace_period_minutes: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Employees arriving within this time after shift start won't be marked late
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Late Threshold (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={policy.late_threshold_minutes}
                      onChange={(e) => setPolicy({ ...policy, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mark as late after this many minutes past shift start
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable Late Deduction</Label>
                    <p className="text-sm text-muted-foreground">Deduct salary for late arrivals</p>
                  </div>
                  <Switch
                    checked={policy.late_deduction_enabled}
                    onCheckedChange={(checked) => setPolicy({ ...policy, late_deduction_enabled: checked })}
                  />
                </div>

                {policy.late_deduction_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label>Deduction per Late Instance</Label>
                      <Input
                        type="number"
                        min="0"
                        value={policy.late_deduction_per_instance}
                        onChange={(e) => setPolicy({ ...policy, late_deduction_per_instance: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Late Per Month (allowed)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={policy.max_late_per_month}
                        onChange={(e) => setPolicy({ ...policy, max_late_per_month: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Early Exit Rules</CardTitle>
                <CardDescription>Configure early exit penalties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Early Exit Threshold (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={policy.early_exit_threshold_minutes}
                    onChange={(e) => setPolicy({ ...policy, early_exit_threshold_minutes: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mark as early exit if leaving more than this many minutes before shift end
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable Early Exit Deduction</Label>
                    <p className="text-sm text-muted-foreground">Deduct salary for early exits</p>
                  </div>
                  <Switch
                    checked={policy.early_exit_deduction_enabled}
                    onCheckedChange={(checked) => setPolicy({ ...policy, early_exit_deduction_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="auto">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auto Half-Day Rules</CardTitle>
                <CardDescription>Automatically mark half-day based on work hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable Auto Half-Day</Label>
                    <p className="text-sm text-muted-foreground">Automatically mark attendance as half-day</p>
                  </div>
                  <Switch
                    checked={policy.auto_half_day_enabled}
                    onCheckedChange={(checked) => setPolicy({ ...policy, auto_half_day_enabled: checked })}
                  />
                </div>

                {policy.auto_half_day_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label>Min Hours for Half-Day</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        value={policy.half_day_min_hours}
                        onChange={(e) => setPolicy({ ...policy, half_day_min_hours: parseFloat(e.target.value) || 4 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Hours for Half-Day</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        value={policy.half_day_max_hours}
                        onChange={(e) => setPolicy({ ...policy, half_day_max_hours: parseFloat(e.target.value) || 6 })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto Absent Rules</CardTitle>
                <CardDescription>Automatically mark absent based on conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable Auto Absent</Label>
                    <p className="text-sm text-muted-foreground">Automatically mark attendance as absent</p>
                  </div>
                  <Switch
                    checked={policy.auto_absent_enabled}
                    onCheckedChange={(checked) => setPolicy({ ...policy, auto_absent_enabled: checked })}
                  />
                </div>

                {policy.auto_absent_enabled && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="absent-no-punch"
                        checked={policy.absent_if_no_punch}
                        onCheckedChange={(checked) => setPolicy({ ...policy, absent_if_no_punch: !!checked })}
                      />
                      <Label htmlFor="absent-no-punch">Mark absent if no punch recorded</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Mark Absent if Work Hours Less Than</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={policy.absent_if_less_than_hours}
                        onChange={(e) => setPolicy({ ...policy, absent_if_less_than_hours: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overtime">
          <Card>
            <CardHeader>
              <CardTitle>Overtime Rules</CardTitle>
              <CardDescription>Configure overtime calculation rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Enable Overtime Calculation</Label>
                  <p className="text-sm text-muted-foreground">Calculate and track overtime hours</p>
                </div>
                <Switch
                  checked={policy.overtime_enabled}
                  onCheckedChange={(checked) => setPolicy({ ...policy, overtime_enabled: checked })}
                />
              </div>

              {policy.overtime_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>Overtime After (hours)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      value={policy.overtime_after_hours}
                      onChange={(e) => setPolicy({ ...policy, overtime_after_hours: parseFloat(e.target.value) || 9 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hours worked beyond this count as overtime
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime Multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={policy.overtime_multiplier}
                      onChange={(e) => setPolicy({ ...policy, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., 1.5x means 50% extra pay for overtime
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendancePolicySettings;
