import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

interface ProtectedRouteProps {
  children?: React.ReactNode;
  /** Permission required to access route */
  permission?: string;
  /** Multiple permissions - user must have ALL */
  permissions?: string[];
  /** Multiple permissions - user must have ANY */
  anyPermission?: string[];
  /** Module that must be enabled */
  module?: ModuleCode;
  /** Custom redirect for auth failures */
  authRedirect?: string;
  /** Custom redirect for permission failures */
  permissionRedirect?: string;
  /** Custom redirect for module failures */
  moduleRedirect?: string;
}

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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to={authRedirect} state={{ from: location }} replace />;
  }

  // Show loading while checking permissions
  if (permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  // Check module enablement
  if (module && !isModuleEnabled(module)) {
    return <Navigate to={moduleRedirect} state={{ from: location, module }} replace />;
  }

  // Company admins bypass permission checks
  const isAdmin = isCompanyAdmin();

  // Check permissions (unless admin)
  if (!isAdmin) {
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
      return <Navigate to={permissionRedirect} state={{ from: location }} replace />;
    }
  }

  // Render children or Outlet for nested routes
  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;
