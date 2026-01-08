import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Banknote, Clock, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

type PeriodType = 'this_month' | 'last_month' | 'this_year' | 'last_year';

export const RevenueDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<PeriodType>('this_month');

  const getDateRange = (p: PeriodType) => {
    const now = new Date();
    switch (p) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last_year':
        const lastYear = subMonths(now, 12);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
  };

  const { start, end } = getDateRange(period);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['revenue-stats', profile?.company_id, period],
    queryFn: async () => {
      // Fetch revenue entries for period
      const { data: entries, error: entriesError } = await supabase
        .from('revenue_entries')
        .select('id, amount, revenue_date, category_id, revenue_categories(name)')
        .eq('company_id', profile?.company_id)
        .gte('revenue_date', format(start, 'yyyy-MM-dd'))
        .lte('revenue_date', format(end, 'yyyy-MM-dd'));

      if (entriesError) throw entriesError;

      // Fetch all collections for these entries
      const entryIds = entries?.map((e) => e.id) || [];
      let collections: { revenue_entry_id: string; amount: number; collection_date: string }[] = [];
      
      if (entryIds.length > 0) {
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('revenue_collections')
          .select('revenue_entry_id, amount, collection_date')
          .in('revenue_entry_id', entryIds);

        if (collectionsError) throw collectionsError;
        collections = collectionsData || [];
      }

      // Calculate totals
      const totalRevenue = entries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalCollected = collections.reduce((sum, c) => sum + Number(c.amount), 0);
      const pendingCollection = totalRevenue - totalCollected;
      const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

      // Category breakdown
      const categoryMap = new Map<string, number>();
      entries?.forEach((e) => {
        const catName = (e.revenue_categories as { name: string } | null)?.name || 'Uncategorized';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + Number(e.amount));
      });
      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      // Monthly trend (for year views)
      const monthlyMap = new Map<string, { revenue: number; collected: number }>();
      entries?.forEach((e) => {
        const month = format(new Date(e.revenue_date), 'MMM');
        const current = monthlyMap.get(month) || { revenue: 0, collected: 0 };
        current.revenue += Number(e.amount);
        monthlyMap.set(month, current);
      });
      collections.forEach((c) => {
        const month = format(new Date(c.collection_date), 'MMM');
        const current = monthlyMap.get(month) || { revenue: 0, collected: 0 };
        current.collected += Number(c.amount);
        monthlyMap.set(month, current);
      });
      const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data,
      }));

      return {
        totalRevenue,
        totalCollected,
        pendingCollection,
        collectionRate,
        entryCount: entries?.length || 0,
        categoryBreakdown,
        monthlyTrend,
      };
    },
    enabled: !!profile?.company_id,
  });

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Revenue Overview</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.entryCount || 0} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{(stats?.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.collectionRate?.toFixed(1)}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ₹{(stats?.pendingCollection || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.collectionRate?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${Math.min(stats?.collectionRate || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Collection</CardTitle>
            <CardDescription>Monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.monthlyTrend && stats.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                  <Bar dataKey="collected" fill="hsl(var(--secondary))" name="Collected" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
