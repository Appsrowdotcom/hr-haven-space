import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useLeavePolicy, RequestType } from '@/hooks/useLeavePolicy';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Loader2, Calendar, Check, X, Clock, AlertCircle, Settings, CalendarDays, AlertTriangle, DollarSign, ShieldAlert } from 'lucide-react';
import LeaveTypeConfig from '@/components/hr/LeaveTypeConfig';
import InitializeLeaveBalances from '@/components/hr/InitializeLeaveBalances';
import LeaveCalendarView from '@/components/hr/LeaveCalendarView';
import { LeavePolicySettings } from '@/components/hr/LeavePolicySettings';
import { leaveRequestSchema, getValidationError } from '@/lib/validations';

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
  request_type: string;
  is_paid: boolean;
  requires_hr_approval: boolean;
  auto_unpaid_reason: string | null;
  manager_approved: boolean | null;
  hr_approved: boolean | null;
  leave_type?: LeaveType;
  profile?: { full_name: string; email: string; employee_category: string };
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
  const { isCompanyAdmin, hasPermission, hasRole } = usePermissions();
  const { policy, eligibility, isLoading: policyLoading, validateLeaveRequest, determineRequestType } = useLeavePolicy();
  
  const isHR = hasRole('HR') || hasRole('Hr manager');
  const canManageLeave = isCompanyAdmin() || isHR || hasPermission('leave.approve');
  const canConfigureLeaveTypes = isCompanyAdmin() || isHR || hasPermission('leave.manage_policy');
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
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
      .select('id, name, description, days_per_year, is_paid, is_active')
      .eq('company_id', company.id)
      .eq('is_active', true);
    
    if (error) console.error('Error fetching leave types:', error);
    else setLeaveTypes(data || []);
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
    
    if (error) console.error('Error fetching my requests:', error);
    else setMyRequests(data || []);
  };

  const fetchAllRequests = async () => {
    if (!company?.id || !canManageLeave) return;
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(id, name, is_paid),
        profile:profiles!leave_requests_profile_id_fkey(full_name, email, employee_category)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching all requests:', error);
    else setAllRequests(data || []);
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
    
    if (error) console.error('Error fetching leave balances:', error);
    else setLeaveBalances(data || []);
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
    
    if (company?.id && user?.id) loadData();
  }, [company?.id, user?.id, canManageLeave]);

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Get balance for selected leave type
  const selectedLeaveType = useMemo(() => 
    leaveTypes.find(t => t.id === leaveForm.leave_type_id), 
    [leaveTypes, leaveForm.leave_type_id]
  );
  
  const selectedBalance = useMemo(() => 
    leaveBalances.find(b => b.leave_type_id === leaveForm.leave_type_id),
    [leaveBalances, leaveForm.leave_type_id]
  );

  const availableBalance = selectedBalance 
    ? Number(selectedBalance.total_days) - Number(selectedBalance.used_days) 
    : 0;

  // Real-time validation
  const validation = useMemo(() => {
    if (!leaveForm.leave_type_id || !leaveForm.start_date || !leaveForm.end_date) {
      return null;
    }
    const totalDays = calculateDays(leaveForm.start_date, leaveForm.end_date);
    return validateLeaveRequest(
      leaveForm.start_date,
      leaveForm.end_date,
      leaveForm.leave_type_id,
      totalDays,
      availableBalance,
      selectedLeaveType?.is_paid || false,
      isEmergency
    );
  }, [leaveForm, isEmergency, availableBalance, selectedLeaveType, validateLeaveRequest]);

  const handleApplyLeave = async () => {
    if (!user?.id || !validation) return;
    
    if (!validation.isValid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }
    
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
          reason: leaveForm.reason?.trim() || null,
          status: 'pending',
          request_type: validation.requestType,
          is_paid: validation.isPaid,
          requires_hr_approval: validation.requiresHRApproval,
          auto_unpaid_reason: validation.autoUnpaidReason || null,
        });

      if (error) throw error;
      
      toast.success('Leave request submitted successfully');
      setApplyDialogOpen(false);
      setLeaveForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      setIsEmergency(false);
      fetchMyRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReject = async (requestId: string, action: 'approved' | 'rejected', asHR: boolean = false) => {
    if (!user?.id) return;
    
    try {
      const updateData: Record<string, any> = {};
      
      if (asHR) {
        updateData.hr_approved = action === 'approved';
        updateData.hr_approved_by = user.id;
        updateData.hr_approved_at = new Date().toISOString();
      } else {
        updateData.manager_approved = action === 'approved';
        updateData.manager_approved_by = user.id;
        updateData.manager_approved_at = new Date().toISOString();
      }

      // Check if both approvals are done
      const request = allRequests.find(r => r.id === requestId);
      if (request) {
        const managerApproved = asHR ? request.manager_approved : (action === 'approved');
        const hrApproved = asHR ? (action === 'approved') : request.hr_approved;
        
        if (action === 'rejected') {
          updateData.status = 'rejected';
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        } else if (!request.requires_hr_approval && managerApproved) {
          updateData.status = 'approved';
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        } else if (request.requires_hr_approval && managerApproved && hrApproved) {
          updateData.status = 'approved';
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success(`Leave request ${action}`);
      fetchAllRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update leave request');
    }
  };

  const handleTogglePaid = async (requestId: string, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ is_paid: isPaid })
        .eq('id', requestId);

      if (error) throw error;
      toast.success(`Leave marked as ${isPaid ? 'Paid' : 'Unpaid'}`);
      fetchAllRequests();
    } catch (error: any) {
      toast.error('Failed to update leave');
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

  const getRequestTypeBadge = (type: RequestType) => {
    switch (type) {
      case 'planned':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Planned</Badge>;
      case 'unplanned':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Unplanned</Badge>;
      case 'emergency':
        return <Badge variant="outline" className="text-red-600 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Emergency</Badge>;
    }
  };

  const getPaidBadge = (isPaid: boolean) => {
    return isPaid 
      ? <Badge className="bg-green-500/10 text-green-600 border-green-200"><DollarSign className="h-3 w-3 mr-1" />Paid</Badge>
      : <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Unpaid</Badge>;
  };

  if (isLoading || policyLoading) {
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
        <div className="flex gap-2">
          {canConfigureLeaveTypes && (
            <InitializeLeaveBalances onInitialized={fetchLeaveBalances} />
          )}
          <Dialog open={applyDialogOpen} onOpenChange={(open) => {
            setApplyDialogOpen(open);
            if (!open) {
              setLeaveForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
              setIsEmergency(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Apply Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Eligibility Warning */}
                {!eligibility.isEligibleForPaidLeave && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Limited Leave Eligibility</AlertTitle>
                    <AlertDescription>
                      {eligibility.ineligibilityReason}. You can still apply for emergency leave (unpaid).
                    </AlertDescription>
                  </Alert>
                )}

                {leaveTypes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No leave types configured. Contact your HR admin.</p>
                  </div>
                ) : (
                  <>
                    {/* Emergency Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div>
                        <Label className="text-sm font-medium">Emergency Leave</Label>
                        <p className="text-xs text-muted-foreground">Mark this as an emergency (pending HR review)</p>
                      </div>
                      <Switch checked={isEmergency} onCheckedChange={setIsEmergency} />
                    </div>

                    <div className="space-y-2">
                      <Label>Leave Type</Label>
                      <Select 
                        value={leaveForm.leave_type_id} 
                        onValueChange={(v) => setLeaveForm({...leaveForm, leave_type_id: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map((type) => {
                            const balance = leaveBalances.find(b => b.leave_type_id === type.id);
                            const available = balance ? Number(balance.total_days) - Number(balance.used_days) : 0;
                            return (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} {type.is_paid ? '(Paid)' : '(Unpaid)'} - {available} days available
                              </SelectItem>
                            );
                          })}
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

                    {/* Validation Feedback */}
                    {validation && (
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">Total Days: {calculateDays(leaveForm.start_date, leaveForm.end_date)}</span>
                            <div className="flex gap-2 mt-1">
                              {getRequestTypeBadge(validation.requestType)}
                              {getPaidBadge(validation.isPaid)}
                              {validation.requiresHRApproval && (
                                <Badge variant="outline" className="text-purple-600 border-purple-200">
                                  <ShieldAlert className="h-3 w-3 mr-1" />HR Approval Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {validation.warnings.length > 0 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Notice</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside text-sm">
                                {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {validation.errors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Cannot Submit</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside text-sm">
                                {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Reason {isEmergency ? '(Required)' : '(Optional)'}</Label>
                      <Textarea
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                        placeholder={isEmergency ? "Explain the emergency situation..." : "Enter reason for leave..."}
                      />
                    </div>

                    <Button 
                      onClick={handleApplyLeave} 
                      disabled={saving || !validation?.isValid || (isEmergency && !leaveForm.reason.trim())} 
                      className="w-full"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                      Submit Request
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Eligibility Info */}
      {!eligibility.isEligibleForPaidLeave && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Leave Eligibility Status</AlertTitle>
          <AlertDescription>
            {eligibility.ineligibilityReason}. You are currently in month {eligibility.monthsEmployed} of employment.
            {eligibility.employeeCategory && (
              <span className="ml-1">Category: <strong className="capitalize">{eligibility.employeeCategory}</strong></span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="my-requests">
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {canManageLeave && <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>}
          {canManageLeave && <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1" />Calendar</TabsTrigger>}
          {canConfigureLeaveTypes && <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" />Leave Types</TabsTrigger>}
          {canConfigureLeaveTypes && <TabsTrigger value="policy"><ShieldAlert className="h-4 w-4 mr-1" />Policy</TabsTrigger>}
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
                      <TableHead>Request Type</TableHead>
                      <TableHead>Paid/Unpaid</TableHead>
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
                        <TableCell>{getRequestTypeBadge(request.request_type as RequestType)}</TableCell>
                        <TableCell>{getPaidBadge(request.is_paid)}</TableCell>
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

        {canManageLeave && (
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
                        <TableHead>Request Type</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Approvals</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.profile?.full_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{request.profile?.employee_category}</p>
                            </div>
                          </TableCell>
                          <TableCell>{request.leave_type?.name}</TableCell>
                          <TableCell>
                            <div>
                              <p>{request.start_date} to {request.end_date}</p>
                              <p className="text-xs text-muted-foreground">{request.total_days} days</p>
                            </div>
                          </TableCell>
                          <TableCell>{getRequestTypeBadge(request.request_type as RequestType)}</TableCell>
                          <TableCell>
                            {isHR ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={request.is_paid}
                                  onCheckedChange={(checked) => handleTogglePaid(request.id, checked)}
                                />
                                <span className="text-xs">{request.is_paid ? 'Paid' : 'Unpaid'}</span>
                              </div>
                            ) : (
                              getPaidBadge(request.is_paid)
                            )}
                            {request.auto_unpaid_reason && (
                              <p className="text-xs text-muted-foreground mt-1">{request.auto_unpaid_reason}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-1">
                                Manager: {request.manager_approved === true ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : request.manager_approved === false ? (
                                  <X className="h-3 w-3 text-red-600" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-600" />
                                )}
                              </div>
                              {request.requires_hr_approval && (
                                <div className="flex items-center gap-1">
                                  HR: {request.hr_approved === true ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : request.hr_approved === false ? (
                                    <X className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-amber-600" />
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {/* Manager Approval */}
                              {request.manager_approved === null && (
                                <>
                                  <Button size="sm" onClick={() => handleApproveReject(request.id, 'approved', false)}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleApproveReject(request.id, 'rejected', false)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {/* HR Approval (only for HR users) */}
                              {isHR && request.requires_hr_approval && request.hr_approved === null && request.manager_approved === true && (
                                <>
                                  <Button size="sm" variant="secondary" onClick={() => handleApproveReject(request.id, 'approved', true)}>
                                    HR <Check className="h-4 w-4 ml-1" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleApproveReject(request.id, 'rejected', true)}>
                                    HR <X className="h-4 w-4 ml-1" />
                                  </Button>
                                </>
                              )}
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

        {canManageLeave && (
          <TabsContent value="calendar">
            <LeaveCalendarView />
          </TabsContent>
        )}

        {canConfigureLeaveTypes && (
          <TabsContent value="config">
            <LeaveTypeConfig />
          </TabsContent>
        )}

        {canConfigureLeaveTypes && (
          <TabsContent value="policy">
            <LeavePolicySettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LeaveManagementPage;
