import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/contexts/PermissionContext';
import ExpensesList from '@/components/expenses/ExpensesList';
import ExpenseCategories from '@/components/expenses/ExpenseCategories';
import ExpenseReports from '@/components/expenses/ExpenseReports';

const ExpensesPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  
  // Permission checks based on exact permission codes
  const canViewOwnExpenses = hasPermission('finance.view_own_expenses');
  const canCreateExpense = hasPermission('finance.create_expense');
  const canViewAll = hasPermission('finance.view');
  const canApprove = hasPermission('finance.approve_expense');
  const canManageCategories = hasPermission('finance.manage_categories');

  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (canViewOwnExpenses || canCreateExpense) return 'my-expenses';
    if (canViewAll) return 'all-expenses';
    if (canApprove) return 'pending-approval';
    return 'reports';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

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
          {(canViewOwnExpenses || canCreateExpense) && (
            <TabsTrigger value="my-expenses">My Expenses</TabsTrigger>
          )}
          {canViewAll && <TabsTrigger value="all-expenses">All Expenses</TabsTrigger>}
          {canApprove && <TabsTrigger value="pending-approval">Pending Approval</TabsTrigger>}
          {canViewAll && <TabsTrigger value="reports">Reports</TabsTrigger>}
          {canManageCategories && <TabsTrigger value="categories">Categories</TabsTrigger>}
        </TabsList>

        {(canViewOwnExpenses || canCreateExpense) && (
          <TabsContent value="my-expenses">
            <ExpensesList view="my" canCreate={canCreateExpense} />
          </TabsContent>
        )}

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

        {canViewAll && (
          <TabsContent value="reports">
            <ExpenseReports />
          </TabsContent>
        )}

        {canManageCategories && (
          <TabsContent value="categories">
            <ExpenseCategories />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ExpensesPage;
