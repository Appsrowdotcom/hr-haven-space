import { useMemo } from 'react';
import { usePermissions } from '@/contexts/PermissionContext';
import { navigationConfig, type NavItem, type NavSection } from '@/config/navigation';

/**
 * Hook to filter navigation based on user permissions and enabled modules
 * Returns only the menu items the current user can access
 */
export const useFilteredNavigation = (): NavSection[] => {
  const { hasPermission, isModuleEnabled, isCompanyAdmin, hasRole } = usePermissions();

  const filteredNavigation = useMemo(() => {
    const isAdmin = isCompanyAdmin();
    const isHR = hasRole('HR') || hasRole('Hr manager');

    const filterItem = (item: NavItem): NavItem | null => {
      // Check if module is enabled (if module is specified)
      if (item.module && !isModuleEnabled(item.module)) {
        return null;
      }

      // Company admins or HR roles can see HR-related items
      if (isAdmin || isHR) {
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

      // Check if user has permission (if permission is specified)
      if (item.permission && !hasPermission(item.permission)) {
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
  }, [hasPermission, isModuleEnabled, isCompanyAdmin, hasRole]);

  return filteredNavigation;
};
