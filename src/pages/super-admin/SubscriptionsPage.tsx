import { useEffect, useState } from 'react';
import { CreditCard, Search, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface Subscription {
  id: string;
  company_id: string;
  plan_id: string | null;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  company?: {
    name: string;
  };
  plan?: {
    name: string;
    price_monthly: number;
    price_yearly: number;
  };
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const { data, error } = await supabase
          .from('company_subscriptions')
          .select(`
            *,
            companies(name),
            subscription_plans(name, price_monthly, price_yearly)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((sub: any) => ({
          ...sub,
          company: sub.companies,
          plan: sub.subscription_plans,
        }));

        setSubscriptions(formatted);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.company?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trial: { variant: 'secondary', label: 'Trial' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
      expired: { variant: 'destructive', label: 'Expired' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

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
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground">Manage company subscriptions and billing</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Billing</TableHead>
                <TableHead className="hidden md:table-cell">Period End</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{sub.company?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>{sub.plan?.name || 'No Plan'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell capitalize">{sub.billing_cycle}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${sub.billing_cycle === 'yearly' 
                        ? sub.plan?.price_yearly?.toLocaleString() 
                        : sub.plan?.price_monthly?.toLocaleString() || 0}
                      <span className="text-muted-foreground text-xs">
                        /{sub.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
