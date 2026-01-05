import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface TaxSlab {
  id: string;
  financial_year: string;
  regime: 'old' | 'new';
  min_income: number;
  max_income: number | null;
  tax_rate: number;
  is_active: boolean;
}

const currentFY = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
};

const TaxSlabsManager: React.FC = () => {
  const { company } = useCompany();
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFY, setSelectedFY] = useState(currentFY());
  const [selectedRegime, setSelectedRegime] = useState<'new' | 'old'>('new');

  const fyOptions = [
    currentFY(),
    `${parseInt(currentFY().split('-')[0]) - 1}-${(parseInt(currentFY().split('-')[0])).toString().slice(-2)}`,
  ];

  useEffect(() => {
    if (company?.id) {
      fetchSlabs();
    }
  }, [company?.id, selectedFY, selectedRegime]);

  const fetchSlabs = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_slabs')
        .select('*')
        .eq('company_id', company!.id)
        .eq('financial_year', selectedFY)
        .eq('regime', selectedRegime)
        .order('min_income', { ascending: true });

      if (error) throw error;
      setSlabs((data || []) as TaxSlab[]);
    } catch (error) {
      console.error('Error fetching tax slabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSlabs = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      // New regime slabs for FY 2024-25
      const newRegimeSlabs = [
        { min_income: 0, max_income: 300000, tax_rate: 0 },
        { min_income: 300000, max_income: 700000, tax_rate: 5 },
        { min_income: 700000, max_income: 1000000, tax_rate: 10 },
        { min_income: 1000000, max_income: 1200000, tax_rate: 15 },
        { min_income: 1200000, max_income: 1500000, tax_rate: 20 },
        { min_income: 1500000, max_income: null, tax_rate: 30 },
      ];

      // Old regime slabs for FY 2024-25
      const oldRegimeSlabs = [
        { min_income: 0, max_income: 250000, tax_rate: 0 },
        { min_income: 250000, max_income: 500000, tax_rate: 5 },
        { min_income: 500000, max_income: 1000000, tax_rate: 20 },
        { min_income: 1000000, max_income: null, tax_rate: 30 },
      ];

      const allSlabs = [
        ...newRegimeSlabs.map(s => ({ ...s, regime: 'new' as const })),
        ...oldRegimeSlabs.map(s => ({ ...s, regime: 'old' as const })),
      ];

      const { error } = await supabase
        .from('tax_slabs')
        .insert(allSlabs.map(s => ({
          ...s,
          company_id: company.id,
          financial_year: selectedFY,
          is_active: true,
        })));

      if (error) throw error;
      toast.success('Default tax slabs created');
      fetchSlabs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tax slabs');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tax slab?')) return;
    try {
      const { error } = await supabase
        .from('tax_slabs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Tax slab deleted');
      fetchSlabs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const formatCurrency = (amount: number) => {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Income Tax Slabs</CardTitle>
            <CardDescription>
              Configure TDS calculation slabs for different tax regimes
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyOptions.map(fy => (
                  <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRegime} onValueChange={(v) => setSelectedRegime(v as 'new' | 'old')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Regime</SelectItem>
                <SelectItem value="old">Old Regime</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {slabs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground text-center">
              No tax slabs configured for FY {selectedFY} ({selectedRegime} regime)
            </p>
            <Button onClick={initializeDefaultSlabs} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Initialize Default Slabs
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Income Range</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slabs.map((slab, index) => (
                <TableRow key={slab.id}>
                  <TableCell>
                    {formatCurrency(slab.min_income)} 
                    {slab.max_income ? ` - ${formatCurrency(slab.max_income)}` : ' and above'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={slab.tax_rate === 0 ? 'secondary' : 'outline'}>
                      {slab.tax_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(slab.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxSlabsManager;
