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
  /** Role name required to render children */
  role?: string;
  /** Multiple roles - user must have ANY of them */
  anyRole?: string[];
  /** Module that must be enabled */
  module?: ModuleCode;
  /** Content to show when access is denied */
  fallback?: React.ReactNode;
  /** If true, admins also need to pass checks (default: false) */
  strictMode?: boolean;
}

/**
 * Conditional rendering gate based on permissions, roles, and modules.
 * Use this to show/hide UI elements based on user access.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  anyPermission,
  role,
  anyRole,
  module,
  fallback = null,
  strictMode = false,
}) => {
  const { hasPermission, hasRole, isModuleEnabled, isCompanyAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  // Check module first - even admins can't bypass module checks
  if (module && !isModuleEnabled(module)) {
    return <>{fallback}</>;
  }

  // Company admins bypass permission/role checks unless strictMode is enabled
  if (!strictMode && isCompanyAdmin()) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // Single role check
  if (role) {
    hasAccess = hasRole(role);
  }

  // Multiple roles - ANY required
  if (anyRole && anyRole.length > 0) {
    hasAccess = anyRole.some((r) => hasRole(r));
  }

  // Single permission check
  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  // Multiple permissions - ALL required
  if (permissions && permissions.length > 0) {
    hasAccess = hasAccess && permissions.every((p) => hasPermission(p));
  }

  // Multiple permissions - ANY required
  if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAccess && anyPermission.some((p) => hasPermission(p));
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
