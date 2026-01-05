import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Loader2, Plus, Edit2, Search, IndianRupee } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingSalary, setEditingSalary] = useState<Partial<EmployeeSalary> | null>(null);
  const [componentValues, setComponentValues] = useState<SalaryComponentValue[]>([]);

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

  const handleEdit = async (salary: EmployeeSalary) => {
    setEditingSalary(salary);
    await fetchSalaryComponents(salary.id);
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
    
    // Initialize with default component values
    const earningComponents = components.filter(c => c.type === 'earning' && !c.is_system);
    setComponentValues(earningComponents.map(c => ({ component_id: c.id, amount: 0 })));
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

      if (salaryId) {
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

      toast.success('Salary saved successfully');
      setDialogOpen(false);
      setEditingSalary(null);
      setComponentValues([]);
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
                  {canManage && <TableHead className="w-[80px]">Actions</TableHead>}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(salary)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSalary?.id ? 'Edit' : 'Add'} Employee Salary
            </DialogTitle>
            <DialogDescription>
              Configure salary structure and bank details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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

            <div>
              <h4 className="font-medium mb-3">Salary Components</h4>
              <div className="grid gap-3">
                {earningComponents.map((comp) => {
                  const value = componentValues.find(cv => cv.component_id === comp.id)?.amount || 0;
                  return (
                    <div key={comp.id} className="flex items-center gap-4">
                      <Label className="w-40">{comp.name}</Label>
                      <Input
                        type="number"
                        value={value || ''}
                        onChange={(e) => handleComponentChange(comp.id, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1"
                      />
                      {comp.calculation_type === 'percentage' && (
                        <span className="text-sm text-muted-foreground w-24">
                          {comp.percentage_value}% of {comp.percentage_of}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Bank Details</h4>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={editingSalary?.bank_name || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={editingSalary?.bank_account_number || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={editingSalary?.ifsc_code || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, ifsc_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input
                    value={editingSalary?.pan_number || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, pan_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Statutory Details</h4>
              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-2">
                  <Label>PF Number</Label>
                  <Input
                    value={editingSalary?.pf_number || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, pf_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UAN Number</Label>
                  <Input
                    value={editingSalary?.uan_number || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, uan_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ESI Number</Label>
                  <Input
                    value={editingSalary?.esi_number || ''}
                    onChange={(e) => setEditingSalary({ ...editingSalary, esi_number: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeSalaries;
