import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionContext';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

interface RequireModuleProps {
  children: React.ReactNode;
  /** Module that must be enabled */
  module: ModuleCode;
  /** Redirect path when module is disabled (default: /module-disabled) */
  redirectTo?: string;
  /** Custom fallback component instead of redirect */
  fallback?: React.ReactNode;
}

/**
 * Route guard that protects routes based on enabled modules.
 * Redirects or shows fallback when required module is not enabled.
 */
export const RequireModule: React.FC<RequireModuleProps> = ({
  children,
  module,
  redirectTo = '/module-disabled',
  fallback,
}) => {
  const { isModuleEnabled, isLoading } = usePermissions();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading modules...</div>
      </div>
    );
  }

  if (!isModuleEnabled(module)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} state={{ from: location, module }} replace />;
  }

  return <>{children}</>;
};
