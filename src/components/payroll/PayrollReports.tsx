import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2, TrendingUp, Users, IndianRupee, PieChart } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';

interface PayrollSummary {
  month: string;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  employee_count: number;
}

interface DepartmentCost {
  department: string;
  cost: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

const PayrollReports: React.FC = () => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [monthlySummary, setMonthlySummary] = useState<PayrollSummary[]>([]);
  const [departmentCosts, setDepartmentCosts] = useState<DepartmentCost[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalPaid: 0,
    avgSalary: 0,
    totalEmployees: 0,
    totalRuns: 0,
  });

  useEffect(() => {
    if (company?.id) {
      fetchReports();
    }
  }, [company?.id]);

  const fetchReports = async () => {
    try {
      // Fetch payroll runs for the last 6 months
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data: runs, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', company!.id)
        .gte('pay_period_start', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order('pay_period_start');

      if (error) throw error;

      // Process monthly summary
      const monthlyData: Record<string, PayrollSummary> = {};
      let totalPaid = 0;
      let totalEmployees = 0;

      (runs || []).forEach(run => {
        const month = format(new Date(run.pay_period_start), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            total_gross: 0,
            total_net: 0,
            total_deductions: 0,
            employee_count: 0,
          };
        }
        monthlyData[month].total_gross += run.total_gross;
        monthlyData[month].total_net += run.total_net;
        monthlyData[month].total_deductions += run.total_deductions;
        monthlyData[month].employee_count += run.employee_count;
        totalPaid += run.total_net;
        totalEmployees = Math.max(totalEmployees, run.employee_count);
      });

      setMonthlySummary(Object.values(monthlyData));
      setTotalStats({
        totalPaid,
        avgSalary: totalEmployees > 0 ? totalPaid / (runs?.length || 1) / totalEmployees : 0,
        totalEmployees,
        totalRuns: runs?.length || 0,
      });

      // Fetch department-wise costs from latest run
      if (runs && runs.length > 0) {
        const latestRun = runs[runs.length - 1];
        const { data: payslips } = await supabase
          .from('payslips')
          .select('department_name, net_pay')
          .eq('payroll_run_id', latestRun.id);

        const deptCosts: Record<string, number> = {};
        (payslips || []).forEach(p => {
          const dept = p.department_name || 'Unassigned';
          deptCosts[dept] = (deptCosts[dept] || 0) + p.net_pay;
        });

        setDepartmentCosts(
          Object.entries(deptCosts).map(([department, cost]) => ({ department, cost }))
        );
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid (6 months)</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalPaid)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Salary/Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.avgSalary)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Employees on Payroll</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payroll Runs</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalRuns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payroll Trend</CardTitle>
            <CardDescription>Gross vs Net pay over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySummary.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No payroll data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="total_gross" name="Gross" fill="hsl(var(--primary))" />
                  <Bar dataKey="total_net" name="Net" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department-wise Cost</CardTitle>
            <CardDescription>Payroll distribution by department (latest run)</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentCosts.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No department data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={departmentCosts}
                    dataKey="cost"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {departmentCosts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payroll history available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Month</th>
                    <th className="text-right py-3 px-4">Employees</th>
                    <th className="text-right py-3 px-4">Gross Pay</th>
                    <th className="text-right py-3 px-4">Deductions</th>
                    <th className="text-right py-3 px-4">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-4 font-medium">{row.month}</td>
                      <td className="text-right py-3 px-4">{row.employee_count}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(row.total_gross)}</td>
                      <td className="text-right py-3 px-4 text-red-600">{formatCurrency(row.total_deductions)}</td>
                      <td className="text-right py-3 px-4 font-medium">{formatCurrency(row.total_net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollReports;
