import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionContext';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

interface RequirePermissionProps {
  children: React.ReactNode;
  /** Permission code required to access this route */
  permission?: string;
  /** Multiple permissions - user must have ALL of them */
  permissions?: string[];
  /** Multiple permissions - user must have ANY of them */
  anyPermission?: string[];
  /** Redirect path when unauthorized (default: /unauthorized) */
  redirectTo?: string;
  /** Custom fallback component instead of redirect */
  fallback?: React.ReactNode;
}

/**
 * Route guard that protects routes based on user permissions.
 * Redirects or shows fallback when user lacks required permissions.
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  children,
  permission,
  permissions,
  anyPermission,
  redirectTo = '/unauthorized',
  fallback,
}) => {
  const { hasPermission, isCompanyAdmin, isLoading } = usePermissions();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Checking permissions...</div>
      </div>
    );
  }

  // Company admins bypass permission checks
  if (isCompanyAdmin()) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // Single permission check
  if (permission) {
    hasAccess = hasPermission(permission);
  }

  // Multiple permissions - ALL required
  if (permissions && permissions.length > 0) {
    hasAccess = permissions.every((p) => hasPermission(p));
  }

  // Multiple permissions - ANY required
  if (anyPermission && anyPermission.length > 0) {
    hasAccess = anyPermission.some((p) => hasPermission(p));
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
