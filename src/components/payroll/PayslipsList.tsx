import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Search, FileText, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Payslip {
  id: string;
  payroll_run_id: string;
  profile_id: string;
  employee_name: string;
  employee_email: string;
  department_name: string | null;
  designation: string | null;
  pay_period_start: string;
  pay_period_end: string;
  working_days: number;
  days_worked: number;
  gross_earnings: number;
  total_deductions: number;
  net_pay: number;
  employer_pf: number;
  employer_esi: number;
  employer_cost: number;
  tds_amount: number;
  bank_name: string | null;
  bank_account_number: string | null;
  pan_number: string | null;
  pf_number: string | null;
  status: string;
}

interface PayslipItem {
  id: string;
  component_name: string;
  component_code: string;
  type: string;
  amount: number;
}

interface PayrollRun {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
}

const PayslipsList: React.FC = () => {
  const { company } = useCompany();
  const { user } = useAuth();
  
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [payslipItems, setPayslipItems] = useState<PayslipItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      fetchPayslips();
    }
  }, [selectedRun]);

  const fetchData = async () => {
    try {
      const { data: runs, error } = await supabase
        .from('payroll_runs')
        .select('id, pay_period_start, pay_period_end')
        .eq('company_id', company!.id)
        .order('pay_period_end', { ascending: false });

      if (error) throw error;
      setPayrollRuns(runs || []);
      
      if (runs && runs.length > 0) {
        setSelectedRun(runs[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async () => {
    if (!company?.id) return;
    
    try {
      let query = supabase
        .from('payslips')
        .select('*')
        .order('employee_name');

      if (selectedRun !== 'all') {
        query = query.eq('payroll_run_id', selectedRun);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayslips(data || []);
    } catch (error) {
      console.error('Error fetching payslips:', error);
    }
  };

  const viewPayslip = async (payslip: Payslip) => {
    setViewingPayslip(payslip);
    
    const { data, error } = await supabase
      .from('payslip_items')
      .select('*')
      .eq('payslip_id', payslip.id)
      .order('sort_order');
    
    if (!error) {
      setPayslipItems(data || []);
    }
    setDialogOpen(true);
  };

  const filteredPayslips = payslips.filter(p =>
    p.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employee_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const earnings = payslipItems.filter(i => i.type === 'earning');
  const deductions = payslipItems.filter(i => i.type === 'deduction');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedRun} onValueChange={setSelectedRun}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select pay period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {payrollRuns.map(run => (
                <SelectItem key={run.id} value={run.id}>
                  {format(new Date(run.pay_period_start), 'dd MMM')} - {format(new Date(run.pay_period_end), 'dd MMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>
            {filteredPayslips.length} payslips found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayslips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payslips found for the selected period.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payslip.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{payslip.employee_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{payslip.department_name || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(payslip.pay_period_start), 'dd MMM')} - {format(new Date(payslip.pay_period_end), 'dd MMM')}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(payslip.gross_earnings)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payslip.total_deductions)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payslip.net_pay)}</TableCell>
                    <TableCell>
                      <Badge variant={payslip.status === 'paid' ? 'default' : 'secondary'}>
                        {payslip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewPayslip(payslip)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
          </DialogHeader>

          {viewingPayslip && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid gap-4 grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="font-medium">{viewingPayslip.employee_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p className="font-medium">{viewingPayslip.department_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Designation</p>
                  <p className="font-medium">{viewingPayslip.designation || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pay Period</p>
                  <p className="font-medium">
                    {format(new Date(viewingPayslip.pay_period_start), 'dd MMM yyyy')} - {format(new Date(viewingPayslip.pay_period_end), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Earnings & Deductions */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-green-600 mb-3">Earnings</h4>
                  <div className="space-y-2">
                    {earnings.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.component_name}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Gross Earnings</span>
                      <span>{formatCurrency(viewingPayslip.gross_earnings)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-red-600 mb-3">Deductions</h4>
                  <div className="space-y-2">
                    {deductions.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.component_name}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Deductions</span>
                      <span>{formatCurrency(viewingPayslip.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net Pay */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Net Pay</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(viewingPayslip.net_pay)}</span>
                </div>
              </div>

              {/* Bank Details */}
              {viewingPayslip.bank_account_number && (
                <div className="text-sm text-muted-foreground">
                  <p>Bank: {viewingPayslip.bank_name} | A/C: ****{viewingPayslip.bank_account_number.slice(-4)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayslipsList;
