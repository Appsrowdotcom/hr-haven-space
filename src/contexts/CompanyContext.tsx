import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Company = Tables<'companies'>;
type CompanyBranding = Tables<'company_branding'>;
type Department = Tables<'departments'>;

interface CompanyContextType {
  company: Company | null;
  branding: CompanyBranding | null;
  departments: Department[];
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanyData = async (companyId: string) => {
    setIsLoading(true);
    
    try {
      // Fetch company, branding, and departments in parallel
      const [companyResult, brandingResult, departmentsResult] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        supabase.from('company_branding').select('*').eq('company_id', companyId).single(),
        supabase.from('departments').select('*').eq('company_id', companyId),
      ]);

      if (companyResult.data) {
        setCompany(companyResult.data);
      }
      
      if (brandingResult.data) {
        setBranding(brandingResult.data);
      }
      
      if (departmentsResult.data) {
        setDepartments(departmentsResult.data);
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (profile?.company_id) {
      await fetchCompanyData(profile.company_id);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompanyData(profile.company_id);
    } else {
      setCompany(null);
      setBranding(null);
      setDepartments([]);
      setIsLoading(false);
    }
  }, [profile?.company_id]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        branding,
        departments,
        isLoading,
        refreshCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
