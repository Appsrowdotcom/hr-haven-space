import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, Pencil, Trash2, Calendar } from 'lucide-react';

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  days_per_year: number;
  is_paid: boolean;
  is_carry_forward: boolean;
  max_carry_forward_days: number | null;
  is_active: boolean;
}

const LeaveTypeConfig: React.FC = () => {
  const { company } = useCompany();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    days_per_year: 12,
    is_paid: true,
    is_carry_forward: false,
    max_carry_forward_days: 0,
    is_active: true,
  });

  const fetchLeaveTypes = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', company.id)
      .order('name');

    if (error) {
      console.error('Error fetching leave types:', error);
    } else {
      setLeaveTypes(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, [company?.id]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      days_per_year: 12,
      is_paid: true,
      is_carry_forward: false,
      max_carry_forward_days: 0,
      is_active: true,
    });
    setEditingType(null);
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setForm({
      name: leaveType.name,
      description: leaveType.description || '',
      days_per_year: leaveType.days_per_year,
      is_paid: leaveType.is_paid,
      is_carry_forward: leaveType.is_carry_forward,
      max_carry_forward_days: leaveType.max_carry_forward_days || 0,
      is_active: leaveType.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!company?.id || !form.name.trim()) return;

    setSaving(true);
    try {
      if (editingType) {
        const { error } = await supabase
          .from('leave_types')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            days_per_year: form.days_per_year,
            is_paid: form.is_paid,
            is_carry_forward: form.is_carry_forward,
            max_carry_forward_days: form.is_carry_forward ? form.max_carry_forward_days : null,
            is_active: form.is_active,
          })
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Leave type updated');
      } else {
        const { error } = await supabase
          .from('leave_types')
          .insert({
            company_id: company.id,
            name: form.name.trim(),
            description: form.description.trim() || null,
            days_per_year: form.days_per_year,
            is_paid: form.is_paid,
            is_carry_forward: form.is_carry_forward,
            max_carry_forward_days: form.is_carry_forward ? form.max_carry_forward_days : null,
            is_active: form.is_active,
          });

        if (error) throw error;
        toast.success('Leave type created');
      }

      setDialogOpen(false);
      resetForm();
      fetchLeaveTypes();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;

    try {
      const { error } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Leave type deleted');
      fetchLeaveTypes();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete leave type');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Leave Types</CardTitle>
          <CardDescription>Configure leave types available to employees</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Annual Leave, Sick Leave"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this leave type"
                />
              </div>
              <div className="space-y-2">
                <Label>Days Per Year</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.days_per_year}
                  onChange={(e) => setForm({ ...form, days_per_year: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Paid Leave</Label>
                <Switch
                  checked={form.is_paid}
                  onCheckedChange={(v) => setForm({ ...form, is_paid: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Carry Forward</Label>
                <Switch
                  checked={form.is_carry_forward}
                  onCheckedChange={(v) => setForm({ ...form, is_carry_forward: v })}
                />
              </div>
              {form.is_carry_forward && (
                <div className="space-y-2">
                  <Label>Max Carry Forward Days</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.max_carry_forward_days}
                    onChange={(e) => setForm({ ...form, max_carry_forward_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingType ? 'Update' : 'Create'} Leave Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {leaveTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leave types configured</p>
            <p className="text-sm">Create leave types for employees to apply</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Days/Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Carry Forward</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      {type.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{type.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{type.days_per_year}</TableCell>
                  <TableCell>
                    <Badge variant={type.is_paid ? 'default' : 'secondary'}>
                      {type.is_paid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {type.is_carry_forward ? (
                      <span className="text-sm">Up to {type.max_carry_forward_days} days</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.is_active ? 'default' : 'outline'}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveTypeConfig;
