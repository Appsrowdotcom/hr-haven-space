import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Download, FileSpreadsheet, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';

interface AttendanceSummary {
  profile_id: string;
  full_name: string;
  department_name: string | null;
  total_present: number;
  total_absent: number;
  total_half_day: number;
  total_leave: number;
  avg_work_hours: number;
  late_arrivals: number;
}

const AttendanceReports: React.FC = () => {
  const { company, departments } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<AttendanceSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [stats, setStats] = useState({
    avgAttendance: 0,
    totalWorkHours: 0,
    lateArrivalsPercent: 0,
    perfectAttendance: 0,
  });

  const fetchReport = async () => {
    if (!company?.id) return;
    setIsLoading(true);

    try {
      const [year, month] = selectedMonth.split('-');
      const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const monthEnd = endOfMonth(monthStart);

      // Calculate working days in month (excluding weekends)
      const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
        .filter(d => !isWeekend(d)).length;

      // Use attendance_monthly_summary view for aggregated data
      let summaryQuery = supabase
        .from('attendance_monthly_summary')
        .select('*')
        .eq('company_id', company.id)
        .eq('year', parseInt(year))
        .eq('month', parseInt(month));

      if (selectedDepartment !== 'all') {
        summaryQuery = summaryQuery.eq('department_id', selectedDepartment);
      }

      const { data: monthlySummary, error: summaryError } = await summaryQuery;
      if (summaryError) throw summaryError;

      // Get late arrivals from attendance_daily view
      let dailyQuery = supabase
        .from('attendance_daily')
        .select('profile_id, is_late')
        .eq('company_id', company.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('is_late', true);

      if (selectedDepartment !== 'all') {
        dailyQuery = dailyQuery.eq('department_id', selectedDepartment);
      }

      const { data: lateData } = await dailyQuery;

      // Calculate late arrivals per employee
      const lateByEmployee = (lateData || []).reduce((acc, record) => {
        acc[record.profile_id] = (acc[record.profile_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build summary for each employee
      const summaries: AttendanceSummary[] = (monthlySummary || []).map(row => {
        const present = Number(row.days_present) || 0;
        const halfDay = Number(row.days_half) || 0;
        const leave = Number(row.days_on_leave) || 0;
        const absent = Math.max(0, workingDays - present - halfDay - leave);

        return {
          profile_id: row.profile_id,
          full_name: row.employee_name || 'Unknown',
          department_name: row.department_name || null,
          total_present: present,
          total_absent: absent,
          total_half_day: halfDay,
          total_leave: leave,
          avg_work_hours: Math.round(Number(row.avg_work_hours) * 10) / 10,
          late_arrivals: lateByEmployee[row.profile_id] || 0,
        };
      });

      setSummaryData(summaries);

      // Calculate overall stats
      const totalEmployees = summaries.length;
      if (totalEmployees > 0) {
        const avgAttendance = summaries.reduce((sum, s) => sum + s.total_present, 0) / (workingDays * totalEmployees) * 100;
        const totalHours = summaries.reduce((sum, s) => sum + s.avg_work_hours * s.total_present, 0);
        const totalLate = summaries.reduce((sum, s) => sum + s.late_arrivals, 0);
        const totalPresent = summaries.reduce((sum, s) => sum + s.total_present, 0);
        const perfectCount = summaries.filter(s => s.total_absent === 0 && s.late_arrivals === 0).length;

        setStats({
          avgAttendance: Math.round(avgAttendance),
          totalWorkHours: Math.round(totalHours),
          lateArrivalsPercent: totalPresent > 0 ? Math.round((totalLate / totalPresent) * 100) : 0,
          perfectAttendance: perfectCount,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchReport();
    }
  }, [company?.id, selectedMonth, selectedDepartment]);

  const exportToCSV = () => {
    if (summaryData.length === 0) return;

    const headers = ['Name', 'Department', 'Present', 'Absent', 'Half Day', 'Leave', 'Avg Hours', 'Late Arrivals'];
    const rows = summaryData.map(s => [
      s.full_name,
      s.department_name || '-',
      s.total_present,
      s.total_absent,
      s.total_half_day,
      s.total_leave,
      s.avg_work_hours,
      s.late_arrivals,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
      });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportToCSV} disabled={summaryData.length === 0} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold">{stats.avgAttendance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Work Hours</p>
                <p className="text-2xl font-bold">{stats.totalWorkHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Late Arrivals</p>
                <p className="text-2xl font-bold">{stats.lateArrivalsPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perfect Attendance</p>
                <p className="text-2xl font-bold">{stats.perfectAttendance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Attendance Summary
          </CardTitle>
          <CardDescription>
            Monthly attendance report for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : summaryData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employee data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Half Day</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Leave</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Avg Hours</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((row) => (
                  <TableRow key={row.profile_id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.department_name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-500/10 text-green-600 border-green-200">{row.total_present}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.total_absent > 0 ? (
                        <Badge className="bg-destructive/10 text-destructive">{row.total_absent}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {row.total_half_day > 0 ? (
                        <Badge className="bg-amber-500/10 text-amber-600">{row.total_half_day}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {row.total_leave > 0 ? (
                        <Badge className="bg-blue-500/10 text-blue-600">{row.total_leave}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{row.avg_work_hours}h</TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {row.late_arrivals > 0 ? (
                        <Badge variant="outline" className="text-amber-600">{row.late_arrivals}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceReports;
