import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Clock, LogIn, LogOut, Timer, CalendarDays, Users, FileSpreadsheet, CreditCard, History, Settings } from 'lucide-react';
import { format } from 'date-fns';
import TeamAttendanceView from '@/components/hr/TeamAttendanceView';
import AttendanceReports from '@/components/hr/AttendanceReports';
import { AttendanceSettings } from '@/components/hr/AttendanceSettings';
interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string;
  notes: string | null;
}

interface PunchRecord {
  id: string;
  punch_time: string;
  punch_type: string;
  source: string;
  device_location: string | null;
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { isCompanyAdmin, hasRole, hasPermission } = usePermissions();
  const canViewTeamAttendance = isCompanyAdmin() || hasRole('HR') || hasRole('Hr manager') || hasPermission('attendance.view_reports');
  const canManageSettings = isCompanyAdmin();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todayPunches, setTodayPunches] = useState<PunchRecord[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDatePunches, setSelectedDatePunches] = useState<PunchRecord[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchTodayAttendance = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .eq('date', today)
      .maybeSingle();
    if (error) console.error('Error fetching today attendance:', error);
    else setTodayAttendance(data);
  };

  const fetchTodayPunches = async () => {
    if (!user?.id) return;
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;
    
    const { data, error } = await supabase
      .from('attendance_punches')
      .select('*')
      .eq('profile_id', user.id)
      .gte('punch_time', todayStart)
      .lte('punch_time', todayEnd)
      .order('punch_time', { ascending: true });
    
    if (error) console.error('Error fetching today punches:', error);
    else setTodayPunches(data || []);
  };

  const fetchAttendanceHistory = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    if (error) console.error('Error fetching attendance history:', error);
    else setAttendanceHistory(data || []);
  };

  const fetchPunchesForDate = async (date: Date) => {
    if (!user?.id) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;
    
    const { data, error } = await supabase
      .from('attendance_punches')
      .select('*')
      .eq('profile_id', user.id)
      .gte('punch_time', dayStart)
      .lte('punch_time', dayEnd)
      .order('punch_time', { ascending: true });
    
    if (error) console.error('Error fetching punches for date:', error);
    else setSelectedDatePunches(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTodayAttendance(), fetchTodayPunches(), fetchAttendanceHistory()]);
      setIsLoading(false);
    };
    if (user?.id) loadData();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && selectedDate) {
      fetchPunchesForDate(selectedDate);
    }
  }, [selectedDate, user?.id]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return format(new Date(isoString), 'hh:mm a');
  };

  const formatDateTime = (isoString: string) => {
    return format(new Date(isoString), 'hh:mm:ss a');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-green-500/10 text-green-600 border-green-200">Present</Badge>;
      case 'absent': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>;
      case 'half-day': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Half Day</Badge>;
      case 'leave': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">On Leave</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPunchTypeBadge = (type: string) => {
    return type === 'in' 
      ? <Badge className="bg-green-500/10 text-green-600 border-green-200">IN</Badge>
      : <Badge className="bg-red-500/10 text-red-600 border-red-200">OUT</Badge>;
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'card': return <Badge variant="outline" className="text-xs"><CreditCard className="h-3 w-3 mr-1" />Card</Badge>;
      case 'web': return <Badge variant="outline" className="text-xs">Web</Badge>;
      case 'mobile': return <Badge variant="outline" className="text-xs">Mobile</Badge>;
      case 'manual': return <Badge variant="outline" className="text-xs">Manual</Badge>;
      default: return <Badge variant="outline" className="text-xs">{source}</Badge>;
    }
  };

  const calculateTotalWorkHours = (punches: PunchRecord[]) => {
    let totalMinutes = 0;
    let lastInTime: Date | null = null;

    for (const punch of punches) {
      if (punch.punch_type === 'in') {
        lastInTime = new Date(punch.punch_time);
      } else if (punch.punch_type === 'out' && lastInTime) {
        const outTime = new Date(punch.punch_time);
        totalMinutes += (outTime.getTime() - lastInTime.getTime()) / (1000 * 60);
        lastInTime = null;
      }
    }

    // If still clocked in, add time until now
    if (lastInTime) {
      const now = new Date();
      totalMinutes += (now.getTime() - lastInTime.getTime()) / (1000 * 60);
    }

    return Math.round((totalMinutes / 60) * 100) / 100;
  };

  const getFirstIn = (punches: PunchRecord[]) => {
    const firstIn = punches.find(p => p.punch_type === 'in');
    return firstIn ? formatDateTime(firstIn.punch_time) : '--:--';
  };

  const getLastOut = (punches: PunchRecord[]) => {
    const outs = punches.filter(p => p.punch_type === 'out');
    return outs.length > 0 ? formatDateTime(outs[outs.length - 1].punch_time) : '--:--';
  };

  const isCurrentlyIn = todayPunches.length > 0 && todayPunches[todayPunches.length - 1].punch_type === 'in';

  const attendanceDates = attendanceHistory.map(a => new Date(a.date));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground">Track your daily attendance via card punch system</p>
      </div>

      <Tabs defaultValue="my-attendance">
        <TabsList>
          <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
          <TabsTrigger value="punch-history"><History className="mr-2 h-4 w-4" />Punch Log</TabsTrigger>
          {canViewTeamAttendance && <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>}
          {canViewTeamAttendance && <TabsTrigger value="reports"><FileSpreadsheet className="mr-2 h-4 w-4" />Reports</TabsTrigger>}
          {canManageSettings && <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />API Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-attendance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Today's Attendance</CardTitle>
                <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <LogIn className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-xs text-muted-foreground mb-1">First In</p>
                    <p className="text-lg font-bold">{getFirstIn(todayPunches)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <LogOut className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <p className="text-xs text-muted-foreground mb-1">Last Out</p>
                    <p className="text-lg font-bold">{getLastOut(todayPunches)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Timer className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-xs text-muted-foreground mb-1">Work Hours</p>
                    <p className="text-lg font-bold">{calculateTotalWorkHours(todayPunches)}h</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <CreditCard className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-xs text-muted-foreground mb-1">Punches</p>
                    <p className="text-lg font-bold">{todayPunches.length}</p>
                    {isCurrentlyIn && (
                      <Badge className="mt-1 bg-green-500/10 text-green-600">Currently In</Badge>
                    )}
                  </div>
                </div>

                {todayPunches.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Today's Punch Log</h4>
                    <div className="space-y-2">
                      {todayPunches.map((punch, index) => (
                        <div key={punch.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                            {getPunchTypeBadge(punch.punch_type)}
                            <span className="font-mono text-sm">{formatDateTime(punch.punch_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSourceBadge(punch.source)}
                            {punch.device_location && (
                              <span className="text-xs text-muted-foreground">{punch.device_location}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {todayPunches.length === 0 && (
                  <div className="mt-6 text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No punches recorded today</p>
                    <p className="text-sm">Use your card at the punch machine to record attendance</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />This Month</CardTitle></CardHeader>
              <CardContent>
                <Calendar 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={(date) => date && setSelectedDate(date)} 
                  modifiers={{ present: attendanceDates }} 
                  modifiersStyles={{ present: { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' } }} 
                  className="rounded-md border" 
                />
                
                {selectedDatePunches.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">{format(selectedDate, 'MMM d')} Punches</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedDatePunches.map((punch) => (
                        <div key={punch.id} className="flex items-center gap-2 text-sm">
                          {getPunchTypeBadge(punch.punch_type)}
                          <span className="font-mono">{formatDateTime(punch.punch_time)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total: {calculateTotalWorkHours(selectedDatePunches)}h
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Attendance History</CardTitle><CardDescription>Your last 30 days of attendance records</CardDescription></CardHeader>
            <CardContent>
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Clock className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No attendance records yet</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>First In</TableHead>
                      <TableHead>Last Out</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{format(new Date(record.date), 'EEE, MMM d')}</TableCell>
                        <TableCell>{formatTime(record.check_in)}</TableCell>
                        <TableCell>{formatTime(record.check_out)}</TableCell>
                        <TableCell>{record.work_hours ? `${record.work_hours}h` : '-'}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="punch-history" className="mt-6">
          <PunchHistoryTab userId={user?.id} />
        </TabsContent>

        {canViewTeamAttendance && <TabsContent value="team" className="mt-6"><TeamAttendanceView /></TabsContent>}
        {canViewTeamAttendance && <TabsContent value="reports" className="mt-6"><AttendanceReports /></TabsContent>}
        {canManageSettings && company && (
          <TabsContent value="settings" className="mt-6">
            <AttendanceSettings companyId={company.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Punch History Component
const PunchHistoryTab: React.FC<{ userId: string | undefined }> = ({ userId }) => {
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPunches = async () => {
      if (!userId) return;
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('attendance_punches')
        .select('*')
        .eq('profile_id', userId)
        .order('punch_time', { ascending: false })
        .limit(100);
      
      if (error) console.error('Error fetching punches:', error);
      else setPunches(data || []);
      setIsLoading(false);
    };
    
    fetchPunches();
  }, [userId]);

  const getPunchTypeBadge = (type: string) => {
    return type === 'in' 
      ? <Badge className="bg-green-500/10 text-green-600 border-green-200">IN</Badge>
      : <Badge className="bg-red-500/10 text-red-600 border-red-200">OUT</Badge>;
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'card': return <Badge variant="outline" className="text-xs"><CreditCard className="h-3 w-3 mr-1" />Card</Badge>;
      case 'web': return <Badge variant="outline" className="text-xs">Web</Badge>;
      case 'mobile': return <Badge variant="outline" className="text-xs">Mobile</Badge>;
      case 'manual': return <Badge variant="outline" className="text-xs">Manual</Badge>;
      default: return <Badge variant="outline" className="text-xs">{source}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Punch History</CardTitle>
        <CardDescription>Your last 100 punch records from the card system</CardDescription>
      </CardHeader>
      <CardContent>
        {punches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No punch records yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punches.map((punch) => (
                <TableRow key={punch.id}>
                  <TableCell className="font-medium">{format(new Date(punch.punch_time), 'EEE, MMM d')}</TableCell>
                  <TableCell className="font-mono">{format(new Date(punch.punch_time), 'hh:mm:ss a')}</TableCell>
                  <TableCell>{getPunchTypeBadge(punch.punch_type)}</TableCell>
                  <TableCell>{getSourceBadge(punch.source)}</TableCell>
                  <TableCell className="text-muted-foreground">{punch.device_location || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendancePage;