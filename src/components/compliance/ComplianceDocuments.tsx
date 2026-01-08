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
import { Plus, Pencil, Trash2, FileText, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string | null;
  file_name: string | null;
  version: string | null;
  is_active: boolean;
  effective_date: string | null;
  expiry_date: string | null;
  requirement_id: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
  compliance_requirements?: { title: string } | null;
}

const DOCUMENT_TYPES = ['policy', 'procedure', 'guideline', 'certificate', 'license', 'report', 'form', 'other'];

export function ComplianceDocuments() {
  const { company } = useCompany();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'policy',
    file_url: '',
    file_name: '',
    version: '1.0',
    effective_date: '',
    expiry_date: '',
    requirement_id: '',
    is_active: true,
  });

  const canManage = hasPermission('compliance.manage');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['compliance-documents', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_documents')
        .select('*, profiles:uploaded_by(full_name), compliance_requirements(title)')
        .eq('company_id', company!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!company?.id,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['compliance-requirements-list', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_requirements')
        .select('id, title')
        .eq('company_id', company!.id);
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
        document_type: data.document_type,
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        version: data.version || '1.0',
        effective_date: data.effective_date || null,
        expiry_date: data.expiry_date || null,
        requirement_id: data.requirement_id || null,
        is_active: data.is_active,
        ...(editingDoc ? {} : { uploaded_by: user?.id }),
      };

      if (editingDoc) {
        const { error } = await supabase
          .from('compliance_documents')
          .update(payload)
          .eq('id', editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('compliance_documents')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      toast.success(editingDoc ? 'Document updated' : 'Document created');
      resetForm();
    },
    onError: () => toast.error('Failed to save document'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      document_type: 'policy',
      file_url: '',
      file_name: '',
      version: '1.0',
      effective_date: '',
      expiry_date: '',
      requirement_id: '',
      is_active: true,
    });
    setEditingDoc(null);
    setIsOpen(false);
  };

  const openEdit = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      description: doc.description || '',
      document_type: doc.document_type,
      file_url: doc.file_url || '',
      file_name: doc.file_name || '',
      version: doc.version || '1.0',
      effective_date: doc.effective_date || '',
      expiry_date: doc.expiry_date || '',
      requirement_id: doc.requirement_id || '',
      is_active: doc.is_active,
    });
    setIsOpen(true);
  };

  const filteredDocs = documents.filter((d) => {
    if (typeFilter !== 'all' && d.document_type !== typeFilter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Document</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDoc ? 'Edit Document' : 'Add Document'}</DialogTitle>
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
                    <Label>Document Type</Label>
                    <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Version</Label>
                    <Input value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>File URL</Label>
                  <Input value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>File Name</Label>
                  <Input value={formData.file_name} onChange={(e) => setFormData({ ...formData, file_name: e.target.value })} placeholder="document.pdf" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Effective Date</Label>
                    <Input type="date" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Linked Requirement</Label>
                  <Select value={formData.requirement_id || "_none"} onValueChange={(v) => setFormData({ ...formData, requirement_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select requirement" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {requirements.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_active">Active</Label>
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
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No documents found</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        {doc.compliance_requirements && (
                          <p className="text-xs text-muted-foreground">Linked: {doc.compliance_requirements.title}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{doc.document_type}</TableCell>
                  <TableCell>{doc.version || '-'}</TableCell>
                  <TableCell>
                    {!doc.is_active ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : isExpired(doc.expiry_date) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>{doc.effective_date ? format(new Date(doc.effective_date), 'MMM dd, yyyy') : '-'}</TableCell>
                  <TableCell>{doc.expiry_date ? format(new Date(doc.expiry_date), 'MMM dd, yyyy') : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.file_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {canManage && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(doc)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(doc.id); }}>
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
