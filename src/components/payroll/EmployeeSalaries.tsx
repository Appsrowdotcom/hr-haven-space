import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Loader2, Plus, Edit2, Search, IndianRupee, History, Eye, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  department_name: string | null;
  designation: string | null;
}

interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  calculation_type: string;
  percentage_of: string | null;
  percentage_value: number | null;
  is_system: boolean;
}

interface EmployeeSalary {
  id: string;
  profile_id: string;
  effective_from: string;
  effective_to: string | null;
  gross_salary: number;
  ctc: number;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  pan_number: string | null;
  pf_number: string | null;
  esi_number: string | null;
  uan_number: string | null;
  is_active: boolean;
  employee_name?: string;
  employee_email?: string;
  department_name?: string;
  designation?: string;
}

interface SalaryComponentValue {
  component_id: string;
  amount: number;
}

interface SalaryHistory {
  id: string;
  effective_from: string;
  effective_to: string | null;
  gross_salary: number;
  ctc: number;
  is_active: boolean;
}

const EmployeeSalaries: React.FC = () => {
  const { company } = useCompany();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('finance.manage_payroll');
  
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingSalary, setEditingSalary] = useState<Partial<EmployeeSalary> | null>(null);
  const [componentValues, setComponentValues] = useState<SalaryComponentValue[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [dialogTab, setDialogTab] = useState('salary');
  const [isRevision, setIsRevision] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company?.id]);

  const fetchData = async () => {
    try {
      const [salariesRes, employeesRes, componentsRes] = await Promise.all([
        supabase
          .from('employee_salary_details')
          .select('*')
          .eq('company_id', company!.id)
          .eq('is_active', true),
        supabase
          .from('employee_directory')
          .select('id, full_name, email, department_name, designation')
          .eq('company_id', company!.id)
          .eq('status', 'active'),
        supabase
          .from('salary_components')
          .select('*')
          .eq('company_id', company!.id)
          .eq('is_active', true)
          .order('sort_order'),
      ]);

      if (salariesRes.error) throw salariesRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (componentsRes.error) throw componentsRes.error;

      setSalaries(salariesRes.data || []);
      setEmployees(employeesRes.data || []);
      setComponents((componentsRes.data || []) as SalaryComponent[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryComponents = async (salaryId: string) => {
    const { data, error } = await supabase
      .from('employee_salary_components')
      .select('component_id, amount')
      .eq('employee_salary_id', salaryId);
    
    if (!error && data) {
      setComponentValues(data);
    }
  };

  const fetchSalaryHistory = async (profileId: string) => {
    const { data, error } = await supabase
      .from('employee_salaries')
      .select('id, effective_from, effective_to, gross_salary, ctc, is_active')
      .eq('profile_id', profileId)
      .order('effective_from', { ascending: false });
    
    if (!error && data) {
      setSalaryHistory(data);
    }
  };

  const handleViewHistory = async (salary: EmployeeSalary) => {
    const emp = employees.find(e => e.id === salary.profile_id);
    setSelectedEmployee(emp || null);
    await fetchSalaryHistory(salary.profile_id);
    setHistoryDialogOpen(true);
  };

  const handleEdit = async (salary: EmployeeSalary) => {
    setEditingSalary(salary);
    setIsRevision(false);
    await fetchSalaryComponents(salary.id);
    setDialogTab('salary');
    setDialogOpen(true);
  };

  const handleRevision = async (salary: EmployeeSalary) => {
    // Create revision - copy current salary but with new effective date
    setEditingSalary({
      profile_id: salary.profile_id,
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      gross_salary: salary.gross_salary,
      ctc: salary.ctc,
      bank_name: salary.bank_name,
      bank_account_number: salary.bank_account_number,
      ifsc_code: salary.ifsc_code,
      pan_number: salary.pan_number,
      pf_number: salary.pf_number,
      esi_number: salary.esi_number,
      uan_number: salary.uan_number,
      is_active: true,
    });
    setIsRevision(true);
    await fetchSalaryComponents(salary.id);
    setDialogTab('salary');
    setDialogOpen(true);
  };

  const handleAddNew = (employee: Employee) => {
    setEditingSalary({
      profile_id: employee.id,
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      gross_salary: 0,
      ctc: 0,
      is_active: true,
    });
    setIsRevision(false);
    
    // Initialize with default component values
    const earningComponents = components.filter(c => c.type === 'earning' && !c.is_system);
    setComponentValues(earningComponents.map(c => ({ component_id: c.id, amount: 0 })));
    setDialogTab('salary');
    setDialogOpen(true);
  };

  const calculateGross = () => {
    const earnings = componentValues.reduce((sum, cv) => {
      const comp = components.find(c => c.id === cv.component_id);
      if (comp?.type === 'earning') {
        return sum + cv.amount;
      }
      return sum;
    }, 0);
    return earnings;
  };

  const handleComponentChange = (componentId: string, amount: number) => {
    setComponentValues(prev => {
      const existing = prev.find(cv => cv.component_id === componentId);
      if (existing) {
        return prev.map(cv => cv.component_id === componentId ? { ...cv, amount } : cv);
      }
      return [...prev, { component_id: componentId, amount }];
    });
  };

  const handleSave = async () => {
    if (!editingSalary?.profile_id) return;
    setSaving(true);
    
    try {
      const grossSalary = calculateGross();
      const ctc = grossSalary * 1.15; // Approximate CTC with employer contributions
      
      // If this is a revision, deactivate the old salary first
      if (isRevision) {
        const existingSalary = salaries.find(s => s.profile_id === editingSalary.profile_id);
        if (existingSalary) {
          await supabase
            .from('employee_salaries')
            .update({
              is_active: false,
              effective_to: editingSalary.effective_from,
            })
            .eq('id', existingSalary.id);
        }
      }
      
      const salaryPayload = {
        profile_id: editingSalary.profile_id,
        effective_from: editingSalary.effective_from,
        gross_salary: grossSalary,
        ctc,
        bank_name: editingSalary.bank_name,
        bank_account_number: editingSalary.bank_account_number,
        ifsc_code: editingSalary.ifsc_code,
        pan_number: editingSalary.pan_number,
        pf_number: editingSalary.pf_number,
        esi_number: editingSalary.esi_number,
        uan_number: editingSalary.uan_number,
        is_active: true,
      };

      let salaryId = editingSalary.id;

      if (salaryId && !isRevision) {
        const { error } = await supabase
          .from('employee_salaries')
          .update(salaryPayload)
          .eq('id', salaryId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('employee_salaries')
          .insert(salaryPayload)
          .select()
          .single();
        if (error) throw error;
        salaryId = data.id;
      }

      // Save component values
      if (salaryId) {
        // Delete existing
        await supabase
          .from('employee_salary_components')
          .delete()
          .eq('employee_salary_id', salaryId);
        
        // Insert new
        const componentsToInsert = componentValues
          .filter(cv => cv.amount > 0)
          .map(cv => ({
            employee_salary_id: salaryId,
            component_id: cv.component_id,
            amount: cv.amount,
          }));
        
        if (componentsToInsert.length > 0) {
          const { error } = await supabase
            .from('employee_salary_components')
            .insert(componentsToInsert);
          if (error) throw error;
        }
      }

      toast.success(isRevision ? 'Salary revision saved successfully' : 'Salary saved successfully');
      setDialogOpen(false);
      setEditingSalary(null);
      setComponentValues([]);
      setIsRevision(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save salary');
    } finally {
      setSaving(false);
    }
  };

  const employeesWithoutSalary = employees.filter(
    emp => !salaries.some(s => s.profile_id === emp.id)
  );

  const filteredSalaries = salaries.filter(s =>
    s.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employee_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const earningComponents = components.filter(c => c.type === 'earning' && !c.is_system);
  const selectedEmployeeForDialog = editingSalary?.profile_id 
    ? employees.find(e => e.id === editingSalary.profile_id) 
    : null;

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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {canManage && employeesWithoutSalary.length > 0 && (
          <Select onValueChange={(id) => {
            const emp = employeesWithoutSalary.find(e => e.id === id);
            if (emp) handleAddNew(emp);
          }}>
            <SelectTrigger className="w-[200px]">
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Salary</span>
            </SelectTrigger>
            <SelectContent>
              {employeesWithoutSalary.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {employeesWithoutSalary.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {employeesWithoutSalary.length} employee(s) don't have salary configured
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Salaries</CardTitle>
          <CardDescription>
            {salaries.length} employees with salary configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSalaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No salary records found. Add employee salaries to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-right">Gross Salary</TableHead>
                  <TableHead className="text-right">CTC</TableHead>
                  <TableHead>Effective From</TableHead>
                  {canManage && <TableHead className="w-[150px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{salary.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{salary.employee_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{salary.department_name || '-'}</TableCell>
                    <TableCell>{salary.designation || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(salary.gross_salary)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(salary.ctc)}
                    </TableCell>
                    <TableCell>{format(new Date(salary.effective_from), 'dd MMM yyyy')}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(salary)}
                            title="Edit Salary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevision(salary)}
                            title="Salary Revision"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewHistory(salary)}
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
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

      {/* Salary Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isRevision ? 'Salary Revision' : editingSalary?.id ? 'Edit' : 'Add'} Employee Salary
              {selectedEmployeeForDialog && (
                <span className="font-normal text-muted-foreground ml-2">
                  - {selectedEmployeeForDialog.full_name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {isRevision 
                ? 'Create a new salary revision. Previous salary will be marked as inactive.'
                : 'Configure salary structure, bank details, and statutory information'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="salary">Salary Components</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="statutory">Statutory</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-4">
              <TabsContent value="salary" className="space-y-4 mt-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Effective From</Label>
                    <Input
                      type="date"
                      value={editingSalary?.effective_from || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, effective_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Calculated Gross</Label>
                    <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                      <IndianRupee className="h-4 w-4 mr-1" />
                      <span className="font-medium">{formatCurrency(calculateGross())}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Salary Components</h4>
                  {earningComponents.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground border rounded-lg">
                      No salary components configured. Please set up salary components in Settings first.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {earningComponents.map((comp) => {
                        const value = componentValues.find(cv => cv.component_id === comp.id)?.amount || 0;
                        return (
                          <div key={comp.id} className="flex items-center gap-4">
                            <Label className="w-40 flex-shrink-0">{comp.name}</Label>
                            <div className="relative flex-1">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                value={value || ''}
                                onChange={(e) => handleComponentChange(comp.id, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="pl-10"
                              />
                            </div>
                            {comp.calculation_type === 'percentage' && (
                              <span className="text-sm text-muted-foreground w-32 flex-shrink-0">
                                {comp.percentage_value}% of {comp.percentage_of}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 mt-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={editingSalary?.bank_name || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, bank_name: e.target.value })}
                      placeholder="e.g., State Bank of India"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={editingSalary?.bank_account_number || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, bank_account_number: e.target.value })}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={editingSalary?.ifsc_code || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, ifsc_code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SBIN0001234"
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input
                      value={editingSalary?.pan_number || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, pan_number: e.target.value.toUpperCase() })}
                      placeholder="e.g., ABCDE1234F"
                      className="uppercase"
                      maxLength={10}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="statutory" className="space-y-4 mt-4">
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-2">
                    <Label>PF Number</Label>
                    <Input
                      value={editingSalary?.pf_number || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, pf_number: e.target.value })}
                      placeholder="PF account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UAN Number</Label>
                    <Input
                      value={editingSalary?.uan_number || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, uan_number: e.target.value })}
                      placeholder="Universal Account Number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ESI Number</Label>
                    <Input
                      value={editingSalary?.esi_number || ''}
                      onChange={(e) => setEditingSalary({ ...editingSalary, esi_number: e.target.value })}
                      placeholder="ESI number"
                    />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isRevision ? 'Create Revision' : 'Save Salary'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Salary History</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.full_name} - Revision history
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {salaryHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No salary history found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-right">CTC</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>{format(new Date(history.effective_from), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        {history.effective_to 
                          ? format(new Date(history.effective_to), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(history.gross_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(history.ctc)}</TableCell>
                      <TableCell>
                        <Badge variant={history.is_active ? 'default' : 'secondary'}>
                          {history.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeSalaries;
