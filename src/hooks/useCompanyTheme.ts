import { useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Hook to apply company branding to CSS custom properties
 * Uses branding from CompanyContext to avoid duplicate fetches
 */
export const useCompanyTheme = () => {
  const { branding } = useCompany();

  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;

    // Apply company branding colors if they exist
    if (branding.primary_color) {
      root.style.setProperty('--primary', branding.primary_color);
    }
    if (branding.secondary_color) {
      root.style.setProperty('--secondary', branding.secondary_color);
    }
    if (branding.accent_color) {
      root.style.setProperty('--accent', branding.accent_color);
    }
    if (branding.background_color) {
      root.style.setProperty('--background', branding.background_color);
    }
    if (branding.foreground_color) {
      root.style.setProperty('--foreground', branding.foreground_color);
    }
    if (branding.border_radius) {
      root.style.setProperty('--radius', branding.border_radius);
    }

    // Apply sidebar colors based on primary
    if (branding.primary_color) {
      root.style.setProperty('--sidebar-primary', branding.primary_color);
    }

    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--radius');
      root.style.removeProperty('--sidebar-primary');
    };
  }, [branding]);

  return { branding };
};
