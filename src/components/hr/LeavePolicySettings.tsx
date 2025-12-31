import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Loader2, Save } from 'lucide-react';

interface LeavePolicy {
  id?: string;
  min_days_advance_planned: number;
  probation_months: number;
  leave_credit_start_month: number;
  allow_negative_balance: boolean;
  allow_advance_leave: boolean;
  emergency_default_unpaid: boolean;
  unplanned_default_unpaid: boolean;
}

const DEFAULT_POLICY: LeavePolicy = {
  min_days_advance_planned: 2,
  probation_months: 3,
  leave_credit_start_month: 4,
  allow_negative_balance: false,
  allow_advance_leave: false,
  emergency_default_unpaid: true,
  unplanned_default_unpaid: true,
};

export function LeavePolicySettings() {
  const { company } = useCompany();
  const [policy, setPolicy] = useState<LeavePolicy>(DEFAULT_POLICY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!company?.id) return;
      setIsLoading(true);

      const { data, error } = await supabase
        .from('leave_policies')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (!error && data) {
        setPolicy({
          id: data.id,
          min_days_advance_planned: data.min_days_advance_planned,
          probation_months: data.probation_months,
          leave_credit_start_month: data.leave_credit_start_month,
          allow_negative_balance: data.allow_negative_balance,
          allow_advance_leave: data.allow_advance_leave ?? false,
          emergency_default_unpaid: data.emergency_default_unpaid,
          unplanned_default_unpaid: data.unplanned_default_unpaid,
        });
      }
      setIsLoading(false);
    };

    fetchPolicy();
  }, [company?.id]);

  const handleSave = async () => {
    if (!company?.id) return;
    setIsSaving(true);

    try {
      if (policy.id) {
        const { error } = await supabase
          .from('leave_policies')
          .update({
            min_days_advance_planned: policy.min_days_advance_planned,
            probation_months: policy.probation_months,
            leave_credit_start_month: policy.leave_credit_start_month,
            allow_negative_balance: policy.allow_negative_balance,
            allow_advance_leave: policy.allow_advance_leave,
            emergency_default_unpaid: policy.emergency_default_unpaid,
            unplanned_default_unpaid: policy.unplanned_default_unpaid,
          })
          .eq('id', policy.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('leave_policies')
          .insert({
            company_id: company.id,
            min_days_advance_planned: policy.min_days_advance_planned,
            probation_months: policy.probation_months,
            leave_credit_start_month: policy.leave_credit_start_month,
            allow_negative_balance: policy.allow_negative_balance,
            allow_advance_leave: policy.allow_advance_leave,
            emergency_default_unpaid: policy.emergency_default_unpaid,
            unplanned_default_unpaid: policy.unplanned_default_unpaid,
          })
          .select()
          .single();

        if (error) throw error;
        setPolicy(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Leave policy saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Leave Policy Configuration
        </CardTitle>
        <CardDescription>
          Configure company-wide leave rules and eligibility criteria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timing Rules */}
        <div className="space-y-4">
          <h3 className="font-medium">Timing Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_days">Min Days Advance for Planned Leave</Label>
              <Input
                id="min_days"
                type="number"
                min={1}
                value={policy.min_days_advance_planned}
                onChange={(e) => setPolicy(prev => ({
                  ...prev,
                  min_days_advance_planned: parseInt(e.target.value) || 2
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Leave applied less than this is marked "Unplanned"
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="probation">Probation Period (months)</Label>
              <Input
                id="probation"
                type="number"
                min={0}
                value={policy.probation_months}
                onChange={(e) => setPolicy(prev => ({
                  ...prev,
                  probation_months: parseInt(e.target.value) || 3
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Probation employees get no paid leave during this period
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_start">Leave Credits Start From (month)</Label>
              <Input
                id="credit_start"
                type="number"
                min={1}
                value={policy.leave_credit_start_month}
                onChange={(e) => setPolicy(prev => ({
                  ...prev,
                  leave_credit_start_month: parseInt(e.target.value) || 4
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Employees earn leave credits starting from this month
              </p>
            </div>
          </div>
        </div>

        {/* Default Paid/Unpaid Rules */}
        <div className="space-y-4">
          <h3 className="font-medium">Default Payment Rules</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Unplanned Leave is Unpaid by Default</Label>
                <p className="text-sm text-muted-foreground">
                  Leave applied without {policy.min_days_advance_planned} days notice will be unpaid unless HR approves
                </p>
              </div>
              <Switch
                checked={policy.unplanned_default_unpaid}
                onCheckedChange={(checked) => setPolicy(prev => ({
                  ...prev,
                  unplanned_default_unpaid: checked
                }))}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Emergency Leave is Unpaid by Default</Label>
                <p className="text-sm text-muted-foreground">
                  Emergency leaves will be unpaid until HR reviews and converts to paid
                </p>
              </div>
              <Switch
                checked={policy.emergency_default_unpaid}
                onCheckedChange={(checked) => setPolicy(prev => ({
                  ...prev,
                  emergency_default_unpaid: checked
                }))}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Allow Negative Leave Balance</Label>
                <p className="text-sm text-muted-foreground">
                  Allow employees to apply for leave even if they don't have sufficient balance
                </p>
              </div>
              <Switch
                checked={policy.allow_negative_balance}
                onCheckedChange={(checked) => setPolicy(prev => ({
                  ...prev,
                  allow_negative_balance: checked
                }))}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Allow Pre-availing Leaves</Label>
                <p className="text-sm text-muted-foreground">
                  Allow employees to use future (unaccrued) leave credits with HR approval
                </p>
              </div>
              <Switch
                checked={policy.allow_advance_leave}
                onCheckedChange={(checked) => setPolicy(prev => ({
                  ...prev,
                  allow_advance_leave: checked
                }))}
              />
            </div>
          </div>
        </div>

        {/* Eligibility Summary */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="font-medium">Eligibility Rules Summary</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>Trainees & Interns:</strong> No paid leave, only emergency (unpaid)</li>
            <li>• <strong>Probation (first {policy.probation_months} months):</strong> No paid leave</li>
            <li>• <strong>Leave credits start:</strong> From month {policy.leave_credit_start_month} (credits accrue monthly)</li>
            <li>• <strong>Pre-availing:</strong> {policy.allow_advance_leave ? 'Allowed with HR approval' : 'Not allowed - only accrued balance can be used'}</li>
            <li>• <strong>Planned leave:</strong> Applied ≥{policy.min_days_advance_planned} days in advance → Manager approval</li>
            <li>• <strong>Unplanned leave:</strong> Applied &lt;{policy.min_days_advance_planned} days → HR + Manager approval</li>
            <li>• <strong>Emergency / &gt;2 days:</strong> Requires HR + Manager approval</li>
          </ul>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Policy
        </Button>
      </CardContent>
    </Card>
  );
}
