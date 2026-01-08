import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Collection {
  id: string;
  revenue_entry_id: string;
  amount: number;
  collection_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  revenue_entries: {
    description: string;
    client_name: string | null;
    amount: number;
  };
  profiles: { full_name: string };
}

export const CollectionsList: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['revenue-collections', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_collections')
        .select(`
          *,
          revenue_entries (description, client_name, amount),
          profiles (full_name)
        `)
        .eq('company_id', profile?.company_id)
        .order('collection_date', { ascending: false });
      if (error) throw error;
      return data as Collection[];
    },
    enabled: !!profile?.company_id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenue_collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-collections'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-entries'] });
      toast.success('Collection deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredCollections = collections.filter((collection) =>
    collection.revenue_entries?.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.revenue_entries?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading collections...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Revenue Entry</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCollections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No collections found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCollections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>{format(new Date(collection.collection_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {collection.revenue_entries?.description}
                  </TableCell>
                  <TableCell>{collection.revenue_entries?.client_name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{collection.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {collection.payment_method ? (
                      <Badge variant="outline">{collection.payment_method}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {collection.reference_number || '-'}
                  </TableCell>
                  <TableCell>
                    {collection.profiles?.full_name}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(collection.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
