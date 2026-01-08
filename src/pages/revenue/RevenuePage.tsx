import React from 'react';
import { usePermissions } from '@/contexts/PermissionContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RevenueList,
  CollectionsList,
  RevenueCategories,
  RevenueDashboard,
} from '@/components/revenue';

const RevenuePage: React.FC = () => {
  const { hasPermission, isCompanyAdmin } = usePermissions();

  const canView = isCompanyAdmin() || hasPermission('revenue.view');
  const canViewOwn = isCompanyAdmin() || hasPermission('revenue.view_own');
  const canCreate = isCompanyAdmin() || hasPermission('revenue.create');
  const canAddCollection = isCompanyAdmin() || hasPermission('revenue.add_collection');
  const canManageCategories = isCompanyAdmin() || hasPermission('revenue.manage_categories');

  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (canView) return 'dashboard';
    if (canViewOwn) return 'my-revenue';
    if (canAddCollection) return 'collections';
    if (canManageCategories) return 'categories';
    return 'dashboard';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue & Collections</h1>
        <p className="text-muted-foreground">
          Track revenue entries, manage collections, and view performance metrics.
        </p>
      </div>

      <Tabs defaultValue={getDefaultTab()} className="space-y-4">
        <TabsList>
          {canView && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
          {canViewOwn && <TabsTrigger value="my-revenue">My Revenue</TabsTrigger>}
          {canView && <TabsTrigger value="all-revenue">All Revenue</TabsTrigger>}
          {canAddCollection && <TabsTrigger value="collections">Collections</TabsTrigger>}
          {canManageCategories && <TabsTrigger value="categories">Categories</TabsTrigger>}
        </TabsList>

        {canView && (
          <TabsContent value="dashboard" className="space-y-4">
            <RevenueDashboard />
          </TabsContent>
        )}

        {canViewOwn && (
          <TabsContent value="my-revenue" className="space-y-4">
            <RevenueList viewMode="own" />
          </TabsContent>
        )}

        {canView && (
          <TabsContent value="all-revenue" className="space-y-4">
            <RevenueList viewMode="all" />
          </TabsContent>
        )}

        {canAddCollection && (
          <TabsContent value="collections" className="space-y-4">
            <CollectionsList />
          </TabsContent>
        )}

        {canManageCategories && (
          <TabsContent value="categories" className="space-y-4">
            <RevenueCategories />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default RevenuePage;
