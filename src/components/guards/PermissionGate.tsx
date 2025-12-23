import React from 'react';
import { usePermissions } from '@/contexts/PermissionContext';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

interface PermissionGateProps {
  children: React.ReactNode;
  /** Permission code required to render children */
  permission?: string;
  /** Multiple permissions - user must have ALL of them */
  permissions?: string[];
  /** Multiple permissions - user must have ANY of them */
  anyPermission?: string[];
  /** Module that must be enabled */
  module?: ModuleCode;
  /** Content to show when access is denied */
  fallback?: React.ReactNode;
  /** If true, admins also need to pass checks (default: false) */
  strictMode?: boolean;
}

/**
 * Conditional rendering gate based on permissions and modules.
 * Use this to show/hide UI elements based on user access.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  anyPermission,
  module,
  fallback = null,
  strictMode = false,
}) => {
  const { hasPermission, isModuleEnabled, isCompanyAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  // Company admins bypass checks unless strictMode is enabled
  if (!strictMode && isCompanyAdmin()) {
    // Still check module enablement for admins
    if (module && !isModuleEnabled(module)) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // Check module first
  if (module && !isModuleEnabled(module)) {
    return <>{fallback}</>;
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
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
