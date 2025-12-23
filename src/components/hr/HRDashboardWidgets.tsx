import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Clock, 
  UserPlus, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaveRequests: number;
  todayAttendance: number;
  onboardingInProgress: number;
  recentLeaveRequests: Array<{
    id: string;
    employeeName: string;
    leaveType: string;
    days: number;
    status: string;
  }>;
}

const HRDashboardWidgets: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { isCompanyAdmin, isModuleEnabled, hasPermission, hasRole } = usePermissions();
  
  // Permission check - allow Company Admin, HR role, or relevant permissions
  const canViewHRStats = isCompanyAdmin() || hasRole('HR') || hasRole('Hr manager') || hasPermission('hr.view_employee');
  const navigate = useNavigate();
  const [stats, setStats] = useState<HRStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!company?.id || !user?.id) return;

      setIsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch all stats in parallel
        const [employeesResult, attendanceResult, leaveResult, onboardingResult, recentLeavesResult] = await Promise.all([
          // Total and active employees
          supabase
            .from('profiles')
            .select('id, status')
            .eq('company_id', company.id),
          
          // Today's attendance
          supabase
            .from('attendance')
            .select('id, profile:profiles!attendance_profile_id_fkey(company_id)')
            .eq('date', today),
          
          // Pending leave requests
          supabase
            .from('leave_requests')
            .select('id')
            .eq('status', 'pending'),
          
          // Onboarding in progress
          supabase
            .from('employee_onboarding')
            .select('id, profile:profiles!employee_onboarding_profile_id_fkey(company_id)')
            .eq('status', 'in_progress'),
          
          // Recent leave requests (for admins/HR)
          canViewHRStats ? supabase
            .from('leave_requests')
            .select(`
              id,
              total_days,
              status,
              profile:profiles!leave_requests_profile_id_fkey(full_name),
              leave_type:leave_types(name)
            `)
            .order('created_at', { ascending: false })
            .limit(5) : Promise.resolve({ data: [] })
        ]);

        const employees = employeesResult.data || [];
        const attendance = attendanceResult.data || [];
        const pendingLeaves = leaveResult.data || [];
        const onboarding = onboardingResult.data || [];
        const recentLeaves = recentLeavesResult.data || [];

        // Filter by company
        const companyAttendance = attendance.filter((a: any) => a.profile?.company_id === company.id);
        const companyOnboarding = onboarding.filter((o: any) => o.profile?.company_id === company.id);

        setStats({
          totalEmployees: employees.length,
          activeEmployees: employees.filter(e => e.status === 'active').length,
          pendingLeaveRequests: pendingLeaves.length,
          todayAttendance: companyAttendance.length,
          onboardingInProgress: companyOnboarding.length,
          recentLeaveRequests: recentLeaves.map((r: any) => ({
            id: r.id,
            employeeName: r.profile?.full_name || 'Unknown',
            leaveType: r.leave_type?.name || 'Unknown',
            days: r.total_days,
            status: r.status,
          })),
        });
      } catch (error) {
        console.error('Error fetching HR stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [company?.id, user?.id, canViewHRStats]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/hr/employees')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeEmployees || 0} active
            </p>
          </CardContent>
        </Card>

        {isModuleEnabled('ATTENDANCE') && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/hr/attendance')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Attendance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayAttendance || 0}</div>
              <p className="text-xs text-muted-foreground">
                employees checked in
              </p>
            </CardContent>
          </Card>
        )}

        {isModuleEnabled('LEAVE') && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/hr/leave')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leaves</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingLeaveRequests || 0}</div>
              <p className="text-xs text-muted-foreground">
                awaiting approval
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/hr/onboarding')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Onboarding</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.onboardingInProgress || 0}</div>
            <p className="text-xs text-muted-foreground">
              in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leave Requests - Only for admins */}
      {canViewHRStats && isModuleEnabled('LEAVE') && stats?.recentLeaveRequests && stats.recentLeaveRequests.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Leave Requests</CardTitle>
              <CardDescription>Latest leave requests from your team</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hr/leave')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentLeaveRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="font-medium text-sm">{request.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{request.leaveType} • {request.days} day(s)</p>
                    </div>
                  </div>
                  <Badge variant={
                    request.status === 'approved' ? 'default' : 
                    request.status === 'rejected' ? 'destructive' : 
                    'secondary'
                  }>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HRDashboardWidgets;
