import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';

interface LeaveEvent {
  id: string;
  profile_id: string;
  employee_name: string;
  leave_type: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface LeaveTypeInfo {
  id: string;
  name: string;
  is_paid: boolean;
}

// Generate consistent colors based on leave type index
const COLOR_PALETTE = [
  'bg-blue-500',
  'bg-red-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
];

const LeaveCalendarView: React.FC = () => {
  const { company, departments } = useCompany();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [leaveEvents, setLeaveEvents] = useState<LeaveEvent[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Fetch leave types for color mapping and legend
  const fetchLeaveTypes = async () => {
    if (!company?.id) return;
    const { data, error } = await supabase
      .from('leave_types')
      .select('id, name, is_paid')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('name');
    
    if (!error && data) {
      setLeaveTypes(data);
    }
  };

  const fetchLeaveEvents = async () => {
    if (!company?.id) return;
    setIsLoading(true);

    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Get approved leave requests for the month
      let query = supabase
        .from('leave_requests')
        .select(`
          id,
          profile_id,
          leave_type_id,
          start_date,
          end_date,
          status,
          leave_type:leave_types(id, name),
          profile:profiles!leave_requests_profile_id_fkey(full_name, department_id)
        `)
        .eq('status', 'approved')
        .or(`start_date.lte.${format(monthEnd, 'yyyy-MM-dd')},end_date.gte.${format(monthStart, 'yyyy-MM-dd')}`);

      const { data, error } = await query;
      if (error) throw error;

      // Filter by department if selected
      const events: LeaveEvent[] = (data || [])
        .filter(r => {
          if (selectedDepartment === 'all') return true;
          const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile;
          return profile?.department_id === selectedDepartment;
        })
        .map(r => {
          const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile;
          const leaveType = Array.isArray(r.leave_type) ? r.leave_type[0] : r.leave_type;
          return {
            id: r.id,
            profile_id: r.profile_id,
            employee_name: profile?.full_name || 'Unknown',
            leave_type: leaveType?.name || 'Leave',
            leave_type_id: r.leave_type_id,
            start_date: r.start_date,
            end_date: r.end_date,
            status: r.status,
          };
        });

      setLeaveEvents(events);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch leave data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchLeaveTypes();
    }
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      fetchLeaveEvents();
    }
  }, [company?.id, currentMonth, selectedDepartment]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date): LeaveEvent[] => {
    return leaveEvents.filter(event => {
      const start = parseISO(event.start_date);
      const end = parseISO(event.end_date);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Sunday
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Dynamic color mapping based on leave type index
  const leaveTypeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    leaveTypes.forEach((lt, index) => {
      map[lt.id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return map;
  }, [leaveTypes]);

  const getLeaveColor = (leaveTypeId: string) => {
    return leaveTypeColorMap[leaveTypeId] || 'bg-primary';
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[180px]">
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3">
            <CardContent className="p-4">
              {/* Week Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Padding for start of month */}
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="h-24 bg-muted/30 rounded-md" />
                ))}
                {/* Actual days */}
                {calendarDays.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`h-24 p-1 rounded-md border cursor-pointer transition-colors overflow-hidden ${
                        isToday(day) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate text-white ${getLeaveColor(event.leave_type_id)}`}
                            title={`${event.employee_name} - ${event.leave_type}`}
                          >
                            {event.employee_name.split(' ')[0]}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Selected Day Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Select a day'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDay ? (
                  (() => {
                    const events = getEventsForDay(selectedDay);
                    return events.length > 0 ? (
                      <div className="space-y-3">
                        {events.map(event => (
                          <div key={event.id} className="p-2 border rounded-lg">
                            <p className="font-medium text-sm">{event.employee_name}</p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {event.leave_type}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(event.start_date), 'MMM d')} - {format(parseISO(event.end_date), 'MMM d')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No leave scheduled</p>
                    );
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground">Click on a day to see details</p>
                )}
              </CardContent>
            </Card>

            {/* Dynamic Legend from leave types */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                {leaveTypes.length > 0 ? (
                  <div className="space-y-2">
                    {leaveTypes.map((lt, index) => (
                      <div key={lt.id} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${COLOR_PALETTE[index % COLOR_PALETTE.length]}`} />
                        <span className="text-sm">{lt.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No leave types configured</p>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{leaveEvents.length}</p>
                <p className="text-sm text-muted-foreground">approved leave requests</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendarView;
