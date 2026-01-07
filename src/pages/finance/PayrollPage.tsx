import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Play, FileText, BarChart3 } from 'lucide-react';
import PayrollSettings from '@/components/payroll/PayrollSettings';
import EmployeeSalaries from '@/components/payroll/EmployeeSalaries';
import PayrollRuns from '@/components/payroll/PayrollRuns';
import PayslipsList from '@/components/payroll/PayslipsList';
import PayrollReports from '@/components/payroll/PayrollReports';
import { usePermissions } from '@/contexts/PermissionContext';

const PayrollPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  
  // Permission checks based on exact permission codes
  const canViewPayroll = hasPermission('finance.view_payroll');
  const canManagePayroll = hasPermission('finance.manage_payroll');

  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (canManagePayroll) return 'runs';
    if (canViewPayroll) return 'payslips';
    return 'reports';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>
        <p className="text-muted-foreground">
          Manage employee salaries, run payroll, and generate payslips
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          {canManagePayroll && (
            <TabsTrigger value="runs" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Payroll Runs</span>
            </TabsTrigger>
          )}
          {canManagePayroll && (
            <TabsTrigger value="salaries" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Salaries</span>
            </TabsTrigger>
          )}
          {canViewPayroll && (
            <TabsTrigger value="payslips" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Payslips</span>
            </TabsTrigger>
          )}
          {canViewPayroll && (
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          )}
          {canManagePayroll && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          )}
        </TabsList>

        {canManagePayroll && (
          <TabsContent value="runs" className="space-y-4">
            <PayrollRuns />
          </TabsContent>
        )}

        {canManagePayroll && (
          <TabsContent value="salaries" className="space-y-4">
            <EmployeeSalaries />
          </TabsContent>
        )}

        {canViewPayroll && (
          <TabsContent value="payslips" className="space-y-4">
            <PayslipsList />
          </TabsContent>
        )}

        {canViewPayroll && (
          <TabsContent value="reports" className="space-y-4">
            <PayrollReports />
          </TabsContent>
        )}

        {canManagePayroll && (
          <TabsContent value="settings" className="space-y-4">
            <PayrollSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default PayrollPage;
