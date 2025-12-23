import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Loader2, Clock, LogIn, LogOut, Timer, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string;
  notes: string | null;
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchTodayAttendance = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .eq('date', today)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching today attendance:', error);
    } else {
      setTodayAttendance(data);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    
    if (error) {
      console.error('Error fetching attendance history:', error);
    } else {
      setAttendanceHistory(data || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTodayAttendance(), fetchAttendanceHistory()]);
      setIsLoading(false);
    };
    
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const handleCheckIn = async () => {
    if (!user?.id) return;
    
    setIsCheckingIn(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('attendance')
        .upsert({
          profile_id: user.id,
          date: today,
          check_in: now,
          status: 'present',
        }, {
          onConflict: 'profile_id,date'
        });

      if (error) throw error;
      
      toast.success('Checked in successfully!');
      fetchTodayAttendance();
      fetchAttendanceHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.id || !todayAttendance) return;
    
    setIsCheckingOut(true);
    try {
      const now = new Date();
      const checkInTime = new Date(todayAttendance.check_in!);
      const workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: now.toISOString(),
          work_hours: Math.round(workHours * 100) / 100,
        })
        .eq('id', todayAttendance.id);

      if (error) throw error;
      
      toast.success('Checked out successfully!');
      fetchTodayAttendance();
      fetchAttendanceHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to check out');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return format(new Date(isoString), 'hh:mm a');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Present</Badge>;
      case 'absent':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>;
      case 'half-day':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Half Day</Badge>;
      case 'leave':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">On Leave</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const attendanceDates = attendanceHistory.map(a => new Date(a.date));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground">Track your daily attendance and work hours</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Status Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Check In */}
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <LogIn className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-muted-foreground mb-1">Check In</p>
                <p className="text-2xl font-bold">
                  {todayAttendance?.check_in ? formatTime(todayAttendance.check_in) : '--:--'}
                </p>
                {!todayAttendance?.check_in && (
                  <Button onClick={handleCheckIn} disabled={isCheckingIn} className="mt-4" size="sm">
                    {isCheckingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check In'}
                  </Button>
                )}
              </div>

              {/* Check Out */}
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <LogOut className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="text-sm text-muted-foreground mb-1">Check Out</p>
                <p className="text-2xl font-bold">
                  {todayAttendance?.check_out ? formatTime(todayAttendance.check_out) : '--:--'}
                </p>
                {todayAttendance?.check_in && !todayAttendance?.check_out && (
                  <Button onClick={handleCheckOut} disabled={isCheckingOut} className="mt-4" size="sm" variant="secondary">
                    {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Out'}
                  </Button>
                )}
              </div>

              {/* Work Hours */}
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <Timer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-muted-foreground mb-1">Work Hours</p>
                <p className="text-2xl font-bold">
                  {todayAttendance?.work_hours ? `${todayAttendance.work_hours}h` : '0h'}
                </p>
                {todayAttendance?.status && (
                  <div className="mt-4">
                    {getStatusBadge(todayAttendance.status)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                present: attendanceDates,
              }}
              modifiersStyles={{
                present: { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Your last 30 days of attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
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
    </div>
  );
};

export default AttendancePage;
