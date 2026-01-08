import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Banknote, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RevenueEntryForm } from './RevenueEntryForm';
import { CollectionForm } from './CollectionForm';

interface RevenueEntry {
  id: string;
  category_id: string;
  profile_id: string;
  description: string;
  amount: number;
  currency: string;
  revenue_date: string;
  client_name: string | null;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  revenue_categories: { name: string; code: string };
  profiles: { full_name: string };
  collected_amount?: number;
}

interface RevenueListProps {
  viewMode?: 'all' | 'own';
}

export const RevenueList: React.FC<RevenueListProps> = ({ viewMode = 'all' }) => {
  const { profile } = useAuth();
  const { hasPermission, isCompanyAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [collectionFormOpen, setCollectionFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RevenueEntry | null>(null);
  const [selectedEntryForCollection, setSelectedEntryForCollection] = useState<RevenueEntry | null>(null);

  const canCreate = isCompanyAdmin() || hasPermission('revenue.create');
  const canAddCollection = isCompanyAdmin() || hasPermission('revenue.add_collection');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['revenue-entries', profile?.company_id, viewMode],
    queryFn: async () => {
      let query = supabase
        .from('revenue_entries')
        .select(`
          *,
          revenue_categories (name, code),
          profiles (full_name)
        `)
        .eq('company_id', profile?.company_id)
        .order('revenue_date', { ascending: false });

      if (viewMode === 'own') {
        query = query.eq('profile_id', profile?.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get collections for each entry
      const entriesWithCollections = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: collections } = await supabase
            .from('revenue_collections')
            .select('amount')
            .eq('revenue_entry_id', entry.id);
          const collected = collections?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
          return { ...entry, collected_amount: collected };
        })
      );

      return entriesWithCollections as RevenueEntry[];
    },
    enabled: !!profile?.company_id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenue_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-entries'] });
      toast.success('Revenue entry deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredEntries = entries.filter((entry) =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.revenue_categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (entry: RevenueEntry) => {
    setEditingEntry(entry);
    setEntryFormOpen(true);
  };

  const handleAddCollection = (entry: RevenueEntry) => {
    setSelectedEntryForCollection(entry);
    setCollectionFormOpen(true);
  };

  const getCollectionStatus = (entry: RevenueEntry) => {
    const collected = entry.collected_amount || 0;
    const total = entry.amount;
    if (collected >= total) return { label: 'Fully Collected', variant: 'default' as const };
    if (collected > 0) return { label: 'Partial', variant: 'secondary' as const };
    return { label: 'Pending', variant: 'outline' as const };
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading revenue entries...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingEntry(null); setEntryFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Revenue
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead>Status</TableHead>
              {viewMode === 'all' && <TableHead>Created By</TableHead>}
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={viewMode === 'all' ? 9 : 8} className="text-center text-muted-foreground py-8">
                  No revenue entries found.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const status = getCollectionStatus(entry);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.revenue_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.revenue_categories?.name}</Badge>
                    </TableCell>
                    <TableCell>{entry.client_name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{(entry.collected_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    {viewMode === 'all' && (
                      <TableCell>
                        {entry.profiles?.full_name}
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canAddCollection && status.label !== 'Fully Collected' && (
                            <DropdownMenuItem onClick={() => handleAddCollection(entry)}>
                              <Banknote className="h-4 w-4 mr-2" />
                              Add Collection
                            </DropdownMenuItem>
                          )}
                          {canCreate && (
                            <DropdownMenuItem onClick={() => handleEdit(entry)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canCreate && (
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(entry.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RevenueEntryForm
        open={entryFormOpen}
        onOpenChange={setEntryFormOpen}
        editingEntry={editingEntry}
      />

      {selectedEntryForCollection && (
        <CollectionForm
          open={collectionFormOpen}
          onOpenChange={setCollectionFormOpen}
          revenueEntry={selectedEntryForCollection}
        />
      )}
    </div>
  );
};
