import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useLeavePolicy, RequestType } from "@/hooks/useLeavePolicy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Calendar,
  Check,
  X,
  Clock,
  AlertCircle,
  Settings,
  CalendarDays,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Users,
} from "lucide-react";
import LeaveTypeConfig from "@/components/hr/LeaveTypeConfig";
import InitializeLeaveBalances from "@/components/hr/InitializeLeaveBalances";
import LeaveCalendarView from "@/components/hr/LeaveCalendarView";
import { LeavePolicySettings } from "@/components/hr/LeavePolicySettings";
import TeamLeaveBalances from "@/components/hr/TeamLeaveBalances";
import ManageLeaveBalances from "@/components/hr/ManageLeaveBalances";
import { leaveRequestSchema, getValidationError } from "@/lib/validations";

interface LeaveType {
  id: string;
  name: string;
  description?: string | null;
  days_per_year?: number;
  is_paid: boolean;
  is_monthly_quota?: boolean;
  monthly_limit?: number | null;
}

// Uses leave_request_details view
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
  leave_type_name?: string;
  leave_type_is_paid?: boolean;
  employee_name?: string;
  employee_email?: string;
  employee_category?: string;
  department_id?: string;
  department_name?: string;
  // Backwards compatibility for old queries
  leave_type?: LeaveType;
  profile?: { full_name: string; email: string; employee_category: string };
}

// Uses leave_balance_summary view
interface LeaveBalance {
  id: string;
  profile_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  carry_forward_days: number;
  accrued_days?: number;
  remaining_days: number;
  leave_type_name: string;
  leave_type_description?: string;
  is_paid: boolean;
  monthly_credit?: number;
  days_per_year?: number;
  is_monthly_quota?: boolean;
  monthly_limit?: number | null;
  // Backwards compatibility
  leave_type?: LeaveType;
}

// Monthly usage tracking for monthly quota leave types
interface MonthlyUsage {
  profile_id: string;
  leave_type_id: string;
  leave_type_name: string;
  monthly_limit: number;
  year: number;
  month: number;
  used_days: number;
  remaining_days: number;
}

const LeaveManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { isCompanyAdmin, hasPermission, hasRole } = usePermissions();
  const {
    policy,
    eligibility,
    isLoading: policyLoading,
    validateLeaveRequest,
    determineRequestType,
  } = useLeavePolicy();

  // Check permissions instead of hardcoded role names
  const canApproveLeave = hasPermission("leave.approve");
  const canManagePolicy = hasPermission("leave.manage_policy");
  const canManageBalance = hasPermission("leave.manage_balance");
  const canViewLeave = hasPermission("leave.view");
  
  // User can manage leave if they're admin OR have any leave management permission
  const canManageLeave = isCompanyAdmin() || canApproveLeave;
  const canConfigureLeaveTypes = isCompanyAdmin() || canManagePolicy;

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const fetchLeaveTypes = async () => {
    if (!company?.id) return;
    const { data, error } = await supabase
      .from("leave_types")
      .select("id, name, description, days_per_year, is_paid, is_active, is_monthly_quota, monthly_limit")
      .eq("company_id", company.id)
      .eq("is_active", true);

    if (error) console.error("Error fetching leave types:", error);
    else setLeaveTypes(data || []);
  };

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    // Use leave_request_details view
    const { data, error } = await supabase
      .from("leave_request_details")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching my requests:", error);
    else setMyRequests((data || []) as LeaveRequest[]);
  };

  const fetchAllRequests = async () => {
    if (!company?.id || !canManageLeave) return;
    // Use leave_request_details view
    const { data, error } = await supabase
      .from("leave_request_details")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching all requests:", error);
    else setAllRequests((data || []) as LeaveRequest[]);
  };

  const fetchLeaveBalances = async () => {
    if (!user?.id) return;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Use leave_balance_summary view - includes remaining_days calculation
    const { data, error } = await supabase
      .from("leave_balance_summary")
      .select("*")
      .eq("profile_id", user.id)
      .eq("year", currentYear);

    if (error) console.error("Error fetching leave balances:", error);
    else setLeaveBalances((data || []) as LeaveBalance[]);

    // Fetch monthly usage for monthly quota leave types
    const { data: monthlyData, error: monthlyError } = await supabase
      .from("leave_monthly_usage")
      .select("*")
      .eq("profile_id", user.id)
      .eq("year", currentYear)
      .eq("month", currentMonth);

    if (monthlyError) console.error("Error fetching monthly usage:", monthlyError);
    else setMonthlyUsage((monthlyData || []) as MonthlyUsage[]);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLeaveTypes(), fetchMyRequests(), fetchAllRequests(), fetchLeaveBalances()]);
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
  const selectedLeaveType = useMemo(
    () => leaveTypes.find((t) => t.id === leaveForm.leave_type_id),
    [leaveTypes, leaveForm.leave_type_id],
  );

  const selectedBalance = useMemo(
    () => leaveBalances.find((b) => b.leave_type_id === leaveForm.leave_type_id),
    [leaveBalances, leaveForm.leave_type_id],
  );

  const availableBalance = selectedBalance ? Number(selectedBalance.total_days) - Number(selectedBalance.used_days) : 0;

  // Accrued balance = what they've actually earned so far (total_days represents this after initialization)
  const accruedBalance = selectedBalance ? Number(selectedBalance.accrued_days || selectedBalance.total_days) : 0;

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
      accruedBalance,
      selectedLeaveType?.is_paid || false,
      isEmergency,
    );
  }, [leaveForm, isEmergency, availableBalance, accruedBalance, selectedLeaveType, validateLeaveRequest]);

  const handleApplyLeave = async () => {
    if (!user?.id || !validation) return;

    if (!validation.isValid) {
      validation.errors.forEach((err) => toast.error(err));
      return;
    }

    setSaving(true);
    try {
      const totalDays = calculateDays(leaveForm.start_date, leaveForm.end_date);

      const { error } = await supabase.from("leave_requests").insert({
        profile_id: user.id,
        leave_type_id: leaveForm.leave_type_id,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        total_days: totalDays,
        reason: leaveForm.reason?.trim() || null,
        status: "pending",
        request_type: validation.requestType,
        is_paid: validation.isPaid,
        requires_hr_approval: validation.requiresHRApproval,
        auto_unpaid_reason: validation.autoUnpaidReason || null,
      });

      if (error) throw error;

      toast.success("Leave request submitted successfully");
      setApplyDialogOpen(false);
      setLeaveForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
      setIsEmergency(false);
      fetchMyRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReject = async (requestId: string, action: "approved" | "rejected", asHR: boolean = false) => {
    if (!user?.id) return;

    try {
      const updateData: Record<string, any> = {};

      if (asHR) {
        updateData.hr_approved = action === "approved";
        updateData.hr_approved_by = user.id;
        updateData.hr_approved_at = new Date().toISOString();
      } else {
        updateData.manager_approved = action === "approved";
        updateData.manager_approved_by = user.id;
        updateData.manager_approved_at = new Date().toISOString();
      }

      // Check if both approvals are done
      const request = allRequests.find((r) => r.id === requestId);
      if (request) {
        const managerApproved = asHR ? request.manager_approved : action === "approved";
        const hrApproved = asHR ? action === "approved" : request.hr_approved;

        if (action === "rejected") {
          updateData.status = "rejected";
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        } else if (!request.requires_hr_approval && managerApproved) {
          updateData.status = "approved";
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        } else if (request.requires_hr_approval && managerApproved && hrApproved) {
          updateData.status = "approved";
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        }
      }

      const { error } = await supabase.from("leave_requests").update(updateData).eq("id", requestId);

      if (error) throw error;

      toast.success(`Leave request ${action}`);
      fetchAllRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to update leave request");
    }
  };

  const handleTogglePaid = async (requestId: string, isPaid: boolean) => {
    try {
      const { error } = await supabase.from("leave_requests").update({ is_paid: isPaid }).eq("id", requestId);

      if (error) throw error;
      toast.success(`Leave marked as ${isPaid ? "Paid" : "Unpaid"}`);
      fetchAllRequests();
    } catch (error: any) {
      toast.error("Failed to update leave");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (type: RequestType) => {
    switch (type) {
      case "planned":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            Planned
          </Badge>
        );
      case "unplanned":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Unplanned
          </Badge>
        );
      case "emergency":
        return (
          <Badge variant="outline" className="text-red-600 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Emergency
          </Badge>
        );
    }
  };

  const getPaidBadge = (isPaid: boolean) => {
    return isPaid ? (
      <Badge className="bg-green-500/10 text-green-600 border-green-200">
        <DollarSign className="h-3 w-3 mr-1" />
        Paid
      </Badge>
    ) : (
      <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Unpaid</Badge>
    );
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
          {canConfigureLeaveTypes && <InitializeLeaveBalances onInitialized={fetchLeaveBalances} />}
          <Dialog
            open={applyDialogOpen}
            onOpenChange={(open) => {
              setApplyDialogOpen(open);
              if (!open) {
                setLeaveForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
                setIsEmergency(false);
              }
            }}
          >
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
                        onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map((type) => {
                            let available = 0;
                            let displayText = "";
                            
                            if (type.is_monthly_quota) {
                              // For monthly quota types, show monthly remaining
                              const usage = monthlyUsage.find((u) => u.leave_type_id === type.id);
                              available = usage ? usage.remaining_days : (type.monthly_limit || 0);
                              const monthName = new Date().toLocaleString('default', { month: 'short' });
                              displayText = `${type.name} ${type.is_paid ? "(Paid)" : "(Unpaid)"} - ${available} days left in ${monthName}`;
                            } else {
                              // For annual types, show yearly remaining
                              const balance = leaveBalances.find((b) => b.leave_type_id === type.id);
                              available = balance ? Number(balance.total_days) - Number(balance.used_days) : 0;
                              displayText = `${type.name} ${type.is_paid ? "(Paid)" : "(Unpaid)"} - ${available} days available`;
                            }
                            
                            return (
                              <SelectItem key={type.id} value={type.id}>
                                {displayText}
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
                          onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={leaveForm.end_date}
                          onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                          min={leaveForm.start_date}
                        />
                      </div>
                    </div>

                    {/* Validation Feedback */}
                    {validation && (
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              Total Days: {calculateDays(leaveForm.start_date, leaveForm.end_date)}
                            </span>
                            <div className="flex gap-2 mt-1">
                              {getRequestTypeBadge(validation.requestType)}
                              {getPaidBadge(validation.isPaid)}
                              {validation.requiresHRApproval && (
                                <Badge variant="outline" className="text-purple-600 border-purple-200">
                                  <ShieldAlert className="h-3 w-3 mr-1" />
                                  HR Approval Required
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
                                {validation.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
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
                                {validation.errors.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Reason {isEmergency ? "(Required)" : "(Optional)"}</Label>
                      <Textarea
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        placeholder={isEmergency ? "Explain the emergency situation..." : "Enter reason for leave..."}
                      />
                    </div>

                    <Button
                      onClick={handleApplyLeave}
                      disabled={saving || !validation?.isValid || (isEmergency && !leaveForm.reason.trim())}
                      className="w-full"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calendar className="mr-2 h-4 w-4" />
                      )}
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
      {(leaveBalances.length > 0 || monthlyUsage.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Regular annual leave balances */}
          {leaveBalances
            .filter((balance) => !balance.is_monthly_quota)
            .map((balance) => {
              const totalDays = Number(balance.total_days) || 0;
              const usedDays = Number(balance.used_days) || 0;
              const remainingDays = totalDays - usedDays;

              return (
                <Card key={balance.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {balance.leave_type_name || "Unknown Leave Type"}
                        </p>
                        <p className="text-2xl font-bold">{balance.remaining_days?.toFixed(1) || remainingDays.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">days remaining this year</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Used: {usedDays.toFixed(1)}</p>
                        <p>Total: {totalDays.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          
          {/* Monthly quota leave types */}
          {leaveTypes
            .filter((lt) => lt.is_monthly_quota)
            .map((leaveType) => {
              const usage = monthlyUsage.find((u) => u.leave_type_id === leaveType.id);
              const monthlyLimit = leaveType.monthly_limit || 1;
              const usedThisMonth = usage ? Number(usage.used_days) : 0;
              const remainingThisMonth = monthlyLimit - usedThisMonth;
              const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

              return (
                <Card key={`monthly-${leaveType.id}`} className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {leaveType.name}
                          </p>
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                            Monthly
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{remainingThisMonth > 0 ? remainingThisMonth : 0}</p>
                        <p className="text-xs text-muted-foreground">
                          days left in {currentMonth}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Used: {usedThisMonth}</p>
                        <p>Limit: {monthlyLimit}/month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
              <span className="ml-1">
                Category: <strong className="capitalize">{eligibility.employeeCategory}</strong>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="my-requests">
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {canApproveLeave && <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>}
          {(canViewLeave || canManageBalance) && (
            <TabsTrigger value="team-balances">
              <Users className="h-4 w-4 mr-1" />
              Team Balances
            </TabsTrigger>
          )}
          {canManageBalance && (
            <TabsTrigger value="manage-balances">
              <Settings className="h-4 w-4 mr-1" />
              Manage Balances
            </TabsTrigger>
          )}
          {(canViewLeave || canApproveLeave) && (
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-1" />
              Calendar
            </TabsTrigger>
          )}
          {canManagePolicy && (
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-1" />
              Leave Types
            </TabsTrigger>
          )}
          {canManagePolicy && (
            <TabsTrigger value="policy">
              <ShieldAlert className="h-4 w-4 mr-1" />
              Policy
            </TabsTrigger>
          )}
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
                        <TableCell className="font-medium">{request.leave_type_name || request.leave_type?.name || "Unknown"}</TableCell>
                        <TableCell>
                          {request.start_date} to {request.end_date}
                        </TableCell>
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
                              <p className="font-medium">{request.employee_name || request.profile?.full_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {request.employee_category || request.profile?.employee_category}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{request.leave_type_name || request.leave_type?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <div>
                              <p>
                                {request.start_date} to {request.end_date}
                              </p>
                              <p className="text-xs text-muted-foreground">{request.total_days} days</p>
                            </div>
                          </TableCell>
                          <TableCell>{getRequestTypeBadge(request.request_type as RequestType)}</TableCell>
                          <TableCell>
                            {canApproveLeave ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={request.is_paid}
                                  onCheckedChange={(checked) => handleTogglePaid(request.id, checked)}
                                />
                                <span className="text-xs">{request.is_paid ? "Paid" : "Unpaid"}</span>
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
                                Manager:{" "}
                                {request.manager_approved === true ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : request.manager_approved === false ? (
                                  <X className="h-3 w-3 text-red-600" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-600" />
                                )}
                              </div>
                              {request.requires_hr_approval && (
                                <div className="flex items-center gap-1">
                                  HR:{" "}
                                  {request.hr_approved === true ? (
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
                                  <Button size="sm" onClick={() => handleApproveReject(request.id, "approved", false)}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleApproveReject(request.id, "rejected", false)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {/* HR Approval (only for HR users) */}
                              {canApproveLeave &&
                                request.requires_hr_approval &&
                                request.hr_approved === null &&
                                request.manager_approved === true && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleApproveReject(request.id, "approved", true)}
                                    >
                                      HR <Check className="h-4 w-4 ml-1" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleApproveReject(request.id, "rejected", true)}
                                    >
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

        {(canViewLeave || canManageBalance) && (
          <TabsContent value="team-balances">
            <TeamLeaveBalances />
          </TabsContent>
        )}

        {canManageBalance && (
          <TabsContent value="manage-balances">
            <ManageLeaveBalances />
          </TabsContent>
        )}

        {(canViewLeave || canApproveLeave) && (
          <TabsContent value="calendar">
            <LeaveCalendarView />
          </TabsContent>
        )}

        {canManagePolicy && (
          <TabsContent value="config">
            <LeaveTypeConfig />
          </TabsContent>
        )}

        {canManagePolicy && (
          <TabsContent value="policy">
            <LeavePolicySettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LeaveManagementPage;
