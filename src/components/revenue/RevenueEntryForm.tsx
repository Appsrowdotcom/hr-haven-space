import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RevenueCategory {
  id: string;
  name: string;
  code: string;
}

interface RevenueEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry?: {
    id: string;
    category_id: string;
    description: string;
    amount: number;
    revenue_date: string;
    client_name: string | null;
    invoice_number: string | null;
    notes: string | null;
  } | null;
}

export const RevenueEntryForm: React.FC<RevenueEntryFormProps> = ({
  open,
  onOpenChange,
  editingEntry,
}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    category_id: editingEntry?.category_id || '',
    description: editingEntry?.description || '',
    amount: editingEntry?.amount?.toString() || '',
    revenue_date: editingEntry?.revenue_date || format(new Date(), 'yyyy-MM-dd'),
    client_name: editingEntry?.client_name || '',
    invoice_number: editingEntry?.invoice_number || '',
    notes: editingEntry?.notes || '',
  });

  React.useEffect(() => {
    if (editingEntry) {
      setFormData({
        category_id: editingEntry.category_id,
        description: editingEntry.description,
        amount: editingEntry.amount.toString(),
        revenue_date: editingEntry.revenue_date,
        client_name: editingEntry.client_name || '',
        invoice_number: editingEntry.invoice_number || '',
        notes: editingEntry.notes || '',
      });
    } else {
      setFormData({
        category_id: '',
        description: '',
        amount: '',
        revenue_date: format(new Date(), 'yyyy-MM-dd'),
        client_name: '',
        invoice_number: '',
        notes: '',
      });
    }
  }, [editingEntry, open]);

  const { data: categories = [] } = useQuery({
    queryKey: ['revenue-categories', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_categories')
        .select('id, name, code')
        .eq('company_id', profile?.company_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as RevenueCategory[];
    },
    enabled: !!profile?.company_id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('revenue_entries').insert({
        company_id: profile?.company_id,
        profile_id: profile?.id,
        category_id: formData.category_id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        revenue_date: formData.revenue_date,
        client_name: formData.client_name || null,
        invoice_number: formData.invoice_number || null,
        notes: formData.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-entries'] });
      toast.success('Revenue entry created successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingEntry) return;
      const { error } = await supabase
        .from('revenue_entries')
        .update({
          category_id: formData.category_id,
          description: formData.description,
          amount: parseFloat(formData.amount),
          revenue_date: formData.revenue_date,
          client_name: formData.client_name || null,
          invoice_number: formData.invoice_number || null,
          notes: formData.notes || null,
        })
        .eq('id', editingEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-entries'] });
      toast.success('Revenue entry updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Revenue Entry' : 'Create Revenue Entry'}</DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Update the revenue entry details.' : 'Add a new revenue entry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Revenue description"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue_date">Date</Label>
                <Input
                  id="revenue_date"
                  type="date"
                  value={formData.revenue_date}
                  onChange={(e) => setFormData({ ...formData, revenue_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEntry ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
