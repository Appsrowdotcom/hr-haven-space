import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Search, Plus, MoreHorizontal, UserPlus, Mail, Loader2, Shield, UserX, UserCheck, Building2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Role = Tables<'roles'>;
type UserRole = Tables<'user_roles'>;

interface UserWithRoles extends Profile {
  user_roles: (UserRole & { role: Role })[];
}

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { company, departments } = useCompany();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    password: '',
    department_id: '',
  });
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (
            *,
            role:roles (*)
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as UserWithRoles[]) || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    if (!company?.id) return;
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error('Failed to fetch roles:', error);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchUsers();
      fetchRoles();
    }
  }, [company?.id]);

  const handleInviteUser = async () => {
    if (!company?.id || !user?.id) return;
    setSaving(true);
    try {
      // Get the current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the edge function to invite user
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          password: inviteForm.password,
          department_id: inviteForm.department_id || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('User created successfully. You can now share the credentials.');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', full_name: '', password: '', department_id: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite user');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId || !user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role_id: selectedRoleId,
          assigned_by: user.id,
        });

      if (error) throw error;
      toast.success('Role assigned successfully');
      setAssignRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoleId('');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (userId: string, userRoleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;
      toast.success('Role removed successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove role');
    }
  };

  const handleToggleUserStatus = async (userProfile: UserWithRoles) => {
    const newStatus = userProfile.status === 'active' ? 'deactivated' : 'active';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          ...(newStatus === 'deactivated' ? { deactivated_at: new Date().toISOString() } : { activated_at: new Date().toISOString(), deactivated_at: null }),
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case 'invited':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Invited</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Pending</Badge>;
      case 'deactivated':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Deactivated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage team members and their roles</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation to join your company
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> An invitation record will be created. The user will need to sign up with this email to complete registration.
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
                <p className="text-xs text-muted-foreground">Set a password that you can share with the user</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department (Optional)</Label>
                {departments.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md flex items-center justify-between">
                    <span>No departments created yet.</span>
                    <Link to="/admin/settings?tab=departments" className="text-primary hover:underline inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Create departments
                    </Link>
                  </div>
                ) : (
                  <Select
                    value={inviteForm.department_id}
                    onValueChange={(value) => setInviteForm({ ...inviteForm, department_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">No department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button onClick={handleInviteUser} disabled={saving || !inviteForm.email || !inviteForm.password || inviteForm.password.length < 6} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((userProfile) => (
                    <TableRow key={userProfile.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{userProfile.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userProfile.user_roles?.map((ur) => (
                            <Badge key={ur.id} variant="secondary" className="text-xs">
                              {ur.role?.name}
                            </Badge>
                          ))}
                          {(!userProfile.user_roles || userProfile.user_roles.length === 0) && (
                            <span className="text-sm text-muted-foreground">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(userProfile.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(userProfile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(userProfile);
                                setAssignRoleDialogOpen(true);
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Assign Role
                            </DropdownMenuItem>
                            {userProfile.user_roles?.map((ur) => (
                              <DropdownMenuItem
                                key={ur.id}
                                onClick={() => handleRemoveRole(userProfile.id, ur.id)}
                                className="text-destructive"
                              >
                                Remove {ur.role?.name}
                              </DropdownMenuItem>
                            ))}
                            {userProfile.id !== user?.id && (
                              <DropdownMenuItem
                                onClick={() => handleToggleUserStatus(userProfile)}
                              >
                                {userProfile.status === 'active' ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter(r => !selectedUser?.user_roles?.some(ur => ur.role_id === r.id))
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                        {role.is_system_role && ' (System)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssignRole} disabled={saving || !selectedRoleId} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
              Assign Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
