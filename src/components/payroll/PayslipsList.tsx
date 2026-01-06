import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, Search, FileText, Download, Eye, Printer, Building2 } from 'lucide-react';
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
  days_on_leave: number;
  lop_days: number;
  gross_earnings: number;
  total_deductions: number;
  net_pay: number;
  employer_pf: number;
  employer_esi: number;
  employer_cost: number;
  tds_amount: number;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  pan_number: string | null;
  pf_number: string | null;
  uan_number: string | null;
  esi_number: string | null;
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
  const printRef = useRef<HTMLDivElement>(null);
  
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

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${viewingPayslip?.employee_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-section { padding: 10px; background: #f9f9f9; border-radius: 5px; }
            .info-section h3 { font-size: 14px; color: #666; margin-bottom: 5px; }
            .info-section p { font-size: 14px; font-weight: 500; }
            .components { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .component-section { border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
            .component-header { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .component-header.earnings { color: green; }
            .component-header.deductions { color: #dc2626; }
            .component-row { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #eee; }
            .component-row:last-child { border-bottom: none; }
            .component-total { font-weight: bold; background: #f9f9f9; }
            .net-pay { text-align: center; padding: 20px; background: #1e40af; color: white; border-radius: 5px; margin-bottom: 20px; }
            .net-pay h3 { font-size: 14px; opacity: 0.9; }
            .net-pay p { font-size: 28px; font-weight: bold; }
            .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Payslip Details</span>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>

          {viewingPayslip && (
            <div ref={printRef}>
              {/* Header */}
              <div className="header text-center mb-6 pb-4 border-b-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Building2 className="h-6 w-6" />
                  <h1 className="text-xl font-bold">{company?.name}</h1>
                </div>
                <p className="text-muted-foreground">
                  Payslip for {format(new Date(viewingPayslip.pay_period_start), 'MMMM yyyy')}
                </p>
              </div>

              {/* Employee Info */}
              <div className="info-grid grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">Employee Name</h3>
                  <p className="font-medium">{viewingPayslip.employee_name}</p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">Department</h3>
                  <p className="font-medium">{viewingPayslip.department_name || '-'}</p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">Designation</h3>
                  <p className="font-medium">{viewingPayslip.designation || '-'}</p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">Pay Period</h3>
                  <p className="font-medium">
                    {format(new Date(viewingPayslip.pay_period_start), 'dd MMM')} - {format(new Date(viewingPayslip.pay_period_end), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">PAN</h3>
                  <p className="font-medium">{viewingPayslip.pan_number || '-'}</p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">PF Number</h3>
                  <p className="font-medium">{viewingPayslip.pf_number || '-'}</p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">UAN</h3>
                  <p className="font-medium">{viewingPayslip.uan_number || '-'}</p>
                </div>
                <div className="info-section p-3 bg-muted rounded-lg">
                  <h3 className="text-xs text-muted-foreground">Days Worked</h3>
                  <p className="font-medium">{viewingPayslip.days_worked} / {viewingPayslip.working_days}</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Earnings & Deductions */}
              <div className="components grid gap-6 md:grid-cols-2 mb-6">
                <div className="component-section border rounded-lg overflow-hidden">
                  <div className="component-header bg-green-50 dark:bg-green-950 p-3 font-semibold text-green-700 dark:text-green-400">
                    Earnings
                  </div>
                  <div className="divide-y">
                    {earnings.map(item => (
                      <div key={item.id} className="component-row flex justify-between p-3">
                        <span className="text-sm">{item.component_name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="component-row component-total flex justify-between p-3 bg-muted font-bold">
                      <span>Gross Earnings</span>
                      <span className="text-green-600">{formatCurrency(viewingPayslip.gross_earnings)}</span>
                    </div>
                  </div>
                </div>

                <div className="component-section border rounded-lg overflow-hidden">
                  <div className="component-header bg-red-50 dark:bg-red-950 p-3 font-semibold text-red-700 dark:text-red-400">
                    Deductions
                  </div>
                  <div className="divide-y">
                    {deductions.map(item => (
                      <div key={item.id} className="component-row flex justify-between p-3">
                        <span className="text-sm">{item.component_name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="component-row component-total flex justify-between p-3 bg-muted font-bold">
                      <span>Total Deductions</span>
                      <span className="text-red-600">{formatCurrency(viewingPayslip.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="net-pay bg-primary text-primary-foreground p-6 rounded-lg text-center mb-6">
                <h3 className="text-sm opacity-90 mb-1">Net Pay</h3>
                <p className="text-3xl font-bold">{formatCurrency(viewingPayslip.net_pay)}</p>
                <p className="text-sm opacity-75 mt-2">
                  ({numberToWords(Math.round(viewingPayslip.net_pay))} Rupees Only)
                </p>
              </div>

              {/* Bank Details */}
              {viewingPayslip.bank_account_number && (
                <div className="border rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-2">Bank Details</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bank Name:</span>
                      <span className="ml-2 font-medium">{viewingPayslip.bank_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account:</span>
                      <span className="ml-2 font-medium">****{viewingPayslip.bank_account_number.slice(-4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IFSC:</span>
                      <span className="ml-2 font-medium">{viewingPayslip.ifsc_code}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Employer Contribution */}
              {(viewingPayslip.employer_pf > 0 || viewingPayslip.employer_esi > 0) && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-2 text-sm">Employer Contribution (for reference)</h4>
                  <div className="flex gap-6 text-sm">
                    {viewingPayslip.employer_pf > 0 && (
                      <div>
                        <span className="text-muted-foreground">Employer PF:</span>
                        <span className="ml-2 font-medium">{formatCurrency(viewingPayslip.employer_pf)}</span>
                      </div>
                    )}
                    {viewingPayslip.employer_esi > 0 && (
                      <div>
                        <span className="text-muted-foreground">Employer ESI:</span>
                        <span className="ml-2 font-medium">{formatCurrency(viewingPayslip.employer_esi)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="footer text-center text-xs text-muted-foreground mt-6 pt-4 border-t">
                <p>This is a computer-generated payslip and does not require a signature.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayslipsList;
