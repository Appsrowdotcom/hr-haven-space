import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

interface CollectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueEntry: {
    id: string;
    description: string;
    amount: number;
    collected_amount?: number;
  };
}

const PAYMENT_METHODS = [
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Other',
];

export const CollectionForm: React.FC<CollectionFormProps> = ({
  open,
  onOpenChange,
  revenueEntry,
}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const remainingAmount = revenueEntry.amount - (revenueEntry.collected_amount || 0);

  const [formData, setFormData] = useState({
    amount: remainingAmount.toString(),
    collection_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    reference_number: '',
    notes: '',
  });

  React.useEffect(() => {
    if (open) {
      const remaining = revenueEntry.amount - (revenueEntry.collected_amount || 0);
      setFormData({
        amount: remaining.toString(),
        collection_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: '',
        reference_number: '',
        notes: '',
      });
    }
  }, [open, revenueEntry]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('revenue_collections').insert({
        revenue_entry_id: revenueEntry.id,
        company_id: profile?.company_id,
        profile_id: profile?.id,
        amount: parseFloat(formData.amount),
        collection_date: formData.collection_date,
        payment_method: formData.payment_method || null,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-entries'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-collections'] });
      toast.success('Collection recorded successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (amount > remainingAmount) {
      toast.error(`Amount cannot exceed remaining balance of ₹${remainingAmount.toLocaleString('en-IN')}`);
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Collection</DialogTitle>
            <DialogDescription>
              Add a collection for: {revenueEntry.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">₹{revenueEntry.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Collected:</span>
                <span>₹{(revenueEntry.collected_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-primary font-medium">
                <span>Remaining:</span>
                <span>₹{remainingAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  max={remainingAmount}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection_date">Date</Label>
                <Input
                  id="collection_date"
                  type="date"
                  value={formData.collection_date}
                  onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
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
            <Button type="submit" disabled={createMutation.isPending}>
              Record Collection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
