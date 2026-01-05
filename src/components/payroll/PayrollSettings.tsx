import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import SalaryComponentsManager from './SalaryComponentsManager';
import TaxSlabsManager from './TaxSlabsManager';

interface PayrollSettings {
  id?: string;
  pay_cycle: string;
  pay_day: number;
  currency: string;
  pf_enabled: boolean;
  pf_employee_rate: number;
  pf_employer_rate: number;
  pf_limit: number;
  esi_enabled: boolean;
  esi_employee_rate: number;
  esi_employer_rate: number;
  esi_limit: number;
  professional_tax_enabled: boolean;
  tds_enabled: boolean;
}

const PayrollSettings: React.FC = () => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PayrollSettings>({
    pay_cycle: 'monthly',
    pay_day: 1,
    currency: 'INR',
    pf_enabled: true,
    pf_employee_rate: 12,
    pf_employer_rate: 12,
    pf_limit: 15000,
    esi_enabled: true,
    esi_employee_rate: 0.75,
    esi_employer_rate: 3.25,
    esi_limit: 21000,
    professional_tax_enabled: false,
    tds_enabled: true,
  });

  useEffect(() => {
    if (company?.id) {
      fetchSettings();
    }
  }, [company?.id]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_settings')
        .select('*')
        .eq('company_id', company!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching payroll settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const payload = {
        company_id: company.id,
        ...settings,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('payroll_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('payroll_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setSettings({ ...settings, id: data.id });
      }
      toast.success('Payroll settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="components">Salary Components</TabsTrigger>
        <TabsTrigger value="statutory">Statutory</TabsTrigger>
        <TabsTrigger value="tax">Tax Slabs</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payroll Cycle Settings</CardTitle>
            <CardDescription>
              Configure your payroll schedule and payment settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Pay Cycle</Label>
                <Select
                  value={settings.pay_cycle}
                  onValueChange={(v) => setSettings({ ...settings, pay_cycle: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pay Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={settings.pay_day}
                  onChange={(e) => setSettings({ ...settings, pay_day: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.pay_cycle === 'monthly' ? 'Day of month' : 'Day of week (1=Mon)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(v) => setSettings({ ...settings, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="components">
        <SalaryComponentsManager />
      </TabsContent>

      <TabsContent value="statutory" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Provident Fund (PF)</CardTitle>
            <CardDescription>
              Configure Employee Provident Fund deductions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable PF Deductions</Label>
              <Switch
                checked={settings.pf_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, pf_enabled: v })}
              />
            </div>
            {settings.pf_enabled && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Employee Contribution (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.pf_employee_rate}
                    onChange={(e) => setSettings({ ...settings, pf_employee_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employer Contribution (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.pf_employer_rate}
                    onChange={(e) => setSettings({ ...settings, pf_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PF Wage Ceiling (₹)</Label>
                  <Input
                    type="number"
                    value={settings.pf_limit}
                    onChange={(e) => setSettings({ ...settings, pf_limit: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Max basic salary for PF calculation</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee State Insurance (ESI)</CardTitle>
            <CardDescription>
              Configure ESI deductions for eligible employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable ESI Deductions</Label>
              <Switch
                checked={settings.esi_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, esi_enabled: v })}
              />
            </div>
            {settings.esi_enabled && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Employee Contribution (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.esi_employee_rate}
                    onChange={(e) => setSettings({ ...settings, esi_employee_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employer Contribution (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.esi_employer_rate}
                    onChange={(e) => setSettings({ ...settings, esi_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ESI Eligibility Limit (₹)</Label>
                  <Input
                    type="number"
                    value={settings.esi_limit}
                    onChange={(e) => setSettings({ ...settings, esi_limit: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Max gross salary for ESI eligibility</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other Statutory Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Professional Tax</Label>
                <p className="text-sm text-muted-foreground">Enable state professional tax deductions</p>
              </div>
              <Switch
                checked={settings.professional_tax_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, professional_tax_enabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>TDS (Tax Deducted at Source)</Label>
                <p className="text-sm text-muted-foreground">Enable automatic TDS calculations</p>
              </div>
              <Switch
                checked={settings.tds_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, tds_enabled: v })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Statutory Settings
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="tax">
        <TaxSlabsManager />
      </TabsContent>
    </Tabs>
  );
};

export default PayrollSettings;
