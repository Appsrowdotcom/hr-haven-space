import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Requirement {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  recurrence: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = ['general', 'legal', 'safety', 'financial', 'hr', 'environmental', 'data_privacy'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'in_progress', 'completed', 'overdue', 'not_applicable'];
const RECURRENCES = ['none', 'monthly', 'quarterly', 'annually'];

export function ComplianceRequirements() {
  const { company } = useCompany();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', category: 'all' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    recurrence: 'none',
    notes: '',
    assigned_to: '',
  });

  const canManage = hasPermission('compliance.manage');

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['compliance-requirements', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_requirements')
        .select('*')
        .eq('company_id', company!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Requirement[];
    },
    enabled: !!company?.id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', company!.id)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        company_id: company!.id,
        title: data.title,
        description: data.description || null,
        category: data.category,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || null,
        recurrence: data.recurrence,
        notes: data.notes || null,
        assigned_to: data.assigned_to || null,
        ...(editingReq ? {} : { created_by: user?.id }),
      };

      if (editingReq) {
        const { error } = await supabase
          .from('compliance_requirements')
          .update(payload)
          .eq('id', editingReq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('compliance_requirements')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      toast.success(editingReq ? 'Requirement updated' : 'Requirement created');
      resetForm();
    },
    onError: () => toast.error('Failed to save requirement'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      toast.success('Requirement deleted');
    },
    onError: () => toast.error('Failed to delete requirement'),
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('compliance_requirements')
        .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      toast.success('Marked as complete');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      status: 'pending',
      due_date: '',
      recurrence: 'none',
      notes: '',
      assigned_to: '',
    });
    setEditingReq(null);
    setIsOpen(false);
  };

  const openEdit = (req: Requirement) => {
    setEditingReq(req);
    setFormData({
      title: req.title,
      description: req.description || '',
      category: req.category,
      priority: req.priority,
      status: req.status,
      due_date: req.due_date || '',
      recurrence: req.recurrence,
      notes: req.notes || '',
      assigned_to: req.assigned_to || '',
    });
    setIsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      in_progress: { variant: 'default', icon: <Clock className="h-3 w-3 mr-1" /> },
      completed: { variant: 'outline', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      overdue: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
      not_applicable: { variant: 'secondary', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = variants[status] || variants.pending;
    return <Badge variant={variant} className="capitalize">{icon}{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[priority] || colors.medium}`}>{priority}</span>;
  };

  const filteredReqs = requirements.filter((r) => {
    if (filter.status !== 'all' && r.status !== filter.status) return false;
    if (filter.priority !== 'all' && r.priority !== filter.priority) return false;
    if (filter.category !== 'all' && r.category !== filter.category) return false;
    return true;
  });

  const stats = {
    total: requirements.length,
    completed: requirements.filter((r) => r.status === 'completed').length,
    pending: requirements.filter((r) => r.status === 'pending').length,
    overdue: requirements.filter((r) => r.status === 'overdue').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter.priority} onValueChange={(v) => setFilter({ ...filter, priority: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter.category} onValueChange={(v) => setFilter({ ...filter, category: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Requirement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingReq ? 'Edit Requirement' : 'Add Requirement'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Recurrence</Label>
                    <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECURRENCES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Select value={formData.assigned_to || "_none"} onValueChange={(v) => setFormData({ ...formData, assigned_to: v === "_none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredReqs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No requirements found</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReqs.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.title}</TableCell>
                  <TableCell className="capitalize">{req.category.replace('_', ' ')}</TableCell>
                  <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell>{req.due_date ? format(new Date(req.due_date), 'MMM dd, yyyy') : '-'}</TableCell>
                  <TableCell>{employees.find(e => e.id === req.assigned_to)?.full_name || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canManage && req.status !== 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => markCompleteMutation.mutate(req.id)} title="Mark Complete">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {canManage && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(req)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this requirement?')) deleteMutation.mutate(req.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
