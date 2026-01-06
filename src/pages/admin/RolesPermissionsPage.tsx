import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Plus, Shield, Loader2, Save, Trash2, Edit2, Check, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { roleSchema, getValidationError } from '@/lib/validations';

type Role = Tables<'roles'>;
type Permission = Tables<'permissions'>;
type RolePermission = Tables<'role_permissions'>;

interface RoleWithPermissions extends Role {
  role_permissions: (RolePermission & { permission: Permission })[];
}

const RolesPermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { refreshPermissions } = usePermissions();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const fetchRoles = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            *,
            permission:permissions (*)
          )
        `)
        .eq('company_id', company.id)
        .order('is_system_role', { ascending: false })
        .order('name');

      if (error) throw error;
      setRoles((data as RoleWithPermissions[]) || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('id, code, name, description, category, module, is_sensitive, created_at')
        .order('module')
        .order('category')
        .order('name');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchRoles();
      fetchPermissions();
    }
  }, [company?.id]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      const key = perm.module;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  const handleCreateRole = async () => {
    if (!company?.id || !user?.id) return;
    
    // Validate form with Zod schema
    const validationResult = roleSchema.safeParse(roleForm);
    const validationError = getValidationError(validationResult);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setSaving(true);
    try {
      // Create role
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
          company_id: company.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Add permissions
      if (selectedPermissions.size > 0) {
        const permissionInserts = Array.from(selectedPermissions).map(permId => ({
          role_id: newRole.id,
          permission_id: permId,
          granted_by: user.id,
        }));

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissionInserts);

        if (permError) throw permError;
      }

      toast.success('Role created successfully. Users with this role need to refresh their browser to see changes.');
      setCreateDialogOpen(false);
      setRoleForm({ name: '', description: '' });
      setSelectedPermissions(new Set());
      fetchRoles();
      // Refresh current user's permissions in case they're affected
      await refreshPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = (role: RoleWithPermissions) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
    });
    setSelectedPermissions(new Set(role.role_permissions.map(rp => rp.permission_id)));
    // Auto-expand modules that have permissions selected
    const modulesWithPermissions = role.role_permissions.map(rp => rp.permission?.module).filter(Boolean) as string[];
    setOpenAccordions([...new Set(modulesWithPermissions)]);
  };

  const handleCloseDialog = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setSelectedPermissions(new Set());
    setOpenAccordions([]);
  };

  const handleCloseCreateDialog = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setRoleForm({ name: '', description: '' });
      setSelectedPermissions(new Set());
      setOpenAccordions([]);
    }
  };

  const expandAllAccordions = () => {
    setOpenAccordions(Object.keys(groupedPermissions));
  };

  const collapseAllAccordions = () => {
    setOpenAccordions([]);
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !user?.id) return;
    
    // Validate form with Zod schema
    const validationResult = roleSchema.safeParse(roleForm);
    const validationError = getValidationError(validationResult);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setSaving(true);
    try {
      // Update role details
      const { error: roleError } = await supabase
        .from('roles')
        .update({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
        })
        .eq('id', editingRole.id);

      if (roleError) throw roleError;

      // Get current permissions
      const currentPermIds = new Set(editingRole.role_permissions.map(rp => rp.permission_id));
      
      // Permissions to add
      const toAdd = Array.from(selectedPermissions).filter(id => !currentPermIds.has(id));
      
      // Permissions to remove
      const toRemove = Array.from(currentPermIds).filter(id => !selectedPermissions.has(id));

      // Add new permissions
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('role_permissions')
          .insert(toAdd.map(permId => ({
            role_id: editingRole.id,
            permission_id: permId,
            granted_by: user.id,
          })));

        if (addError) throw addError;
      }

      // Remove old permissions
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', editingRole.id)
          .in('permission_id', toRemove);

        if (removeError) throw removeError;
      }

      toast.success('Role updated successfully. Users with this role need to refresh their browser to see changes.');
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
      setSelectedPermissions(new Set());
      fetchRoles();
      // Refresh current user's permissions in case they're affected
      await refreshPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete role');
    }
  };

  const togglePermission = useCallback((permId: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permId)) {
        newSet.delete(permId);
      } else {
        newSet.add(permId);
      }
      return newSet;
    });
  }, []);

  const toggleAllModulePermissions = useCallback((module: string, perms: Permission[]) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      const allSelected = perms.every(p => newSet.has(p.id));
      
      if (allSelected) {
        // Deselect all
        perms.forEach(p => newSet.delete(p.id));
      } else {
        // Select all
        perms.forEach(p => newSet.add(p.id));
      }
      return newSet;
    });
  }, []);

  const PermissionSelector = React.memo(() => (
    <Accordion 
      type="multiple" 
      value={openAccordions}
      onValueChange={setOpenAccordions}
      className="w-full"
    >
      {Object.entries(groupedPermissions).map(([module, perms]) => {
        const selectedCount = perms.filter(p => selectedPermissions.has(p.id)).length;
        const allSelected = selectedCount === perms.length;
        const someSelected = selectedCount > 0 && !allSelected;
        
        return (
          <AccordionItem key={module} value={module}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Badge variant="outline" className="capitalize">
                  {module.replace(/_/g, ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({selectedCount}/{perms.length})
                </span>
                {allSelected && (
                  <Badge variant="default" className="text-xs ml-auto mr-2">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-2">
                {/* Select All for this module */}
                <div className="flex items-center gap-3 py-2 border-b mb-2">
                  <Checkbox
                    id={`select-all-${module}`}
                    checked={allSelected}
                    ref={(el) => {
                      if (el && someSelected) {
                        el.dataset.state = 'indeterminate';
                      }
                    }}
                    onCheckedChange={() => toggleAllModulePermissions(module, perms)}
                  />
                  <label
                    htmlFor={`select-all-${module}`}
                    className="text-sm font-medium cursor-pointer text-primary"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </label>
                </div>
                
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-start gap-3 py-1">
                    <Checkbox
                      id={perm.id}
                      checked={selectedPermissions.has(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={perm.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {perm.name}
                      </label>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      )}
                      {perm.is_sensitive && (
                        <Badge variant="destructive" className="text-xs mt-1">Sensitive</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  ));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">Define roles and assign permissions</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., HR Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe this role's purpose..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={expandAllAccordions}>
                      Expand All
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={collapseAllAccordions}>
                      Collapse All
                    </Button>
                  </div>
                </div>
                <PermissionSelector />
              </div>
              <Button onClick={handleCreateRole} disabled={saving || !roleForm.name} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Create Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Modify role details and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                disabled={editingRole?.is_system_role}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={expandAllAccordions}>
                    Expand All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={collapseAllAccordions}>
                    Collapse All
                  </Button>
                </div>
              </div>
              <PermissionSelector />
            </div>
            <Button onClick={handleUpdateRole} disabled={saving || !roleForm.name} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className={role.is_system_role ? 'border-primary/20' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {role.name}
                    {role.is_system_role && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {role.description || 'No description'}
                  </CardDescription>
                </div>
                {!role.is_system_role && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRole(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {role.is_system_role && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditRole(role)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {role.role_permissions.length} permission{role.role_permissions.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.role_permissions.slice(0, 5).map((rp) => (
                    <Badge key={rp.id} variant="outline" className="text-xs">
                      {rp.permission?.name}
                    </Badge>
                  ))}
                  {role.role_permissions.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{role.role_permissions.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No roles defined yet</p>
            <p className="text-sm text-muted-foreground">Create your first role to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RolesPermissionsPage;
