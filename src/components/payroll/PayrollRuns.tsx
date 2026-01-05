import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Loader2, Plus, Play, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface PayrollRun {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer_cost: number;
  employee_count: number;
  processed_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  processed_by_name: string | null;
  approved_by_name: string | null;
}

interface PayrollSettings {
  pf_enabled: boolean;
  pf_employee_rate: number;
  pf_employer_rate: number;
  pf_limit: number;
  esi_enabled: boolean;
  esi_employee_rate: number;
  esi_employer_rate: number;
  esi_limit: number;
  tds_enabled: boolean;
}

const PayrollRuns: React.FC = () => {
  const { company } = useCompany();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('finance.manage_payroll');
  
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newRun, setNewRun] = useState({
    pay_period_start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    pay_period_end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    pay_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    if (company?.id) {
      fetchRuns();
    }
  }, [company?.id]);

  const fetchRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_run_summary')
        .select('*')
        .eq('company_id', company!.id)
        .order('pay_period_end', { ascending: false });

      if (error) throw error;
      setRuns((data || []) as PayrollRun[]);
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async () => {
    if (!company?.id || !user?.id) return;
    setProcessing(true);
    
    try {
      // Fetch payroll settings
      const { data: settings } = await supabase
        .from('payroll_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch all active employee salaries with components
      const { data: salaries, error: salError } = await supabase
        .from('employee_salary_details')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (salError) throw salError;
      if (!salaries || salaries.length === 0) {
        toast.error('No employee salaries found. Please set up salaries first.');
        setProcessing(false);
        return;
      }

      // Create payroll run
      const { data: payrollRun, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
          company_id: company.id,
          pay_period_start: newRun.pay_period_start,
          pay_period_end: newRun.pay_period_end,
          pay_date: newRun.pay_date,
          status: 'processing',
          notes: newRun.notes,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw runError;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalEmployerCost = 0;

      // Process each employee
      for (const salary of salaries) {
        // Fetch salary components
        const { data: components } = await supabase
          .from('employee_salary_components')
          .select(`
            amount,
            component_id,
            salary_components (
              name,
              code,
              type,
              is_taxable,
              is_pf_applicable,
              is_esi_applicable
            )
          `)
          .eq('employee_salary_id', salary.id);

        // Calculate earnings
        let grossEarnings = 0;
        let pfWage = 0;
        const payslipItems: any[] = [];

        // Add earnings
        (components || []).forEach((comp: any) => {
          if (comp.salary_components?.type === 'earning') {
            grossEarnings += comp.amount;
            if (comp.salary_components.is_pf_applicable) {
              pfWage += comp.amount;
            }
            payslipItems.push({
              component_id: comp.component_id,
              component_name: comp.salary_components.name,
              component_code: comp.salary_components.code,
              type: 'earning',
              amount: comp.amount,
              sort_order: 1,
            });
          }
        });

        // Calculate deductions
        let deductions = 0;
        let employerPF = 0;
        let employerESI = 0;

        // PF Calculation
        if (settings?.pf_enabled) {
          const pfBase = Math.min(pfWage, settings.pf_limit);
          const employeePF = Math.round(pfBase * (settings.pf_employee_rate / 100));
          employerPF = Math.round(pfBase * (settings.pf_employer_rate / 100));
          deductions += employeePF;
          payslipItems.push({
            component_name: 'Provident Fund',
            component_code: 'PF',
            type: 'deduction',
            amount: employeePF,
            sort_order: 100,
          });
        }

        // ESI Calculation
        if (settings?.esi_enabled && grossEarnings <= settings.esi_limit) {
          const employeeESI = Math.round(grossEarnings * (settings.esi_employee_rate / 100));
          employerESI = Math.round(grossEarnings * (settings.esi_employer_rate / 100));
          deductions += employeeESI;
          payslipItems.push({
            component_name: 'ESI',
            component_code: 'ESI',
            type: 'deduction',
            amount: employeeESI,
            sort_order: 101,
          });
        }

        // Simple TDS calculation (placeholder - actual TDS needs more complex calculation)
        let tdsAmount = 0;
        if (settings?.tds_enabled) {
          const annualIncome = grossEarnings * 12;
          if (annualIncome > 700000) {
            // Simplified new regime calculation
            tdsAmount = Math.round((annualIncome - 300000) * 0.05 / 12);
            if (annualIncome > 700000) {
              tdsAmount = Math.round(((700000 - 300000) * 0.05 + (annualIncome - 700000) * 0.10) / 12);
            }
            deductions += tdsAmount;
            payslipItems.push({
              component_name: 'TDS',
              component_code: 'TDS',
              type: 'deduction',
              amount: tdsAmount,
              sort_order: 103,
            });
          }
        }

        const netPay = grossEarnings - deductions;
        const employerCost = grossEarnings + employerPF + employerESI;

        // Create payslip
        const { data: payslip, error: payslipError } = await supabase
          .from('payslips')
          .insert({
            payroll_run_id: payrollRun.id,
            profile_id: salary.profile_id,
            employee_salary_id: salary.id,
            employee_name: salary.employee_name || '',
            employee_email: salary.employee_email || '',
            department_name: salary.department_name,
            designation: salary.designation,
            bank_account_number: salary.bank_account_number,
            bank_name: salary.bank_name,
            ifsc_code: salary.ifsc_code,
            pan_number: salary.pan_number,
            pf_number: salary.pf_number,
            esi_number: salary.esi_number,
            uan_number: salary.uan_number,
            pay_period_start: newRun.pay_period_start,
            pay_period_end: newRun.pay_period_end,
            working_days: 30,
            days_worked: 30,
            days_on_leave: 0,
            lop_days: 0,
            gross_earnings: grossEarnings,
            total_deductions: deductions,
            net_pay: netPay,
            employer_pf: employerPF,
            employer_esi: employerESI,
            employer_cost: employerCost,
            taxable_income: grossEarnings * 12,
            tds_amount: tdsAmount,
            status: 'generated',
          })
          .select()
          .single();

        if (payslipError) throw payslipError;

        // Insert payslip items
        if (payslipItems.length > 0) {
          await supabase
            .from('payslip_items')
            .insert(payslipItems.map(item => ({ ...item, payslip_id: payslip.id })));
        }

        totalGross += grossEarnings;
        totalDeductions += deductions;
        totalNet += netPay;
        totalEmployerCost += employerCost;
      }

      // Update payroll run with totals
      await supabase
        .from('payroll_runs')
        .update({
          status: 'processed',
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          total_employer_cost: totalEmployerCost,
          employee_count: salaries.length,
        })
        .eq('id', payrollRun.id);

      toast.success(`Payroll processed for ${salaries.length} employees`);
      setDialogOpen(false);
      fetchRuns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const updateStatus = async (runId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      } else if (newStatus === 'paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payroll_runs')
        .update(updates)
        .eq('id', runId);

      if (error) throw error;
      toast.success(`Payroll ${newStatus}`);
      fetchRuns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      processing: 'outline',
      processed: 'default',
      approved: 'default',
      paid: 'default',
      cancelled: 'destructive',
    };
    const colors: Record<string, string> = {
      processed: 'bg-blue-500',
      approved: 'bg-green-500',
      paid: 'bg-emerald-600',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Payroll Runs</h3>
          <p className="text-sm text-muted-foreground">Process and manage monthly payroll</p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Play className="h-4 w-4 mr-2" />
            Run Payroll
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payroll runs yet. Click "Run Payroll" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-[150px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      {format(new Date(run.pay_period_start), 'dd MMM')} - {format(new Date(run.pay_period_end), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{format(new Date(run.pay_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{run.employee_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(run.total_gross)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(run.total_deductions)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(run.total_net)}</TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          {run.status === 'processed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(run.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {run.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(run.id, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>
              Process payroll for the selected pay period
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={newRun.pay_period_start}
                  onChange={(e) => setNewRun({ ...newRun, pay_period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={newRun.pay_period_end}
                  onChange={(e) => setNewRun({ ...newRun, pay_period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={newRun.pay_date}
                onChange={(e) => setNewRun({ ...newRun, pay_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newRun.notes}
                onChange={(e) => setNewRun({ ...newRun, notes: e.target.value })}
                placeholder="Any notes for this payroll run..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={processPayroll} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Play className="h-4 w-4 mr-2" />
              Process Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollRuns;
