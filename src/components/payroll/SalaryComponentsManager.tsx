import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2, Plus, Trash2, Edit2, ArrowUp, ArrowDown } from 'lucide-react';

interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  calculation_type: 'fixed' | 'percentage' | 'formula';
  percentage_of: string | null;
  percentage_value: number | null;
  is_taxable: boolean;
  is_pf_applicable: boolean;
  is_esi_applicable: boolean;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

const SalaryComponentsManager: React.FC = () => {
  const { company } = useCompany();
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Partial<SalaryComponent> | null>(null);

  const defaultComponent: Partial<SalaryComponent> = {
    name: '',
    code: '',
    type: 'earning',
    calculation_type: 'fixed',
    percentage_of: null,
    percentage_value: null,
    is_taxable: true,
    is_pf_applicable: false,
    is_esi_applicable: false,
    is_system: false,
    is_active: true,
    sort_order: 0,
  };

  useEffect(() => {
    if (company?.id) {
      fetchComponents();
    }
  }, [company?.id]);

  const fetchComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('company_id', company!.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setComponents((data || []) as SalaryComponent[]);
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultComponents = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const defaultComponents = [
        { name: 'Basic Salary', code: 'BASIC', type: 'earning', calculation_type: 'fixed', is_taxable: true, is_pf_applicable: true, is_esi_applicable: true, is_system: true, sort_order: 1 },
        { name: 'House Rent Allowance', code: 'HRA', type: 'earning', calculation_type: 'percentage', percentage_of: 'BASIC', percentage_value: 40, is_taxable: true, is_pf_applicable: false, is_esi_applicable: true, is_system: false, sort_order: 2 },
        { name: 'Conveyance Allowance', code: 'CONV', type: 'earning', calculation_type: 'fixed', is_taxable: true, is_pf_applicable: false, is_esi_applicable: true, is_system: false, sort_order: 3 },
        { name: 'Special Allowance', code: 'SPECIAL', type: 'earning', calculation_type: 'fixed', is_taxable: true, is_pf_applicable: false, is_esi_applicable: true, is_system: false, sort_order: 4 },
        { name: 'Medical Allowance', code: 'MEDICAL', type: 'earning', calculation_type: 'fixed', is_taxable: false, is_pf_applicable: false, is_esi_applicable: true, is_system: false, sort_order: 5 },
        { name: 'Provident Fund', code: 'PF', type: 'deduction', calculation_type: 'percentage', percentage_of: 'BASIC', percentage_value: 12, is_taxable: false, is_pf_applicable: false, is_esi_applicable: false, is_system: true, sort_order: 100 },
        { name: 'ESI', code: 'ESI', type: 'deduction', calculation_type: 'percentage', percentage_of: 'GROSS', percentage_value: 0.75, is_taxable: false, is_pf_applicable: false, is_esi_applicable: false, is_system: true, sort_order: 101 },
        { name: 'Professional Tax', code: 'PT', type: 'deduction', calculation_type: 'fixed', is_taxable: false, is_pf_applicable: false, is_esi_applicable: false, is_system: true, sort_order: 102 },
        { name: 'TDS', code: 'TDS', type: 'deduction', calculation_type: 'fixed', is_taxable: false, is_pf_applicable: false, is_esi_applicable: false, is_system: true, sort_order: 103 },
      ];

      const { error } = await supabase
        .from('salary_components')
        .insert(defaultComponents.map(c => ({ ...c, company_id: company.id, is_active: true })));

      if (error) throw error;
      toast.success('Default salary components created');
      fetchComponents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create default components');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!company?.id || !editingComponent) return;
    if (!editingComponent.name || !editingComponent.code) {
      toast.error('Name and code are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: company.id,
        name: editingComponent.name,
        code: editingComponent.code.toUpperCase(),
        type: editingComponent.type,
        calculation_type: editingComponent.calculation_type,
        percentage_of: editingComponent.calculation_type === 'percentage' ? editingComponent.percentage_of : null,
        percentage_value: editingComponent.calculation_type === 'percentage' ? editingComponent.percentage_value : null,
        is_taxable: editingComponent.is_taxable ?? true,
        is_pf_applicable: editingComponent.is_pf_applicable ?? false,
        is_esi_applicable: editingComponent.is_esi_applicable ?? false,
        is_system: editingComponent.is_system ?? false,
        is_active: editingComponent.is_active ?? true,
        sort_order: editingComponent.sort_order ?? components.length + 1,
      };

      if (editingComponent.id) {
        const { error } = await supabase
          .from('salary_components')
          .update(payload)
          .eq('id', editingComponent.id);
        if (error) throw error;
        toast.success('Component updated successfully');
      } else {
        const { error } = await supabase
          .from('salary_components')
          .insert(payload);
        if (error) throw error;
        toast.success('Component created successfully');
      }

      setDialogOpen(false);
      setEditingComponent(null);
      fetchComponents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save component');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this component?')) return;
    try {
      const { error } = await supabase
        .from('salary_components')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Component deleted');
      fetchComponents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete component');
    }
  };

  const earningComponents = components.filter(c => c.type === 'earning');
  const deductionComponents = components.filter(c => c.type === 'deduction');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salary Components</CardTitle>
          <CardDescription>
            No salary components configured. Set up default components to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-muted-foreground text-center">
            Initialize with standard Indian payroll components (Basic, HRA, PF, ESI, etc.)
          </p>
          <div className="flex gap-2">
            <Button onClick={initializeDefaultComponents} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Initialize Default Components
            </Button>
            <Button variant="outline" onClick={() => {
              setEditingComponent({ ...defaultComponent });
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Custom
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Salary Components</h3>
          <p className="text-sm text-muted-foreground">Configure earnings and deductions</p>
        </div>
        <Button onClick={() => {
          setEditingComponent({ ...defaultComponent, sort_order: components.length + 1 });
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earningComponents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name}
                      {c.is_system && <Badge variant="secondary" className="ml-2 text-xs">System</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell>
                      {c.calculation_type === 'percentage' 
                        ? `${c.percentage_value}% of ${c.percentage_of}` 
                        : 'Fixed'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingComponent(c);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!c.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductionComponents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name}
                      {c.is_system && <Badge variant="secondary" className="ml-2 text-xs">System</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell>
                      {c.calculation_type === 'percentage' 
                        ? `${c.percentage_value}% of ${c.percentage_of}` 
                        : 'Fixed'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingComponent(c);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!c.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingComponent?.id ? 'Edit' : 'Add'} Salary Component</DialogTitle>
            <DialogDescription>
              Configure the salary component details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editingComponent?.name || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, name: e.target.value })}
                  placeholder="e.g., Basic Salary"
                />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={editingComponent?.code || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., BASIC"
                  className="uppercase"
                  disabled={editingComponent?.is_system}
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editingComponent?.type || 'earning'}
                  onValueChange={(v) => setEditingComponent({ ...editingComponent, type: v as 'earning' | 'deduction' })}
                  disabled={editingComponent?.is_system}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Earning</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calculation</Label>
                <Select
                  value={editingComponent?.calculation_type || 'fixed'}
                  onValueChange={(v) => setEditingComponent({ ...editingComponent, calculation_type: v as 'fixed' | 'percentage' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingComponent?.calculation_type === 'percentage' && (
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>% of</Label>
                  <Select
                    value={editingComponent?.percentage_of || 'BASIC'}
                    onValueChange={(v) => setEditingComponent({ ...editingComponent, percentage_of: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASIC">Basic</SelectItem>
                      <SelectItem value="GROSS">Gross</SelectItem>
                      {earningComponents.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingComponent?.percentage_value || ''}
                    onChange={(e) => setEditingComponent({ ...editingComponent, percentage_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Taxable</Label>
                <Switch
                  checked={editingComponent?.is_taxable ?? true}
                  onCheckedChange={(v) => setEditingComponent({ ...editingComponent, is_taxable: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>PF Applicable</Label>
                <Switch
                  checked={editingComponent?.is_pf_applicable ?? false}
                  onCheckedChange={(v) => setEditingComponent({ ...editingComponent, is_pf_applicable: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>ESI Applicable</Label>
                <Switch
                  checked={editingComponent?.is_esi_applicable ?? false}
                  onCheckedChange={(v) => setEditingComponent({ ...editingComponent, is_esi_applicable: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editingComponent?.is_active ?? true}
                  onCheckedChange={(v) => setEditingComponent({ ...editingComponent, is_active: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryComponentsManager;
