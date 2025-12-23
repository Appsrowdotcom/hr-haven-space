import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Shield, LogOut, Settings } from 'lucide-react';
import HRDashboardWidgets from '@/components/hr/HRDashboardWidgets';

const Dashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { company, isLoading: companyLoading } = useCompany();
  const { roles, permissions, enabledModules, isCompanyAdmin, isLoading: permissionsLoading } = usePermissions();

  const handleSignOut = async () => {
    await signOut();
  };

  if (companyLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">{company?.name || 'HRMS'}</h1>
              <p className="text-sm text-muted-foreground">Human Resource Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!</h2>
          <p className="text-muted-foreground">Here's an overview of your HRMS dashboard.</p>
        </div>

        {/* HR Dashboard Widgets */}
        {enabledModules.includes('HR_CORE') && (
          <div className="mb-8">
            <HRDashboardWidgets />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Company Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Company</CardTitle>
                <CardDescription>Organization details</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-foreground">{company?.name || 'Not set'}</p>
              {company?.industry && (
                <p className="text-sm text-muted-foreground">{company.industry}</p>
              )}
              {company?.size && (
                <Badge variant="secondary" className="mt-2">{company.size}</Badge>
              )}
            </CardContent>
          </Card>

          {/* Roles Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Your Roles</CardTitle>
                <CardDescription>Assigned permissions</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge key={role.id} variant={isCompanyAdmin() ? 'default' : 'secondary'}>
                      {role.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned yet</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {permissions.length} permission{permissions.length !== 1 ? 's' : ''} granted
              </p>
            </CardContent>
          </Card>

          {/* Modules Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Modules</CardTitle>
                <CardDescription>Enabled features</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {enabledModules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {enabledModules.map((module) => (
                    <Badge key={module} variant="outline">
                      {module.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No modules enabled yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Status */}
        {profile?.status === 'invited' && (
          <Card className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardContent className="pt-6">
              <p className="text-amber-800 dark:text-amber-200">
                Your account is pending activation. Please complete your profile setup.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
