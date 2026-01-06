import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/contexts/PermissionContext';
import ExpensesList from '@/components/expenses/ExpensesList';
import ExpenseCategories from '@/components/expenses/ExpenseCategories';
import ExpenseReports from '@/components/expenses/ExpenseReports';

const ExpensesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('my-expenses');
  const { hasPermission } = usePermissions();
  
  const canViewAll = hasPermission('finance.view_all');
  const canApprove = hasPermission('finance.approve_expense');
  const canManageSettings = hasPermission('finance.manage_settings');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">
          Submit, track, and manage expense claims
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-expenses">My Expenses</TabsTrigger>
          {canViewAll && <TabsTrigger value="all-expenses">All Expenses</TabsTrigger>}
          {canApprove && <TabsTrigger value="pending-approval">Pending Approval</TabsTrigger>}
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {canManageSettings && <TabsTrigger value="categories">Categories</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-expenses">
          <ExpensesList view="my" />
        </TabsContent>

        {canViewAll && (
          <TabsContent value="all-expenses">
            <ExpensesList view="all" />
          </TabsContent>
        )}

        {canApprove && (
          <TabsContent value="pending-approval">
            <ExpensesList view="pending" />
          </TabsContent>
        )}

        <TabsContent value="reports">
          <ExpenseReports />
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="categories">
            <ExpenseCategories />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ExpensesPage;
