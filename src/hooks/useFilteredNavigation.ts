import { useMemo } from 'react';
import { usePermissions } from '@/contexts/PermissionContext';
import { navigationConfig, type NavItem, type NavSection } from '@/config/navigation';

/**
 * Hook to filter navigation based on user permissions and enabled modules
 * Returns only the menu items the current user can access
 * 
 * Logic:
 * 1. Company Admins see all items for enabled modules
 * 2. Other users see items if:
 *    a. Module is enabled for the company (if module is specified)
 *    b. User has the specific permission (if permission is specified)
 *    c. Or user has any permission in that module (fallback for module-only items)
 */
export const useFilteredNavigation = (): NavSection[] => {
  const { hasPermission, isModuleEnabled, isCompanyAdmin, permissions } = usePermissions();

  const filteredNavigation = useMemo(() => {
    const isAdmin = isCompanyAdmin();

    // Get all module codes from user's permissions for fallback checks
    const userModules = new Set(permissions.map(p => p.module));

    const filterItem = (item: NavItem): NavItem | null => {
      // Check if module is enabled for the company (if module specified)
      if (item.module && !isModuleEnabled(item.module)) {
        return null;
      }

      // Company admins can see all enabled module items
      if (isAdmin) {
        // Filter children recursively
        if (item.children) {
          const filteredChildren = item.children
            .map(filterItem)
            .filter((child): child is NavItem => child !== null);

          if (filteredChildren.length === 0) {
            return null;
          }
          return { ...item, children: filteredChildren };
        }
        return item;
      }

      // For non-admin users, check permission access
      let hasAccess = false;

      if (item.permission) {
        // Check if user has the specific permission
        hasAccess = hasPermission(item.permission);
      } else if (item.module) {
        // No specific permission, check if user has ANY permission for this module
        hasAccess = userModules.has(item.module);
      } else {
        // No module or permission specified (like Dashboard) - visible to all
        hasAccess = true;
      }

      if (!hasAccess) {
        return null;
      }

      // Filter children recursively
      if (item.children) {
        const filteredChildren = item.children
          .map(filterItem)
          .filter((child): child is NavItem => child !== null);

        if (filteredChildren.length === 0) {
          return null;
        }
        return { ...item, children: filteredChildren };
      }

      return item;
    };

    const filterSection = (section: NavSection): NavSection | null => {
      const filteredItems = section.items
        .map(filterItem)
        .filter((item): item is NavItem => item !== null);

      if (filteredItems.length === 0) {
        return null;
      }

      return { ...section, items: filteredItems };
    };

    return navigationConfig
      .map(filterSection)
      .filter((section): section is NavSection => section !== null);
  }, [hasPermission, isModuleEnabled, isCompanyAdmin, permissions]);

  return filteredNavigation;
};
