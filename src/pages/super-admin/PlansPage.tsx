import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// All available modules
const ALL_MODULES = [
  { code: 'HR_CORE', name: 'HR Core', description: 'Employee management, directory', required: true },
  { code: 'ATTENDANCE', name: 'Attendance', description: 'Time tracking, check-in/out' },
  { code: 'LEAVE', name: 'Leave Management', description: 'Leave requests, approvals' },
  { code: 'FINANCE', name: 'Finance', description: 'Expenses, payroll' },
  { code: 'REVENUE', name: 'Revenue & Collections', description: 'Revenue tracking' },
  { code: 'SALES_CRM', name: 'Sales CRM', description: 'Customer relationships' },
  { code: 'COMPLIANCE', name: 'Compliance', description: 'Regulatory compliance' },
  { code: 'ADMIN', name: 'Admin & Settings', description: 'Company configuration', required: true },
];

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_users: number | null;
  max_departments: number | null;
  allowed_modules: string[];
  features: any;
  is_active: boolean;
  sort_order: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_users: '',
    max_departments: '',
    is_active: true,
    allowed_modules: ['HR_CORE', 'ADMIN'] as string[],
  });

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_users: plan.max_users?.toString() || '',
        max_departments: plan.max_departments?.toString() || '',
        is_active: plan.is_active,
        allowed_modules: plan.allowed_modules || ['HR_CORE', 'ADMIN'],
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        max_users: '',
        max_departments: '',
        is_active: true,
        allowed_modules: ['HR_CORE', 'ADMIN'],
      });
    }
    setIsDialogOpen(true);
  };

  const toggleModule = (moduleCode: string) => {
    const module = ALL_MODULES.find(m => m.code === moduleCode);
    if (module?.required) return; // Can't toggle required modules
    
    setFormData(prev => ({
      ...prev,
      allowed_modules: prev.allowed_modules.includes(moduleCode)
        ? prev.allowed_modules.filter(m => m !== moduleCode)
        : [...prev.allowed_modules, moduleCode]
    }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        max_users: formData.max_users ? parseInt(formData.max_users) : null,
        max_departments: formData.max_departments ? parseInt(formData.max_departments) : null,
        is_active: formData.is_active,
        allowed_modules: formData.allowed_modules,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert({ ...payload, sort_order: plans.length + 1 });

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setIsDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planToDelete.id);

      if (error) throw error;
      toast.success(`Plan "${planToDelete.name}" deleted successfully`);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    } finally {
      setIsDeleting(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage pricing and features for each plan</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
              <DialogDescription>
                {editingPlan ? 'Update the plan details below.' : 'Add a new subscription plan.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Professional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price_monthly">Monthly Price ($)</Label>
                  <Input
                    id="price_monthly"
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price_yearly">Yearly Price ($)</Label>
                  <Input
                    id="price_yearly"
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="max_users">Max Users</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_departments">Max Departments</Label>
                  <Input
                    id="max_departments"
                    type="number"
                    value={formData.max_departments}
                    onChange={(e) => setFormData({ ...formData, max_departments: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              
              {/* Module Selection */}
              <div className="grid gap-2">
                <Label>Included Modules</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {ALL_MODULES.map((module) => (
                    <div key={module.code} className="flex items-start space-x-2">
                      <Checkbox
                        id={`module-${module.code}`}
                        checked={formData.allowed_modules.includes(module.code)}
                        onCheckedChange={() => toggleModule(module.code)}
                        disabled={module.required}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor={`module-${module.code}`}
                          className={`text-sm font-medium cursor-pointer ${module.required ? 'text-muted-foreground' : ''}`}
                        >
                          {module.name}
                          {module.required && <span className="text-xs ml-1">(Required)</span>}
                        </label>
                        <span className="text-xs text-muted-foreground">{module.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingPlan ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold">${plan.price_monthly}</div>
                <div className="text-sm text-muted-foreground">/month</div>
                <div className="text-xs text-muted-foreground">
                  or ${plan.price_yearly}/year
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{plan.max_users || 'Unlimited'} users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{plan.max_departments || 'Unlimited'} departments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{plan.allowed_modules.length} modules</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenDialog(plan)}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPlanToDelete(plan)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{planToDelete?.name}"? This action cannot be undone.
              Companies currently using this plan will need to be assigned a new plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
