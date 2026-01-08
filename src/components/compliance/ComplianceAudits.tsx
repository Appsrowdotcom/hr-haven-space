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
import { Plus, Pencil, Trash2, ClipboardList, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Audit {
  id: string;
  title: string;
  description: string | null;
  audit_type: string;
  status: string;
  scheduled_date: string;
  completed_date: string | null;
  auditor_name: string | null;
  auditor_organization: string | null;
  findings: string | null;
  recommendations: string | null;
  score: number | null;
  created_at: string;
}

const AUDIT_TYPES = ['internal', 'external', 'regulatory'];
const AUDIT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

export function ComplianceAudits() {
  const { company } = useCompany();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [viewAudit, setViewAudit] = useState<Audit | null>(null);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audit_type: 'internal',
    status: 'scheduled',
    scheduled_date: '',
    completed_date: '',
    auditor_name: '',
    auditor_organization: '',
    findings: '',
    recommendations: '',
    score: '',
  });

  const canManage = hasPermission('compliance.manage');

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['compliance-audits', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_audits')
        .select('*')
        .eq('company_id', company!.id)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data as Audit[];
    },
    enabled: !!company?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        company_id: company!.id,
        title: data.title,
        description: data.description || null,
        audit_type: data.audit_type,
        status: data.status,
        scheduled_date: data.scheduled_date,
        completed_date: data.completed_date || null,
        auditor_name: data.auditor_name || null,
        auditor_organization: data.auditor_organization || null,
        findings: data.findings || null,
        recommendations: data.recommendations || null,
        score: data.score ? parseInt(data.score) : null,
        ...(editingAudit ? {} : { created_by: user?.id }),
      };

      if (editingAudit) {
        const { error } = await supabase
          .from('compliance_audits')
          .update(payload)
          .eq('id', editingAudit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('compliance_audits')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-audits'] });
      toast.success(editingAudit ? 'Audit updated' : 'Audit created');
      resetForm();
    },
    onError: () => toast.error('Failed to save audit'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_audits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-audits'] });
      toast.success('Audit deleted');
    },
    onError: () => toast.error('Failed to delete audit'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      audit_type: 'internal',
      status: 'scheduled',
      scheduled_date: '',
      completed_date: '',
      auditor_name: '',
      auditor_organization: '',
      findings: '',
      recommendations: '',
      score: '',
    });
    setEditingAudit(null);
    setIsOpen(false);
  };

  const openEdit = (audit: Audit) => {
    setEditingAudit(audit);
    setFormData({
      title: audit.title,
      description: audit.description || '',
      audit_type: audit.audit_type,
      status: audit.status,
      scheduled_date: audit.scheduled_date,
      completed_date: audit.completed_date || '',
      auditor_name: audit.auditor_name || '',
      auditor_organization: audit.auditor_organization || '',
      findings: audit.findings || '',
      recommendations: audit.recommendations || '',
      score: audit.score?.toString() || '',
    });
    setIsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'secondary',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'} className="capitalize">{status.replace('_', ' ')}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      internal: 'bg-blue-100 text-blue-800',
      external: 'bg-purple-100 text-purple-800',
      regulatory: 'bg-amber-100 text-amber-800',
    };
    return <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[type] || colors.internal}`}>{type}</span>;
  };

  const filteredAudits = audits.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: audits.length,
    scheduled: audits.filter((a) => a.status === 'scheduled').length,
    inProgress: audits.filter((a) => a.status === 'in_progress').length,
    completed: audits.filter((a) => a.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
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
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {AUDIT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Schedule Audit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAudit ? 'Edit Audit' : 'Schedule Audit'}</DialogTitle>
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
                    <Label>Audit Type</Label>
                    <Select value={formData.audit_type} onValueChange={(v) => setFormData({ ...formData, audit_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AUDIT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AUDIT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled Date *</Label>
                    <Input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Completed Date</Label>
                    <Input type="date" value={formData.completed_date} onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Auditor Name</Label>
                    <Input value={formData.auditor_name} onChange={(e) => setFormData({ ...formData, auditor_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Auditor Organization</Label>
                    <Input value={formData.auditor_organization} onChange={(e) => setFormData({ ...formData, auditor_organization: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Score (0-100)</Label>
                  <Input type="number" min="0" max="100" value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} />
                </div>
                <div>
                  <Label>Findings</Label>
                  <Textarea value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Recommendations</Label>
                  <Textarea value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })} rows={3} />
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
      ) : filteredAudits.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No audits found</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{audit.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(audit.audit_type)}</TableCell>
                  <TableCell>{getStatusBadge(audit.status)}</TableCell>
                  <TableCell>{format(new Date(audit.scheduled_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{audit.auditor_name || '-'}</TableCell>
                  <TableCell>{audit.score !== null ? `${audit.score}%` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewAudit(audit)}><Eye className="h-4 w-4" /></Button>
                      {canManage && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(audit)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this audit?')) deleteMutation.mutate(audit.id); }}>
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

      {/* View Audit Dialog */}
      <Dialog open={!!viewAudit} onOpenChange={() => setViewAudit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewAudit?.title}</DialogTitle>
          </DialogHeader>
          {viewAudit && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {getTypeBadge(viewAudit.audit_type)}
                {getStatusBadge(viewAudit.status)}
              </div>
              {viewAudit.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{viewAudit.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Scheduled Date</p>
                  <p>{format(new Date(viewAudit.scheduled_date), 'MMM dd, yyyy')}</p>
                </div>
                {viewAudit.completed_date && (
                  <div>
                    <p className="font-medium text-muted-foreground">Completed Date</p>
                    <p>{format(new Date(viewAudit.completed_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {viewAudit.auditor_name && (
                  <div>
                    <p className="font-medium text-muted-foreground">Auditor</p>
                    <p>{viewAudit.auditor_name}</p>
                  </div>
                )}
                {viewAudit.auditor_organization && (
                  <div>
                    <p className="font-medium text-muted-foreground">Organization</p>
                    <p>{viewAudit.auditor_organization}</p>
                  </div>
                )}
                {viewAudit.score !== null && (
                  <div>
                    <p className="font-medium text-muted-foreground">Score</p>
                    <p className="text-lg font-bold">{viewAudit.score}%</p>
                  </div>
                )}
              </div>
              {viewAudit.findings && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Findings</p>
                  <p className="text-sm whitespace-pre-wrap">{viewAudit.findings}</p>
                </div>
              )}
              {viewAudit.recommendations && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recommendations</p>
                  <p className="text-sm whitespace-pre-wrap">{viewAudit.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
