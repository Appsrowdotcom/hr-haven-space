import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, CreditCard, Calendar, Mail, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanyDetails {
  id: string;
  name: string;
  legal_name: string | null;
  industry: string | null;
  size: string | null;
  created_at: string;
}

interface CompanyUser {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  status: string;
  billing_cycle: string;
  current_period_end: string;
  plan_id: string | null;
  plan?: {
    id: string;
    name: string;
    price_monthly: number;
  };
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
}

export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    fetchCompanyData();
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      // Fetch company details
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyData) setCompany(companyData);

      // Fetch company users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email, full_name, status, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      setUsers(usersData || []);

      // Fetch subscription
      const { data: subData } = await supabase
        .from('company_subscriptions')
        .select('*, subscription_plans(id, name, price_monthly)')
        .eq('company_id', companyId)
        .maybeSingle();

      if (subData) {
        setSubscription({
          ...subData,
          plan: subData.subscription_plans as any,
        });
      }

      // Fetch available plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('id, name, price_monthly, price_yearly')
        .eq('is_active', true)
        .order('sort_order');

      setPlans(plansData || []);

      // Fetch enabled modules
      const { data: modulesData } = await supabase
        .from('company_modules')
        .select('module')
        .eq('company_id', companyId)
        .eq('is_enabled', true);

      setEnabledModules(modulesData?.map(m => m.module) || []);

    } catch (error) {
      console.error('Error fetching company data:', error);
      toast.error('Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!companyId) return;

    try {
      if (subscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('company_subscriptions')
          .update({ plan_id: planId })
          .eq('company_id', companyId);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('company_subscriptions')
          .insert({
            company_id: companyId,
            plan_id: planId,
            status: 'active',
            billing_cycle: 'monthly',
          });

        if (error) throw error;
      }

      toast.success('Subscription updated successfully');
      fetchCompanyData();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!subscription) return;

    try {
      const { error } = await supabase
        .from('company_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id);

      if (error) throw error;
      toast.success(`Status changed to ${newStatus}`);
      fetchCompanyData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trial: 'secondary',
      suspended: 'destructive',
      cancelled: 'outline',
      invited: 'secondary',
      pending: 'secondary',
      deactivated: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Company not found</p>
        <Button variant="outline" onClick={() => navigate('/super-admin/companies')} className="mt-4">
          Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/companies')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            {company.legal_name && (
              <p className="text-muted-foreground">{company.legal_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{subscription?.plan?.name || 'None'}</p>
                <p className="text-xs text-muted-foreground">Current Plan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{enabledModules.length}</p>
                <p className="text-xs text-muted-foreground">Active Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {new Date(company.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Users</CardTitle>
              <CardDescription>{users.length} users in this company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'Unknown'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>Manage this company's subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Plan</label>
                  <Select
                    value={subscription?.plan_id || ''}
                    onValueChange={handleChangePlan}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ${plan.price_monthly}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={subscription?.status || 'active'}
                    onValueChange={handleChangeStatus}
                    disabled={!subscription}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subscription && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">Current Subscription</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan:</span>
                      <span>{subscription.plan?.name || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing Cycle:</span>
                      <span className="capitalize">{subscription.billing_cycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Period Ends:</span>
                      <span>{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enabled Modules</CardTitle>
              <CardDescription>Modules active for this company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {enabledModules.length === 0 ? (
                  <p className="text-muted-foreground">No modules enabled</p>
                ) : (
                  enabledModules.map((module) => (
                    <Badge key={module} variant="secondary">
                      {module.replace('_', ' ')}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
