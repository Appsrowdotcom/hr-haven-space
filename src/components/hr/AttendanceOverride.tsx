import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Edit2, Search, History, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  profile_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface OverrideRecord {
  id: string;
  attendance_id: string;
  original_status: string;
  new_status: string;
  reason: string;
  created_at: string;
  overrider: {
    full_name: string | null;
    email: string;
  };
  employee: {
    full_name: string | null;
    email: string;
  };
}

const AttendanceOverride: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overrideHistory, setOverrideHistory] = useState<OverrideRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'history'>('records');

  const [overrideForm, setOverrideForm] = useState({
    new_status: '',
    new_check_in: '',
    new_check_out: '',
    new_work_hours: '',
    reason: '',
  });

  useEffect(() => {
    if (company?.id) {
      fetchAttendance();
      fetchOverrideHistory();
    }
  }, [company?.id, selectedDate]);

  const fetchAttendance = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles!inner(full_name, email, company_id)
        `)
        .eq('profiles.company_id', company.id)
        .eq('date', selectedDate)
        .order('check_in', { ascending: true });

      if (error) throw error;
      setAttendance((data || []) as unknown as AttendanceRecord[]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverrideHistory = async () => {
    if (!company?.id) return;
    try {
      const { data, error } = await supabase
        .from('attendance_overrides')
        .select(`
          id,
          attendance_id,
          original_status,
          new_status,
          reason,
          created_at,
          overridden_by,
          profile_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user details for each override
      const overrides = data || [];
      const profileIds = [...new Set([
        ...overrides.map(o => o.overridden_by),
        ...overrides.map(o => o.profile_id)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_id')
        .in('id', profileIds)
        .eq('company_id', company.id);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      const enrichedOverrides = overrides
        .filter(o => profileMap[o.profile_id]) // Only show overrides for this company
        .map(o => ({
          ...o,
          overrider: profileMap[o.overridden_by] || { full_name: 'Unknown', email: '' },
          employee: profileMap[o.profile_id] || { full_name: 'Unknown', email: '' },
        }));

      setOverrideHistory(enrichedOverrides as OverrideRecord[]);
    } catch (error: any) {
      console.error('Failed to fetch override history:', error);
    }
  };

  const handleOpenOverride = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setOverrideForm({
      new_status: record.status,
      new_check_in: record.check_in ? format(new Date(record.check_in), "HH:mm") : '',
      new_check_out: record.check_out ? format(new Date(record.check_out), "HH:mm") : '',
      new_work_hours: record.work_hours?.toString() || '',
      reason: '',
    });
    setIsOverrideDialogOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!selectedRecord || !user?.id || !overrideForm.reason.trim()) {
      toast.error('Please provide a reason for this override');
      return;
    }

    setIsSaving(true);
    try {
      // Create override record
      const { error: overrideError } = await supabase
        .from('attendance_overrides')
        .insert({
          attendance_id: selectedRecord.id,
          profile_id: selectedRecord.profile_id,
          original_status: selectedRecord.status,
          new_status: overrideForm.new_status,
          original_check_in: selectedRecord.check_in,
          new_check_in: overrideForm.new_check_in 
            ? `${selectedRecord.date}T${overrideForm.new_check_in}:00` 
            : null,
          original_check_out: selectedRecord.check_out,
          new_check_out: overrideForm.new_check_out 
            ? `${selectedRecord.date}T${overrideForm.new_check_out}:00` 
            : null,
          original_work_hours: selectedRecord.work_hours,
          new_work_hours: overrideForm.new_work_hours ? parseFloat(overrideForm.new_work_hours) : null,
          reason: overrideForm.reason,
          overridden_by: user.id,
        });

      if (overrideError) throw overrideError;

      // Update the actual attendance record
      const updateData: Record<string, any> = {
        status: overrideForm.new_status,
        notes: `Override: ${overrideForm.reason}`,
      };

      if (overrideForm.new_check_in) {
        updateData.check_in = `${selectedRecord.date}T${overrideForm.new_check_in}:00`;
      }
      if (overrideForm.new_check_out) {
        updateData.check_out = `${selectedRecord.date}T${overrideForm.new_check_out}:00`;
      }
      if (overrideForm.new_work_hours) {
        updateData.work_hours = parseFloat(overrideForm.new_work_hours);
      }

      const { error: updateError } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', selectedRecord.id);

      if (updateError) throw updateError;

      toast.success('Attendance record updated successfully');
      setIsOverrideDialogOpen(false);
      fetchAttendance();
      fetchOverrideHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save override');
    } finally {
      setIsSaving(false);
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

  const filteredAttendance = attendance.filter(record =>
    record.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.profiles.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
        <Button 
          variant={activeTab === 'records' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('records')}
          className="flex-1 sm:flex-none"
        >
          <Edit2 className="mr-2 h-4 w-4" />
          Override Records
        </Button>
        <Button 
          variant={activeTab === 'history' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('history')}
          className="flex-1 sm:flex-none"
        >
          <History className="mr-2 h-4 w-4" />
          Override History
        </Button>
      </div>

      {activeTab === 'records' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Override Attendance
            </CardTitle>
            <CardDescription>Manually modify attendance records with audit logging</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto"
              />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Edit2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records for {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead className="hidden sm:table-cell">Check Out</TableHead>
                    <TableHead className="hidden sm:table-cell">Work Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.profiles.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground hidden sm:block">{record.profiles.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(record.check_in)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatTime(record.check_out)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{record.work_hours ? `${record.work_hours}h` : '-'}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOverride(record)}
                        >
                          <Edit2 className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Override</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Override History
            </CardTitle>
            <CardDescription>Audit log of all attendance modifications</CardDescription>
          </CardHeader>
          <CardContent>
            {overrideHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No override history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead className="hidden sm:table-cell">Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Overridden By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrideHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(record.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{record.employee.full_name || record.employee.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(record.original_status)}
                          <span className="text-muted-foreground">→</span>
                          {getStatusBadge(record.new_status)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate">{record.reason}</TableCell>
                      <TableCell className="hidden sm:table-cell">{record.overrider.full_name || record.overrider.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Override Attendance Record</DialogTitle>
            <DialogDescription>
              Modify attendance for {selectedRecord?.profiles.full_name || 'Employee'} on{' '}
              {selectedRecord?.date ? format(new Date(selectedRecord.date), 'MMMM d, yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={overrideForm.new_status}
                onValueChange={(value) => setOverrideForm({ ...overrideForm, new_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check In Time</Label>
                <Input
                  type="time"
                  value={overrideForm.new_check_in}
                  onChange={(e) => setOverrideForm({ ...overrideForm, new_check_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check Out Time</Label>
                <Input
                  type="time"
                  value={overrideForm.new_check_out}
                  onChange={(e) => setOverrideForm({ ...overrideForm, new_check_out: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={overrideForm.new_work_hours}
                onChange={(e) => setOverrideForm({ ...overrideForm, new_work_hours: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Override *</Label>
              <Textarea
                placeholder="Explain why this record is being modified..."
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOverride} disabled={isSaving || !overrideForm.reason.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceOverride;
