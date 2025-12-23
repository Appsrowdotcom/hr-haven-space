import React, { useMemo } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

interface ProtectedRouteProps {
  children?: React.ReactNode;
  permission?: string;
  permissions?: string[];
  anyPermission?: string[];
  module?: ModuleCode;
  authRedirect?: string;
  permissionRedirect?: string;
  moduleRedirect?: string;
}

const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <Skeleton className="h-3 w-3 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <Skeleton className="h-3 w-3 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <Skeleton className="h-3 w-3 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

/**
 * Combined route guard for authentication, permissions, and modules.
 * Checks in order: auth -> module -> permission
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions,
  anyPermission,
  module,
  authRedirect = '/auth',
  permissionRedirect = '/unauthorized',
  moduleRedirect = '/module-disabled',
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isModuleEnabled, isCompanyAdmin, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  // Memoize access check to prevent recalculation
  const accessCheck = useMemo(() => {
    if (authLoading || permLoading) return { loading: true };
    if (!user) return { redirect: authRedirect };
    
    // Check module enablement
    if (module && !isModuleEnabled(module)) {
      return { redirect: moduleRedirect, state: { module } };
    }

    // Company admins bypass permission checks
    const isAdmin = isCompanyAdmin();
    if (isAdmin) return { allowed: true };

    // Check permissions
    let hasAccess = true;

    if (permission) {
      hasAccess = hasPermission(permission);
    }

    if (permissions && permissions.length > 0) {
      hasAccess = permissions.every((p) => hasPermission(p));
    }

    if (anyPermission && anyPermission.length > 0) {
      hasAccess = anyPermission.some((p) => hasPermission(p));
    }

    if (!hasAccess) {
      return { redirect: permissionRedirect };
    }

    return { allowed: true };
  }, [
    authLoading,
    permLoading,
    user,
    module,
    permission,
    permissions,
    anyPermission,
    isModuleEnabled,
    isCompanyAdmin,
    hasPermission,
    authRedirect,
    permissionRedirect,
    moduleRedirect,
  ]);

  if (accessCheck.loading) {
    return <LoadingSkeleton />;
  }

  if (accessCheck.redirect) {
    return (
      <Navigate 
        to={accessCheck.redirect} 
        state={{ from: location, ...accessCheck.state }} 
        replace 
      />
    );
  }

  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;
