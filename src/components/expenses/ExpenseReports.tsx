import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Receipt, CheckCircle, Clock, XCircle } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

const ExpenseReports: React.FC = () => {
  const { company } = useCompany();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewAll = hasPermission('finance.view_all');

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expense-reports', company?.id, user?.id, canViewAll, dateRange],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('expenses')
        .select(`
          id, amount, status, expense_date, category_id,
          category:expense_categories(id, name)
        `)
        .eq('company_id', company.id)
        .gte('expense_date', dateRange.start)
        .lte('expense_date', dateRange.end);

      if (!canViewAll) {
        query = query.eq('profile_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && !!user?.id,
  });

  // Calculate stats
  const stats = {
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    pending: expenses.filter((e) => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0),
    approved: expenses.filter((e) => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0),
    reimbursed: expenses.filter((e) => e.status === 'reimbursed').reduce((sum, e) => sum + Number(e.amount), 0),
    rejected: expenses.filter((e) => e.status === 'rejected').reduce((sum, e) => sum + Number(e.amount), 0),
    count: expenses.length,
  };

  // Category breakdown
  const categoryData = expenses.reduce((acc, expense) => {
    const catName = expense.category?.name || 'Uncategorized';
    if (!acc[catName]) {
      acc[catName] = { name: catName, value: 0, count: 0 };
    }
    acc[catName].value += Number(expense.amount);
    acc[catName].count += 1;
    return acc;
  }, {} as Record<string, { name: string; value: number; count: number }>);

  const categoryChartData = Object.values(categoryData).sort((a, b) => b.value - a.value);

  // Monthly trend
  const monthlyData = expenses.reduce((acc, expense) => {
    const month = format(new Date(expense.expense_date), 'MMM yyyy');
    if (!acc[month]) {
      acc[month] = { month, amount: 0, count: 0 };
    }
    acc[month].amount += Number(expense.amount);
    acc[month].count += 1;
    return acc;
  }, {} as Record<string, { month: string; amount: number; count: number }>);

  const monthlyChartData = Object.values(monthlyData);

  // Status breakdown
  const statusData = [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Reimbursed', value: stats.reimbursed, color: 'hsl(var(--primary))' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.total.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">{stats.count} expense claims</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.pending.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.approved.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Ready for reimbursement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reimbursed</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.reimbursed.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expense Trend</CardTitle>
            <CardDescription>Expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Highest spending categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryChartData.slice(0, 5).map((cat, index) => (
                <div key={cat.name} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-muted-foreground">
                        ₹{cat.value.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full mt-1">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(cat.value / categoryChartData[0].value) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {categoryChartData.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No expense data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseReports;
