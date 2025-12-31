import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, 
  Clock, 
  CalendarDays, 
  DollarSign, 
  TrendingUp, 
  Handshake, 
  ShieldCheck, 
  Settings,
  Loader2,
  Check,
  X
} from 'lucide-react';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

interface ModuleConfig {
  code: ModuleCode;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isMandatory: boolean;
}

const moduleConfigs: ModuleConfig[] = [
  {
    code: 'HR_CORE',
    name: 'HR Core',
    description: 'Core HR functions including employee management, departments, and positions',
    icon: Users,
    isMandatory: true,
  },
  {
    code: 'ATTENDANCE',
    name: 'Attendance Automation',
    description: 'Time tracking, attendance records, and shift management',
    icon: Clock,
    isMandatory: false,
  },
  {
    code: 'LEAVE',
    name: 'Leave Management',
    description: 'Leave requests, approvals, calendars, and balance tracking',
    icon: CalendarDays,
    isMandatory: false,
  },
  {
    code: 'FINANCE',
    name: 'Finance',
    description: 'Payroll processing, expenses, and financial reporting',
    icon: DollarSign,
    isMandatory: false,
  },
  {
    code: 'REVENUE',
    name: 'Revenue & Collections',
    description: 'Revenue tracking, invoicing, and collection management',
    icon: TrendingUp,
    isMandatory: false,
  },
  {
    code: 'SALES_CRM',
    name: 'Sales CRM',
    description: 'Lead management, deals, and customer relationships',
    icon: Handshake,
    isMandatory: false,
  },
  {
    code: 'COMPLIANCE',
    name: 'Compliance',
    description: 'Policy management, audits, and compliance tracking',
    icon: ShieldCheck,
    isMandatory: false,
  },
  {
    code: 'ADMIN',
    name: 'Admin & Settings',
    description: 'Company settings, user management, and system configuration',
    icon: Settings,
    isMandatory: true,
  },
];

interface CompanyModule {
  id: string;
  module: ModuleCode;
  is_enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
}

const ModulesPage: React.FC = () => {
  const { user } = useAuth();
  const { company, refreshCompany } = useCompany();
  const { refreshPermissions } = usePermissions();
  const [companyModules, setCompanyModules] = useState<CompanyModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingModule, setTogglingModule] = useState<ModuleCode | null>(null);

  const fetchModules = async () => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_modules')
        .select('id, company_id, module, is_enabled, enabled_at, enabled_by')
        .eq('company_id', company.id);

      if (error) throw error;
      setCompanyModules(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch modules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchModules();
    }
  }, [company?.id]);

  const isModuleEnabled = (code: ModuleCode): boolean => {
    const module = companyModules.find(m => m.module === code);
    return module?.is_enabled ?? false;
  };

  const handleToggleModule = async (moduleCode: ModuleCode, enabled: boolean) => {
    if (!company?.id || !user?.id) return;
    
    const config = moduleConfigs.find(m => m.code === moduleCode);
    if (config?.isMandatory && !enabled) {
      toast.error('This module is mandatory and cannot be disabled');
      return;
    }

    setTogglingModule(moduleCode);
    try {
      const existingModule = companyModules.find(m => m.module === moduleCode);

      if (existingModule) {
        // Update existing
        const { error } = await supabase
          .from('company_modules')
          .update({
            is_enabled: enabled,
            enabled_at: enabled ? new Date().toISOString() : null,
            enabled_by: enabled ? user.id : null,
          })
          .eq('id', existingModule.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('company_modules')
          .insert({
            company_id: company.id,
            module: moduleCode,
            is_enabled: enabled,
            enabled_at: enabled ? new Date().toISOString() : null,
            enabled_by: enabled ? user.id : null,
          });

        if (error) throw error;
      }

      toast.success(`${config?.name} ${enabled ? 'enabled' : 'disabled'}`);
      await fetchModules();
      await refreshPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update module');
    } finally {
      setTogglingModule(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledCount = moduleConfigs.filter(m => isModuleEnabled(m.code)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Module Management</h1>
        <p className="text-muted-foreground">
          Enable or disable modules for your company • {enabledCount} of {moduleConfigs.length} enabled
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {moduleConfigs.map((config) => {
          const enabled = isModuleEnabled(config.code);
          const Icon = config.icon;
          const isToggling = togglingModule === config.code;

          return (
            <Card 
              key={config.code} 
              className={`transition-colors ${enabled ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {config.name}
                        {config.isMandatory && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToggling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => handleToggleModule(config.code, checked)}
                        disabled={config.isMandatory}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{config.description}</CardDescription>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {enabled ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Enabled</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Disabled</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Disabling a module will hide its UI and block API access for all users in your company.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Module data is preserved and will be available if re-enabled.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModulesPage;
