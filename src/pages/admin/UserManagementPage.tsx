import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
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
import { Search, Plus, MoreHorizontal, UserPlus, Mail, Loader2, Shield, UserX, UserCheck, Building2, MessageCircle, Send, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Tables } from '@/integrations/supabase/types';
import { userInviteSchema, getValidationError } from '@/lib/validations';

type Profile = Tables<'profiles'>;
type Role = Tables<'roles'>;
type UserRole = Tables<'user_roles'>;

interface UserWithRoles extends Profile {
  user_roles: (UserRole & { role: Role })[];
}

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { company, departments } = useCompany();
  const { refreshPermissions } = usePermissions();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    password: '',
    department_id: '',
    phone: '',
  });
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{email: string; password: string; full_name: string; phone: string} | null>(null);
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'copy'>('email');
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles!user_roles_user_id_fkey (
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
        .select('id, name, description, is_active, is_system_role, created_at, company_id, created_by, updated_at')
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
    
    // Validate form with Zod schema
    const validationResult = userInviteSchema.safeParse(inviteForm);
    const validationError = getValidationError(validationResult);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setSaving(true);
    try {
      // Get the current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the edge function to invite user
      console.log('Invoking invite-user edge function...');
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteForm.email.trim(),
          full_name: inviteForm.full_name.trim(),
          password: inviteForm.password,
          department_id: inviteForm.department_id || null,
        },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to connect to server. Check if edge functions are running.');
      }
      if (data?.error) throw new Error(data.error);

      // Store credentials for sharing
      setCreatedUserCredentials({
        email: inviteForm.email.trim(),
        password: inviteForm.password,
        full_name: inviteForm.full_name.trim(),
        phone: inviteForm.phone,
      });
      
      toast.success('User created successfully!');
      setInviteDialogOpen(false);
      setCredentialsDialogOpen(true);
      setInviteForm({ email: '', full_name: '', password: '', department_id: '', phone: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite user');
    } finally {
      setSaving(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!createdUserCredentials) return;
    
    if (sendMethod === 'copy') {
      const text = `Login Credentials for ${company?.name || 'HRMS'}\n\nEmail: ${createdUserCredentials.email}\nPassword: ${createdUserCredentials.password}\n\nLogin URL: ${window.location.origin}/auth`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Credentials copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    
    if (sendMethod === 'whatsapp' && !createdUserCredentials.phone) {
      toast.error('Phone number is required for WhatsApp');
      return;
    }
    
    setSendingCredentials(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-credentials', {
        body: {
          email: createdUserCredentials.email,
          full_name: createdUserCredentials.full_name,
          password: createdUserCredentials.password,
          phone: createdUserCredentials.phone,
          method: sendMethod,
          company_name: company?.name,
          login_url: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (sendMethod === 'whatsapp' && data?.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
        toast.success('WhatsApp opened with credentials message');
      } else {
        toast.success('Credentials sent via email!');
      }
      
      setCredentialsDialogOpen(false);
      setCreatedUserCredentials(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send credentials');
    } finally {
      setSendingCredentials(false);
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
      toast.success('Role assigned successfully. The user needs to refresh their browser to see changes.');
      setAssignRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoleId('');
      fetchUsers();
      // Refresh current user's permissions in case they're the one being updated
      await refreshPermissions();
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
      toast.success('Role removed successfully. The user needs to refresh their browser to see changes.');
      fetchUsers();
      // Refresh current user's permissions in case they're the one being updated
      await refreshPermissions();
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userToDelete.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
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
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
         <div>
           <h1 className="text-xl sm:text-2xl font-bold text-foreground">User Management</h1>
           <p className="text-muted-foreground">Manage team members and their roles</p>
         </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
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
                  placeholder="At least 12 characters"
                />
                <p className="text-xs text-muted-foreground">
                  Must include uppercase, lowercase, number, and special character
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional - for WhatsApp)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code for WhatsApp sharing
                </p>
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
              <Button onClick={handleInviteUser} disabled={saving || !inviteForm.email || !inviteForm.password || !inviteForm.full_name} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credentials Sharing Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Share Credentials
            </DialogTitle>
            <DialogDescription>
              Choose how to share login credentials with {createdUserCredentials?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {createdUserCredentials && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="font-medium">{createdUserCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Password:</span>
                  <span className="font-mono text-sm">{createdUserCredentials.password}</span>
                </div>
              </div>

              <RadioGroup value={sendMethod} onValueChange={(v) => setSendMethod(v as 'email' | 'whatsapp' | 'copy')} className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="email" id="email-method" />
                  <Label htmlFor="email-method" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Send via Email</p>
                      <p className="text-xs text-muted-foreground">Send credentials to {createdUserCredentials.email}</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="whatsapp" id="whatsapp-method" />
                  <Label htmlFor="whatsapp-method" className="flex items-center gap-2 cursor-pointer flex-1">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">Send via WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        {createdUserCredentials.phone ? `Send to ${createdUserCredentials.phone}` : 'Phone number not provided'}
                      </p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="copy" id="copy-method" />
                  <Label htmlFor="copy-method" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Copy className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Copy to Clipboard</p>
                      <p className="text-xs text-muted-foreground">Copy credentials and share manually</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSendCredentials} 
                  disabled={sendingCredentials || (sendMethod === 'whatsapp' && !createdUserCredentials.phone)}
                  className="flex-1"
                >
                  {sendingCredentials ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : sendMethod === 'copy' ? (
                    copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />
                  ) : sendMethod === 'whatsapp' ? (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {sendMethod === 'copy' ? (copied ? 'Copied!' : 'Copy Credentials') : 
                   sendMethod === 'whatsapp' ? 'Open WhatsApp' : 'Send Email'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setCredentialsDialogOpen(false);
                  setCreatedUserCredentials(null);
                }}>
                  Skip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
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
                      <TableCell className="hidden sm:table-cell">
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
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(userProfile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
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
                              <>
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    setUserToDelete(userProfile);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
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

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. All user data, roles, and associated records will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementPage;
