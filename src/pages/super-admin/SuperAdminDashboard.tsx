import { useEffect, useState } from 'react';
import { Building2, Users, CreditCard, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalCompanies: number;
  activeSubscriptions: number;
  totalUsers: number;
  trialAccounts: number;
  monthlyRevenue: number;
  expiringSoon: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeSubscriptions: 0,
    totalUsers: 0,
    trialAccounts: 0,
    monthlyRevenue: 0,
    expiringSoon: 0,
  });
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch companies count
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        // Fetch profiles (users) count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch subscriptions data
        const { data: subscriptions } = await supabase
          .from('company_subscriptions')
          .select('*, subscription_plans(price_monthly)');

        const activeCount = subscriptions?.filter(s => s.status === 'active').length || 0;
        const trialCount = subscriptions?.filter(s => s.status === 'trial').length || 0;
        
        // Calculate monthly revenue from active subscriptions
        const monthlyRevenue = subscriptions
          ?.filter(s => s.status === 'active')
          .reduce((sum, s) => {
            const price = (s.subscription_plans as any)?.price_monthly || 0;
            return sum + Number(price);
          }, 0) || 0;

        // Fetch recent companies
        const { data: recent } = await supabase
          .from('companies')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalCompanies: companiesCount || 0,
          activeSubscriptions: activeCount,
          totalUsers: usersCount || 0,
          trialAccounts: trialCount,
          monthlyRevenue,
          expiringSoon: 0,
        });
        setRecentCompanies(recent || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies,
      icon: Building2,
      description: 'Registered companies',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CheckCircle2,
      description: 'Paid accounts',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Across all companies',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Trial Accounts',
      value: stats.trialAccounts,
      icon: AlertCircle,
      description: 'In trial period',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      description: 'This month',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: CreditCard,
      description: 'Within 7 days',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
        <p className="text-muted-foreground">Overview of your SaaS platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Companies</CardTitle>
          <CardDescription>Latest companies registered on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCompanies.length === 0 ? (
            <p className="text-muted-foreground text-sm">No companies registered yet</p>
          ) : (
            <div className="space-y-3">
              {recentCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
