import { useEffect, useContext } from 'react';
import type { Tables } from '@/integrations/supabase/types';

// Import context directly to avoid throw on undefined
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type CompanyBranding = Tables<'company_branding'>;

/**
 * Hook to apply company branding to CSS custom properties
 * Updates theme colors dynamically based on company settings
 * This hook is safe to use even when CompanyContext is not available
 */
export const useCompanyTheme = () => {
  const { profile } = useAuth();
  const [branding, setBranding] = React.useState<CompanyBranding | null>(null);

  // Fetch branding directly to avoid context dependency issues
  useEffect(() => {
    const fetchBranding = async () => {
      if (!profile?.company_id) {
        setBranding(null);
        return;
      }

      const { data } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      setBranding(data);
    };

    fetchBranding();
  }, [profile?.company_id]);

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
