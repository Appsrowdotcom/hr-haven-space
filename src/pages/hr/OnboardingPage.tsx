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
import { Plus, Loader2, CheckCircle2, Circle, ListChecks, Users, Trash2, MoreVertical, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AssignOnboardingDialog from '@/components/hr/AssignOnboardingDialog';

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

// Using onboarding_progress view from database
interface EmployeeOnboarding {
  id: string;
  profile_id: string;
  template_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  employee_name: string | null;
  employee_email: string | null;
  template_name: string | null;
  template_description: string | null;
  total_items: number | null;
  completed_items: number | null;
  progress_percentage: number | null;
}

// For my onboarding items display - matches onboarding_item_details view
interface OnboardingItemDisplay {
  id: string;
  onboarding_id: string | null;
  is_completed: boolean | null;
  completed_at: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  sort_order: number | null;
  is_required: boolean | null;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { isCompanyAdmin, hasPermission, hasRole } = usePermissions();
  
  // Permission checks - allow Company Admin, HR role, or specific permissions
  const canManageOnboarding = isCompanyAdmin() || hasRole('HR') || hasRole('Hr manager') || hasPermission('hr.manage_department');
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [employeeOnboardings, setEmployeeOnboardings] = useState<EmployeeOnboarding[]>([]);
  const [myOnboardingItems, setMyOnboardingItems] = useState<OnboardingItemDisplay[]>([]);
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [onboardingToRemove, setOnboardingToRemove] = useState<string | null>(null);
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
    if (!company?.id || !canManageOnboarding) return;
    
    // Use the onboarding_progress view for pre-calculated data
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching employee onboardings:', error);
    } else {
      setEmployeeOnboardings(data || []);
    }
  };

  const fetchMyOnboarding = async () => {
    if (!user?.id) return;
    
    // Use the onboarding_progress view for my onboarding
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('profile_id', user.id)
      .eq('status', 'in_progress')
      .maybeSingle();
    
    if (onboardingError) {
      console.error('Error fetching my onboarding:', onboardingError);
      return;
    }
    
    setMyOnboarding(onboardingData);
    
    // Fetch onboarding items using the onboarding_item_details view if we have an onboarding
    if (onboardingData?.id) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('onboarding_item_details')
        .select('*')
        .eq('onboarding_id', onboardingData.id)
        .order('sort_order', { ascending: true });
      
      if (itemsError) {
        console.error('Error fetching onboarding items:', itemsError);
      } else {
        setMyOnboardingItems(itemsData || []);
      }
    } else {
      setMyOnboardingItems([]);
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
  }, [company?.id, user?.id, canManageOnboarding]);

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

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      // First delete template items
      const { error: itemsError } = await supabase
        .from('onboarding_template_items')
        .delete()
        .eq('template_id', templateId);

      if (itemsError) throw itemsError;

      // Then delete the template
      const { error } = await supabase
        .from('onboarding_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted');
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    }
  };

  const handleCompleteOnboarding = async (onboardingId: string) => {
    try {
      const { error } = await supabase
        .from('employee_onboarding')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', onboardingId);

      if (error) throw error;
      toast.success('Onboarding marked as complete');
      fetchEmployeeOnboardings();
      fetchMyOnboarding();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete onboarding');
    }
  };

  const handleRemoveOnboarding = async (onboardingId: string) => {
    try {
      // First delete onboarding items
      const { error: itemsError } = await supabase
        .from('employee_onboarding_items')
        .delete()
        .eq('onboarding_id', onboardingId);

      if (itemsError) throw itemsError;

      // Then delete the onboarding
      const { error } = await supabase
        .from('employee_onboarding')
        .delete()
        .eq('id', onboardingId);

      if (error) throw error;
      toast.success('Onboarding removed');
      fetchEmployeeOnboardings();
      fetchMyOnboarding();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove onboarding');
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

  // Progress is now pre-calculated in the view
  const getOnboardingProgress = (onboarding: EmployeeOnboarding | null) => {
    return onboarding?.progress_percentage ?? 0;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground">Manage employee onboarding checklists</p>
        </div>
        {canManageOnboarding && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
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
          <AssignOnboardingDialog templates={templates} onAssigned={() => { fetchEmployeeOnboardings(); fetchMyOnboarding(); }} />
          </div>
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
            <CardDescription>{myOnboarding.template_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">{getOnboardingProgress(myOnboarding)}%</span>
              </div>
              <Progress value={getOnboardingProgress(myOnboarding)} />
            </div>
            <div className="space-y-3">
              {myOnboardingItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <Checkbox
                    checked={item.is_completed ?? false}
                    onCheckedChange={(checked) => handleToggleOnboardingItem(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
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

      {canManageOnboarding && (
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
                        <div className="flex items-center gap-2">
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setTemplateToDelete(template.id);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
                      <div key={onboarding.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{onboarding.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{onboarding.template_name}</p>
                        </div>
                        <div className="w-32">
                          <Progress value={getOnboardingProgress(onboarding)} />
                        </div>
                        <Badge variant={onboarding.status === 'completed' ? 'default' : 'secondary'}>
                          {onboarding.status === 'completed' ? 'Completed' : `${getOnboardingProgress(onboarding)}%`}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onboarding.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleCompleteOnboarding(onboarding.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setOnboardingToRemove(onboarding.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete
                ? 'This will permanently delete the template and all its items. This action cannot be undone.'
                : 'This will remove the employee from onboarding. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setTemplateToDelete(null);
              setOnboardingToRemove(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (templateToDelete) {
                  handleDeleteTemplate(templateToDelete);
                } else if (onboardingToRemove) {
                  handleRemoveOnboarding(onboardingToRemove);
                }
                setTemplateToDelete(null);
                setOnboardingToRemove(null);
                setDeleteConfirmOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OnboardingPage;
