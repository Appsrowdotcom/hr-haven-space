import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Loader2, Calendar, Check, X, Clock, AlertCircle } from 'lucide-react';

interface LeaveType {
  id: string;
  name: string;
  description?: string | null;
  days_per_year?: number;
  is_paid: boolean;
}

interface LeaveRequest {
  id: string;
  profile_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string;
  created_at: string;
  leave_type?: LeaveType;
  profile?: { full_name: string; email: string };
}

interface LeaveBalance {
  id: string;
  leave_type_id: string;
  total_days: number;
  used_days: number;
  leave_type?: LeaveType;
}

const LeaveManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { isCompanyAdmin } = usePermissions();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const fetchLeaveTypes = async () => {
    if (!company?.id) return;
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching leave types:', error);
    } else {
      setLeaveTypes(data || []);
    }
  };

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(id, name, is_paid)
      `)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching my requests:', error);
    } else {
      setMyRequests(data || []);
    }
  };

  const fetchAllRequests = async () => {
    if (!company?.id || !isCompanyAdmin()) return;
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(id, name, is_paid),
        profile:profiles!leave_requests_profile_id_fkey(full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all requests:', error);
    } else {
      setAllRequests(data || []);
    }
  };

  const fetchLeaveBalances = async () => {
    if (!user?.id) return;
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(id, name, days_per_year, is_paid)
      `)
      .eq('profile_id', user.id)
      .eq('year', currentYear);
    
    if (error) {
      console.error('Error fetching leave balances:', error);
    } else {
      setLeaveBalances(data || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchLeaveTypes(),
        fetchMyRequests(),
        fetchAllRequests(),
        fetchLeaveBalances(),
      ]);
      setIsLoading(false);
    };
    
    if (company?.id && user?.id) {
      loadData();
    }
  }, [company?.id, user?.id, isCompanyAdmin]);

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApplyLeave = async () => {
    if (!user?.id || !leaveForm.leave_type_id || !leaveForm.start_date || !leaveForm.end_date) return;
    
    setSaving(true);
    try {
      const totalDays = calculateDays(leaveForm.start_date, leaveForm.end_date);
      
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          profile_id: user.id,
          leave_type_id: leaveForm.leave_type_id,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          total_days: totalDays,
          reason: leaveForm.reason || null,
          status: 'pending',
        });

      if (error) throw error;
      
      toast.success('Leave request submitted successfully');
      setApplyDialogOpen(false);
      setLeaveForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      fetchMyRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReject = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: action,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success(`Leave request ${action}`);
      fetchAllRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update leave request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
          <h1 className="text-2xl font-bold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground">Apply for leave and track your requests</p>
        </div>
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {leaveTypes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No leave types configured. Contact your HR admin.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Select value={leaveForm.leave_type_id} onValueChange={(v) => setLeaveForm({...leaveForm, leave_type_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} {type.is_paid ? '(Paid)' : '(Unpaid)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={leaveForm.start_date}
                        onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={leaveForm.end_date}
                        onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})}
                        min={leaveForm.start_date}
                      />
                    </div>
                  </div>
                  {leaveForm.start_date && leaveForm.end_date && (
                    <div className="p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">Total Days: {calculateDays(leaveForm.start_date, leaveForm.end_date)}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                      placeholder="Enter reason for leave..."
                    />
                  </div>
                  <Button onClick={handleApplyLeave} disabled={saving || !leaveForm.leave_type_id || !leaveForm.start_date || !leaveForm.end_date} className="w-full">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                    Submit Request
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balances */}
      {leaveBalances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaveBalances.map((balance) => (
            <Card key={balance.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{balance.leave_type?.name}</p>
                    <p className="text-2xl font-bold">{Number(balance.total_days) - Number(balance.used_days)}</p>
                    <p className="text-xs text-muted-foreground">days remaining</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Used: {balance.used_days}</p>
                    <p>Total: {balance.total_days}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="my-requests">
        <TabsList>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {isCompanyAdmin() && <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="my-requests">
          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leave requests yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.leave_type?.name}</TableCell>
                        <TableCell>{request.start_date} to {request.end_date}</TableCell>
                        <TableCell>{request.total_days}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isCompanyAdmin() && (
          <TabsContent value="pending-approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Review and approve leave requests from your team</CardDescription>
              </CardHeader>
              <CardContent>
                {allRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.profile?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{request.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{request.leave_type?.name}</TableCell>
                          <TableCell>{request.start_date} to {request.end_date}</TableCell>
                          <TableCell>{request.total_days}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{request.reason || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproveReject(request.id, 'approved')}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleApproveReject(request.id, 'rejected')}>
                                <X className="h-4 w-4" />
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LeaveManagementPage;
