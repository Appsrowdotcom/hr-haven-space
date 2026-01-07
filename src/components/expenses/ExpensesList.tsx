import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Receipt,
  Filter,
  Download,
  PlusCircle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ExpensesListProps {
  view: 'my' | 'all' | 'pending';
  canCreate?: boolean;
}

interface Expense {
  id: string;
  profile_id: string;
  category_id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string;
  receipt_url: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  category?: { id: string; name: string; code: string };
  submitter?: { id: string; full_name: string; email: string };
  approver?: { id: string; full_name: string };
}

interface Category {
  id: string;
  name: string;
  code: string;
}

const ExpensesList: React.FC<ExpensesListProps> = ({ view, canCreate = true }) => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    notes: '',
    receipt_url: '',
  });

  const canApprove = hasPermission('finance.approve_expense');

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name, code')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!company?.id,
  });

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', company?.id, view, user?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(id, name, code),
          submitter:profiles!expenses_profile_id_fkey(id, full_name, email),
          approver:profiles!expenses_approved_by_fkey(id, full_name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (view === 'my') {
        query = query.eq('profile_id', user?.id);
      } else if (view === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!company?.id && !!user?.id,
  });

  // Create expense
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!company?.id || !user?.id) throw new Error('Missing context');
      const { error } = await supabase.from('expenses').insert({
        company_id: company.id,
        profile_id: user.id,
        category_id: data.category_id,
        amount: parseFloat(data.amount),
        expense_date: data.expense_date,
        description: data.description,
        notes: data.notes || null,
        receipt_url: data.receipt_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense submitted successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit expense: ${error.message}`);
    },
  });

  // Update expense
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          category_id: data.category_id,
          amount: parseFloat(data.amount),
          expense_date: data.expense_date,
          description: data.description,
          notes: data.notes || null,
          receipt_url: data.receipt_url || null,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update expense: ${error.message}`);
    },
  });

  // Delete expense
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });

  // Approve expense
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense approved');
      setIsApproveDialogOpen(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve expense: ${error.message}`);
    },
  });

  // Reject expense
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense rejected');
      setIsRejectDialogOpen(false);
      setSelectedExpense(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject expense: ${error.message}`);
    },
  });

  // Mark as reimbursed
  const reimburseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'reimbursed',
          reimbursed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Marked as reimbursed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Create category inline
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!company?.id) throw new Error('Missing company');
      const code = name.toUpperCase().replace(/\s+/g, '_').slice(0, 20);
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          company_id: company.id,
          name,
          code,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setFormData({ ...formData, category_id: data.id });
      setNewCategoryName('');
      setIsAddingCategory(false);
      toast.success('Category created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      notes: '',
      receipt_url: '',
    });
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      category_id: expense.category_id,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      description: expense.description,
      notes: expense.notes || '',
      receipt_url: expense.receipt_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      reimbursed: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.submitter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {view === 'my' ? 'My Expenses' : view === 'pending' ? 'Pending Approval' : 'All Expenses'}
              </CardTitle>
              <CardDescription>
                {filteredExpenses.length} expenses • Total: ₹{totalAmount.toLocaleString('en-IN')}
              </CardDescription>
            </div>
            {view === 'my' && canCreate && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="reimbursed">Reimbursed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {view !== 'my' && <TableHead>Submitted By</TableHead>}
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.expense_date), 'dd MMM yyyy')}</TableCell>
                      {view !== 'my' && (
                        <TableCell>{expense.submitter?.full_name || 'Unknown'}</TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">{expense.category?.name}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {view === 'my' && expense.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {canApprove && expense.status === 'pending' && view === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setIsApproveDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setIsRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canApprove && expense.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reimburseMutation.mutate(expense.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Reimburse
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Expense' : 'Submit Expense'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update expense details' : 'Fill in the expense details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => newCategoryName.trim() && createCategoryMutation.mutate(newCategoryName.trim())}
                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => {
                    if (value === '__add_new__') {
                      setIsAddingCategory(true);
                    } else {
                      setFormData({ ...formData, category_id: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <SelectItem value="__add_new__" className="text-primary">
                      <span className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Add New Category
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the expense"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt URL</Label>
              <Input
                type="url"
                value={formData.receipt_url}
                onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes (optional)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (isEditDialogOpen && selectedExpense) {
                  updateMutation.mutate({ ...formData, id: selectedExpense.id });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              disabled={!formData.category_id || !formData.amount || !formData.description}
            >
              {isEditDialogOpen ? 'Update' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{selectedExpense.category?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium">₹{selectedExpense.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(new Date(selectedExpense.expense_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedExpense.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="font-medium">{selectedExpense.description}</p>
              </div>
              {selectedExpense.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{selectedExpense.notes}</p>
                </div>
              )}
              {selectedExpense.receipt_url && (
                <div>
                  <Label className="text-muted-foreground">Receipt</Label>
                  <a
                    href={selectedExpense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Receipt className="h-4 w-4" />
                    View Receipt
                  </a>
                </div>
              )}
              {selectedExpense.submitter && (
                <div>
                  <Label className="text-muted-foreground">Submitted By</Label>
                  <p className="font-medium">{selectedExpense.submitter.full_name}</p>
                </div>
              )}
              {selectedExpense.approver && (
                <div>
                  <Label className="text-muted-foreground">
                    {selectedExpense.status === 'approved' ? 'Approved By' : 'Reviewed By'}
                  </Label>
                  <p className="font-medium">{selectedExpense.approver.full_name}</p>
                  {selectedExpense.approved_at && (
                    <p className="text-sm text-muted-foreground">
                      on {format(new Date(selectedExpense.approved_at), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              )}
              {selectedExpense.rejection_reason && (
                <div>
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <p className="text-destructive">{selectedExpense.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => selectedExpense && deleteMutation.mutate(selectedExpense.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirmation */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve this expense of ₹{selectedExpense?.amount.toLocaleString('en-IN')} for{' '}
              {selectedExpense?.submitter?.full_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedExpense && approveMutation.mutate(selectedExpense.id)}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this expense.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedExpense &&
                rejectMutation.mutate({ id: selectedExpense.id, reason: rejectionReason })
              }
              disabled={!rejectionReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpensesList;
