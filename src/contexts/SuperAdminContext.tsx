import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface SuperAdmin {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

interface SuperAdminContextType {
  isSuperAdmin: boolean;
  superAdminData: SuperAdmin | null;
  isLoading: boolean;
  refreshSuperAdminStatus: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminData, setSuperAdminData] = useState<SuperAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSuperAdminStatus = useCallback(async () => {
    if (!user) {
      setIsSuperAdmin(false);
      setSuperAdminData(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.log('Super admin check:', error.message);
        setIsSuperAdmin(false);
        setSuperAdminData(null);
      } else if (data) {
        setIsSuperAdmin(true);
        setSuperAdminData(data);
      } else {
        setIsSuperAdmin(false);
        setSuperAdminData(null);
      }
    } catch (err) {
      console.error('Error checking super admin status:', err);
      setIsSuperAdmin(false);
      setSuperAdminData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshSuperAdminStatus = useCallback(async () => {
    setIsLoading(true);
    await checkSuperAdminStatus();
  }, [checkSuperAdminStatus]);

  useEffect(() => {
    checkSuperAdminStatus();
  }, [checkSuperAdminStatus]);

  const value = useMemo(() => ({
    isSuperAdmin,
    superAdminData,
    isLoading,
    refreshSuperAdminStatus,
  }), [isSuperAdmin, superAdminData, isLoading, refreshSuperAdminStatus]);

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
};
