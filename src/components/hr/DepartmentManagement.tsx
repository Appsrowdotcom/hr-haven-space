import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, Building2, Users, Pencil, Trash2, ChevronRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Department = Tables<'departments'>;

interface DepartmentWithDetails extends Department {
  head?: { full_name: string } | null;
  parent?: { name: string }[] | null;
  employee_count?: number;
}

const DepartmentManagement: React.FC = () => {
  const { company, refreshCompany } = useCompany();
  const { isCompanyAdmin, hasRole, hasPermission } = usePermissions();
  const canManage = isCompanyAdmin() || hasRole('HR') || hasPermission('hr.manage_department');
  
  const [departments, setDepartments] = useState<DepartmentWithDetails[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithDetails | null>(null);
  const [deletingDept, setDeletingDept] = useState<DepartmentWithDetails | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    head_id: '',
    parent_id: '',
  });

  const fetchDepartments = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      // Get departments with head info
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select(`
          *,
          head:profiles!departments_head_id_fkey(full_name)
        `)
        .eq('company_id', company.id)
        .order('name');

      if (deptError) throw deptError;

      // Get employee counts per department
      const { data: countData, error: countError } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('company_id', company.id)
        .eq('status', 'active');

      if (countError) throw countError;

      // Calculate counts
      const counts: Record<string, number> = {};
      countData?.forEach(p => {
        if (p.department_id) {
          counts[p.department_id] = (counts[p.department_id] || 0) + 1;
        }
      });

      const deptsWithCounts = (deptData || []).map(d => {
        // Find parent department name manually
        const parentDept = deptData?.find(pd => pd.id === d.parent_id);
        return {
          ...d,
          employee_count: counts[d.id] || 0,
          parent: parentDept ? [{ name: parentDept.name }] : null,
        };
      });

      setDepartments(deptsWithCounts as DepartmentWithDetails[]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch departments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!company?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', company.id)
      .eq('status', 'active')
      .order('full_name');
    
    if (!error) setEmployees(data || []);
  };

  useEffect(() => {
    if (company?.id) {
      fetchDepartments();
      fetchEmployees();
    }
  }, [company?.id]);

  const openCreateDialog = () => {
    setEditingDept(null);
    setForm({ name: '', description: '', head_id: '', parent_id: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (dept: DepartmentWithDetails) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      head_id: dept.head_id || '',
      parent_id: dept.parent_id || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (dept: DepartmentWithDetails) => {
    setDeletingDept(dept);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!company?.id || !form.name.trim()) return;
    setSaving(true);
    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            head_id: form.head_id || null,
            parent_id: form.parent_id || null,
          })
          .eq('id', editingDept.id);
        if (error) throw error;
        toast.success('Department updated');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            company_id: company.id,
            name: form.name.trim(),
            description: form.description.trim() || null,
            head_id: form.head_id || null,
            parent_id: form.parent_id || null,
          });
        if (error) throw error;
        toast.success('Department created');
      }
      setDialogOpen(false);
      fetchDepartments();
      refreshCompany();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setSaving(true);
    try {
      // Check if department has employees
      if (deletingDept.employee_count && deletingDept.employee_count > 0) {
        toast.error('Cannot delete department with employees. Reassign them first.');
        return;
      }

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deletingDept.id);

      if (error) throw error;
      toast.success('Department deleted');
      setDeleteDialogOpen(false);
      setDeletingDept(null);
      fetchDepartments();
      refreshCompany();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete department');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Departments</h2>
          <p className="text-sm text-muted-foreground">Manage company departments and structure</p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      {departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No departments created yet</p>
            {canManage && (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Department
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Employees</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">{dept.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dept.head?.full_name || <span className="text-muted-foreground">Not assigned</span>}
                    </TableCell>
                    <TableCell>
                      {dept.parent && dept.parent.length > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <ChevronRight className="h-3 w-3" />
                          {dept.parent[0].name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Root</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.employee_count || 0}</span>
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(dept)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openDeleteDialog(dept)}
                            disabled={(dept.employee_count || 0) > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Engineering, Sales, HR"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the department"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select value={form.head_id || "none"} onValueChange={(v) => setForm({ ...form, head_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Head</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Department</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Level)</SelectItem>
                  {departments
                    .filter(d => d.id !== editingDept?.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDept ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDept?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
