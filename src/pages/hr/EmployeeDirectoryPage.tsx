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
import { Search, Mail, Phone, MapPin, Building2, Calendar, Loader2, User, Briefcase, Pencil, FolderTree } from 'lucide-react';
import EmployeeProfileEditor from '@/components/hr/EmployeeProfileEditor';
import DepartmentManagement from '@/components/hr/DepartmentManagement';
import type { Tables } from '@/integrations/supabase/types';
type Profile = Tables<'profiles'>;

// Uses employee_directory view
interface EmployeeFromView {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  employee_category: string | null;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  designation: string | null;
  employee_id: string | null;
  work_location: string | null;
  date_of_joining: string | null;
}

// For dialog - uses employee_profile_complete view
interface EmployeeComplete extends EmployeeFromView {
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  employment_type: string | null;
  reporting_manager_id: string | null;
  reporting_manager_name: string | null;
  months_employed: number;
  years_employed: number;
}

const EmployeeDirectoryPage: React.FC = () => {
  const { company, departments } = useCompany();
  const { isCompanyAdmin, hasRole, hasPermission } = usePermissions();
  const canEditEmployees = isCompanyAdmin() || hasRole('HR') || hasRole('Hr manager') || hasPermission('hr.edit_employee');
  const [employees, setEmployees] = useState<EmployeeFromView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeComplete | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchEmployees = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      // Use employee_directory view - simplified listing
      const { data, error } = await supabase
        .from('employee_directory')
        .select('*')
        .eq('company_id', company.id)
        .order('full_name');

      if (error) throw error;
      setEmployees((data as EmployeeFromView[]) || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    // Use employee_profile_complete view for full details
    const { data, error } = await supabase
      .from('employee_profile_complete')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();

    if (!error && data) {
      setSelectedEmployee(data as EmployeeComplete);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchEmployees();
    }
  }, [company?.id]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Employee Directory</h1>
        <p className="text-sm sm:text-base text-muted-foreground">View and manage employee information</p>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">
            <User className="mr-2 h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="departments">
            <FolderTree className="mr-2 h-4 w-4" />
            Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
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
              {filteredEmployees.map((employee) => (
                  <Card
                    key={employee.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={async () => {
                      await fetchEmployeeDetails(employee.id);
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
                          <p className="text-sm text-muted-foreground truncate">{employee.designation || 'No designation'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {employee.department_name && (
                              <Badge variant="secondary" className="text-xs">
                                {employee.department_name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Full-time
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <DepartmentManagement />
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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
          {selectedEmployee && (
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
                      <p className="text-muted-foreground">{selectedEmployee.designation}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <span>{selectedEmployee.date_of_birth || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Gender</Label>
                      <span>{selectedEmployee.gender || 'Not provided'}</span>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-muted-foreground">Address</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedEmployee.address 
                            ? `${selectedEmployee.address}, ${selectedEmployee.city || ''}`
                            : 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="employment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Employee ID</Label>
                      <span>{selectedEmployee.employee_id || 'Not assigned'}</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Department</Label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.department_name || 'Not assigned'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Designation</Label>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.designation || 'Not assigned'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Employment Type</Label>
                      <Badge variant="secondary">{selectedEmployee.employment_type || 'Full-time'}</Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Date of Joining</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.date_of_joining || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Work Location</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.work_location || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Tenure</Label>
                      <span>{selectedEmployee.years_employed} years, {selectedEmployee.months_employed % 12} months</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Contact Name</Label>
                      <span>{selectedEmployee.emergency_contact_name || 'Not provided'}</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Contact Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.emergency_contact_phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      {selectedEmployee && (
        <EmployeeProfileEditor
          employee={{
            id: selectedEmployee.id,
            email: selectedEmployee.email,
            full_name: selectedEmployee.full_name,
            phone: selectedEmployee.phone,
            avatar_url: selectedEmployee.avatar_url,
            status: selectedEmployee.status as any,
            employee_category: selectedEmployee.employee_category as any,
            company_id: selectedEmployee.company_id,
            department_id: selectedEmployee.department_id,
            created_at: '',
            updated_at: '',
            activated_at: null,
            deactivated_at: null,
            invite_expires_at: null,
            invite_token: null,
            invited_by: null,
          }}
          employeeDetails={{
            profile_id: selectedEmployee.id,
            designation: selectedEmployee.designation,
            date_of_joining: selectedEmployee.date_of_joining,
            employment_type: selectedEmployee.employment_type,
            work_location: selectedEmployee.work_location,
            employee_id: selectedEmployee.employee_id,
            date_of_birth: selectedEmployee.date_of_birth,
            gender: selectedEmployee.gender,
            address: selectedEmployee.address,
            city: selectedEmployee.city,
            state: selectedEmployee.state,
            postal_code: selectedEmployee.postal_code,
            country: selectedEmployee.country,
            emergency_contact_name: selectedEmployee.emergency_contact_name,
            emergency_contact_phone: selectedEmployee.emergency_contact_phone,
            emergency_contact_relation: selectedEmployee.emergency_contact_relation,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={fetchEmployees}
        />
      )}
    </div>
  );
};

export default EmployeeDirectoryPage;
