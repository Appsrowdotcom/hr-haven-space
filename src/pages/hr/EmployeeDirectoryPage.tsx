import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Mail, Phone, MapPin, Building2, Calendar, Loader2, User, Briefcase, Pencil } from 'lucide-react';
import EmployeeProfileEditor from '@/components/hr/EmployeeProfileEditor';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface EmployeeDetails {
  designation?: string | null;
  date_of_joining?: string | null;
  employment_type?: string | null;
  work_location?: string | null;
  employee_id?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

interface EmployeeWithDetails extends Profile {
  department?: { name: string }[] | null;
  employee_details?: EmployeeDetails[] | null;
}

// Helper to get first item from joined array
const getDetails = (details: EmployeeDetails[] | null | undefined): EmployeeDetails | null => {
  return details && details.length > 0 ? details[0] : null;
};

const getDepartment = (dept: { name: string }[] | null | undefined): { name: string } | null => {
  return dept && dept.length > 0 ? dept[0] : null;
};

const EmployeeDirectoryPage: React.FC = () => {
  const { company, departments } = useCompany();
  const { isCompanyAdmin, hasRole, hasPermission } = usePermissions();
  const canEditEmployees = isCompanyAdmin() || hasRole('HR') || hasRole('Hr manager') || hasPermission('hr.edit_employee');
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchEmployees = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments!profiles_department_id_fkey(name),
          employee_details(*)
        `)
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setEmployees((data as unknown as EmployeeWithDetails[]) || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchEmployees();
    }
  }, [company?.id]);

  const filteredEmployees = employees.filter(emp => {
    const details = getDetails(emp.employee_details);
    const matchesSearch = 
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      details?.designation?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || emp.department_id === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employee Directory</h1>
        <p className="text-muted-foreground">View and manage employee information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employees found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee) => {
                const details = getDetails(employee.employee_details);
                const dept = getDepartment(employee.department);
                return (
                  <Card
                    key={employee.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setDetailsOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{employee.full_name || 'No name'}</h3>
                          <p className="text-sm text-muted-foreground truncate">{details?.designation || 'No designation'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {dept && (
                              <Badge variant="secondary" className="text-xs">
                                {dept.name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {details?.employment_type || 'Full-time'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Employee Details</DialogTitle>
              {canEditEmployees && selectedEmployee && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailsOpen(false);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedEmployee && (() => {
            const details = getDetails(selectedEmployee.employee_details);
            const dept = getDepartment(selectedEmployee.department);
            return (
              <Tabs defaultValue="personal" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">{getInitials(selectedEmployee.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{selectedEmployee.full_name}</h3>
                      <p className="text-muted-foreground">{details?.designation}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.email}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.phone || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Date of Birth</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{details?.date_of_birth || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Gender</Label>
                      <span>{details?.gender || 'Not provided'}</span>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-muted-foreground">Address</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {details?.address 
                            ? `${details.address}, ${details.city || ''}`
                            : 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="employment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Employee ID</Label>
                      <span>{details?.employee_id || 'Not assigned'}</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Department</Label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{dept?.name || 'Not assigned'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Designation</Label>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{details?.designation || 'Not assigned'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Employment Type</Label>
                      <Badge variant="secondary">{details?.employment_type || 'Full-time'}</Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Date of Joining</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{details?.date_of_joining || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Work Location</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{details?.work_location || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Contact Name</Label>
                      <span>{details?.emergency_contact_name || 'Not provided'}</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Contact Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{details?.emergency_contact_phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      {selectedEmployee && (
        <EmployeeProfileEditor
          employee={selectedEmployee}
          employeeDetails={getDetails(selectedEmployee.employee_details) ? { 
            ...getDetails(selectedEmployee.employee_details)!, 
            profile_id: selectedEmployee.id 
          } : null}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={fetchEmployees}
        />
      )}
    </div>
  );
};

export default EmployeeDirectoryPage;
