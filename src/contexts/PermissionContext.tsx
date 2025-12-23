import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Role = Tables<'roles'>;
type Permission = Tables<'permissions'>;
type ModuleCode = Enums<'module_code'>;

interface UserRoleWithRole {
  role_id: string;
  roles: Role;
}

interface RolePermissionWithPermission {
  permission_id: string;
  permissions: Permission;
}

interface PermissionContextType {
  roles: Role[];
  permissions: Permission[];
  enabledModules: ModuleCode[];
  isLoading: boolean;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  isModuleEnabled: (moduleCode: ModuleCode) => boolean;
  isCompanyAdmin: () => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [enabledModules, setEnabledModules] = useState<ModuleCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissionsData = async (userId: string, companyId: string) => {
    setIsLoading(true);
    
    try {
      // Fetch user roles with role details
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles (*)
        `)
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      } else if (userRolesData) {
        const userRoles = userRolesData as unknown as UserRoleWithRole[];
        const fetchedRoles = userRoles
          .map((ur) => ur.roles)
          .filter((r): r is Role => r !== null && r.is_active);
        setRoles(fetchedRoles);

        // Get all role IDs to fetch permissions
        const roleIds = fetchedRoles.map((r) => r.id);
        
        if (roleIds.length > 0) {
          const { data: rolePermsData, error: permsError } = await supabase
            .from('role_permissions')
            .select(`
              permission_id,
              permissions (*)
            `)
            .in('role_id', roleIds);

          if (permsError) {
            console.error('Error fetching role permissions:', permsError);
          } else if (rolePermsData) {
            const rolePerms = rolePermsData as unknown as RolePermissionWithPermission[];
            const fetchedPermissions = rolePerms
              .map((rp) => rp.permissions)
              .filter((p): p is Permission => p !== null);
            
            // Remove duplicates
            const uniquePermissions = Array.from(
              new Map(fetchedPermissions.map((p) => [p.id, p])).values()
            );
            setPermissions(uniquePermissions);
          }
        }
      }

      // Fetch enabled modules for the company
      const { data: modulesData, error: modulesError } = await supabase
        .from('company_modules')
        .select('module')
        .eq('company_id', companyId)
        .eq('is_enabled', true);

      if (modulesError) {
        console.error('Error fetching company modules:', modulesError);
      } else if (modulesData) {
        setEnabledModules(modulesData.map((m) => m.module));
      }
    } catch (error) {
      console.error('Error fetching permissions data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPermissions = async () => {
    if (user && profile?.company_id) {
      await fetchPermissionsData(user.id, profile.company_id);
    }
  };

  useEffect(() => {
    if (user && profile?.company_id) {
      fetchPermissionsData(user.id, profile.company_id);
    } else {
      setRoles([]);
      setPermissions([]);
      setEnabledModules([]);
      setIsLoading(false);
    }
  }, [user, profile?.company_id]);

  const hasRole = (roleName: string): boolean => {
    return roles.some((r) => r.name === roleName);
  };

  const hasPermission = (permissionCode: string): boolean => {
    return permissions.some((p) => p.code === permissionCode);
  };

  const isModuleEnabled = (moduleCode: ModuleCode): boolean => {
    return enabledModules.includes(moduleCode);
  };

  const isCompanyAdmin = (): boolean => {
    return hasRole('Company Admin');
  };

  return (
    <PermissionContext.Provider
      value={{
        roles,
        permissions,
        enabledModules,
        isLoading,
        hasRole,
        hasPermission,
        isModuleEnabled,
        isCompanyAdmin,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};
