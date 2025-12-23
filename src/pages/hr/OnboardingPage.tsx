import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Loader2, CheckCircle2, Circle, ListChecks, Users, Trash2 } from 'lucide-react';

interface OnboardingTemplate {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  items?: OnboardingTemplateItem[];
}

interface OnboardingTemplateItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  sort_order: number;
  is_required: boolean;
}

interface EmployeeOnboarding {
  id: string;
  profile_id: string;
  template_id: string;
  status: string;
  started_at: string;
  profile?: { full_name: string; email: string };
  template?: { id?: string; name: string; description?: string | null; is_active?: boolean };
  items?: EmployeeOnboardingItem[];
}

interface EmployeeOnboardingItem {
  id: string;
  template_item_id: string;
  is_completed: boolean;
  completed_at: string | null;
  template_item?: OnboardingTemplateItem;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { isCompanyAdmin } = usePermissions();
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [employeeOnboardings, setEmployeeOnboardings] = useState<EmployeeOnboarding[]>([]);
  const [myOnboarding, setMyOnboarding] = useState<EmployeeOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
  });
  const [newItem, setNewItem] = useState({ title: '', description: '', category: '' });
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);

  const fetchTemplates = async () => {
    if (!company?.id) return;
    
    const { data, error } = await supabase
      .from('onboarding_templates')
      .select(`
        *,
        items:onboarding_template_items(*)
      `)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
  };

  const fetchEmployeeOnboardings = async () => {
    if (!company?.id || !isCompanyAdmin()) return;
    
    const { data, error } = await supabase
      .from('employee_onboarding')
      .select(`
        *,
        profile:profiles(full_name, email),
        template:onboarding_templates(name),
        items:employee_onboarding_items(*, template_item:onboarding_template_items(*))
      `)
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching employee onboardings:', error);
    } else {
      setEmployeeOnboardings(data || []);
    }
  };

  const fetchMyOnboarding = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('employee_onboarding')
      .select(`
        *,
        template:onboarding_templates(name, description),
        items:employee_onboarding_items(*, template_item:onboarding_template_items(*))
      `)
      .eq('profile_id', user.id)
      .eq('status', 'in_progress')
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching my onboarding:', error);
    } else {
      setMyOnboarding(data);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTemplates(), fetchEmployeeOnboardings(), fetchMyOnboarding()]);
      setIsLoading(false);
    };
    
    if (company?.id && user?.id) {
      loadData();
    }
  }, [company?.id, user?.id, isCompanyAdmin]);

  const handleCreateTemplate = async () => {
    if (!company?.id || !templateForm.name) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('onboarding_templates')
        .insert({
          company_id: company.id,
          name: templateForm.name,
          description: templateForm.description || null,
        });

      if (error) throw error;
      
      toast.success('Template created successfully');
      setTemplateDialogOpen(false);
      setTemplateForm({ name: '', description: '' });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedTemplate || !newItem.title) return;
    
    try {
      const sortOrder = (selectedTemplate.items?.length || 0) + 1;
      
      const { error } = await supabase
        .from('onboarding_template_items')
        .insert({
          template_id: selectedTemplate.id,
          title: newItem.title,
          description: newItem.description || null,
          category: newItem.category || null,
          sort_order: sortOrder,
        });

      if (error) throw error;
      
      toast.success('Item added');
      setNewItem({ title: '', description: '', category: '' });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('onboarding_template_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item deleted');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const handleToggleOnboardingItem = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_onboarding_items')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq('id', itemId);

      if (error) throw error;
      fetchMyOnboarding();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    }
  };

  const getOnboardingProgress = (items: EmployeeOnboardingItem[] | undefined) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(i => i.is_completed).length;
    return Math.round((completed / items.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground">Manage employee onboarding checklists</p>
        </div>
        {isCompanyAdmin() && (
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Onboarding Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    placeholder="e.g., New Employee Onboarding"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                    placeholder="Describe this onboarding template..."
                  />
                </div>
                <Button onClick={handleCreateTemplate} disabled={saving || !templateForm.name} className="w-full">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* My Onboarding Progress */}
      {myOnboarding && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Your Onboarding Progress
            </CardTitle>
            <CardDescription>{myOnboarding.template?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">{getOnboardingProgress(myOnboarding.items)}%</span>
              </div>
              <Progress value={getOnboardingProgress(myOnboarding.items)} />
            </div>
            <div className="space-y-3">
              {myOnboarding.items?.sort((a, b) => (a.template_item?.sort_order || 0) - (b.template_item?.sort_order || 0)).map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={(checked) => handleToggleOnboardingItem(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.template_item?.title}
                    </p>
                    {item.template_item?.description && (
                      <p className="text-sm text-muted-foreground">{item.template_item.description}</p>
                    )}
                  </div>
                  {item.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isCompanyAdmin() && (
        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="employees">Employee Progress</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No onboarding templates yet</p>
                    <Button onClick={() => setTemplateDialogOpen(true)} className="mt-4">
                      Create Your First Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className={selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {template.items?.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                            <span>{item.title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
                      >
                        {selectedTemplate?.id === template.id ? 'Close' : 'Add Items'}
                      </Button>
                      
                      {selectedTemplate?.id === template.id && (
                        <div className="mt-4 p-4 border rounded-lg space-y-3">
                          <Input
                            placeholder="Item title"
                            value={newItem.title}
                            onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                          />
                          <Input
                            placeholder="Category (optional)"
                            value={newItem.category}
                            onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                          />
                          <Button onClick={handleAddItem} disabled={!newItem.title} size="sm" className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Onboarding Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employeeOnboardings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No employees are currently onboarding</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employeeOnboardings.map((onboarding) => (
                      <div key={onboarding.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{onboarding.profile?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{onboarding.template?.name}</p>
                        </div>
                        <div className="w-32">
                          <Progress value={getOnboardingProgress(onboarding.items)} />
                        </div>
                        <Badge variant={onboarding.status === 'completed' ? 'default' : 'secondary'}>
                          {getOnboardingProgress(onboarding.items)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default OnboardingPage;
