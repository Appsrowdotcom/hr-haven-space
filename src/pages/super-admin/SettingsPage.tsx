import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Palette, 
  Shield, 
  Package, 
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
}

const MODULE_OPTIONS = [
  { code: 'HR_CORE', label: 'HR Core', required: true },
  { code: 'ATTENDANCE', label: 'Attendance' },
  { code: 'LEAVE', label: 'Leave Management' },
  { code: 'FINANCE', label: 'Finance' },
  { code: 'REVENUE', label: 'Revenue' },
  { code: 'SALES_CRM', label: 'Sales CRM' },
  { code: 'COMPLIANCE', label: 'Compliance' },
  { code: 'ADMIN', label: 'Admin', required: true },
];

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, PlatformSetting>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form states
  const [platformName, setPlatformName] = useState('');
  const [platformLogoUrl, setPlatformLogoUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);
  const [defaultModules, setDefaultModules] = useState<string[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState(480);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, PlatformSetting> = {};
      data?.forEach(setting => {
        settingsMap[setting.key] = setting;
      });
      setSettings(settingsMap);

      // Populate form states
      setPlatformName(JSON.parse(settingsMap.platform_name?.value || '""') || '');
      setPlatformLogoUrl(JSON.parse(settingsMap.platform_logo_url?.value || 'null') || '');
      setSupportEmail(JSON.parse(settingsMap.support_email?.value || '""') || '');
      setDefaultTrialDays(JSON.parse(settingsMap.default_trial_days?.value || '14'));
      setDefaultModules(JSON.parse(settingsMap.default_modules?.value || '["HR_CORE", "ADMIN"]'));
      setSessionTimeout(JSON.parse(settingsMap.session_timeout_minutes?.value || '480'));
      setMaxLoginAttempts(JSON.parse(settingsMap.max_login_attempts?.value || '5'));
      setPasswordMinLength(JSON.parse(settingsMap.password_min_length?.value || '8'));
      setRequireEmailVerification(JSON.parse(settingsMap.require_email_verification?.value || 'false'));
      setMaintenanceMode(JSON.parse(settingsMap.maintenance_mode?.value || 'false'));
      setMaintenanceMessage(JSON.parse(settingsMap.maintenance_message?.value || '""') || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: JSON.stringify(value) })
      .eq('key', key);

    if (error) throw error;
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting('platform_name', platformName),
        updateSetting('platform_logo_url', platformLogoUrl || null),
        updateSetting('support_email', supportEmail),
        updateSetting('default_trial_days', defaultTrialDays),
        updateSetting('default_modules', defaultModules),
        updateSetting('session_timeout_minutes', sessionTimeout),
        updateSetting('max_login_attempts', maxLoginAttempts),
        updateSetting('password_min_length', passwordMinLength),
        updateSetting('require_email_verification', requireEmailVerification),
        updateSetting('maintenance_mode', maintenanceMode),
        updateSetting('maintenance_message', maintenanceMessage),
      ]);

      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModuleToggle = (moduleCode: string) => {
    const module = MODULE_OPTIONS.find(m => m.code === moduleCode);
    if (module?.required) return;

    setHasChanges(true);
    if (defaultModules.includes(moduleCode)) {
      setDefaultModules(defaultModules.filter(m => m !== moduleCode));
    } else {
      setDefaultModules([...defaultModules, moduleCode]);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Platform configuration and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={isSaving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Package className="h-4 w-4" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Platform Branding</CardTitle>
                  <CardDescription>Customize the platform appearance and identity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input
                    id="platform-name"
                    value={platformName}
                    onChange={(e) => { setPlatformName(e.target.value); setHasChanges(true); }}
                    placeholder="Enter platform name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in the header and emails
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input
                    id="logo-url"
                    value={platformLogoUrl}
                    onChange={(e) => { setPlatformLogoUrl(e.target.value); setHasChanges(true); }}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to the platform logo image
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => { setSupportEmail(e.target.value); setHasChanges(true); }}
                  placeholder="support@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Contact email displayed to users for support
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Default Company Settings</CardTitle>
                  <CardDescription>Configure defaults for new company registrations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="trial-days">Default Trial Period (days)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={0}
                  max={365}
                  value={defaultTrialDays}
                  onChange={(e) => { setDefaultTrialDays(parseInt(e.target.value) || 0); setHasChanges(true); }}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Number of days for the free trial period
                </p>
              </div>

              <div className="space-y-3">
                <Label>Default Enabled Modules</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Modules that will be enabled by default for new companies
                </p>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {MODULE_OPTIONS.map(module => (
                    <div
                      key={module.code}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        defaultModules.includes(module.code)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/50 border-border hover:border-primary/50'
                      } ${module.required ? 'opacity-75 cursor-not-allowed' : ''}`}
                      onClick={() => handleModuleToggle(module.code)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{module.label}</span>
                        {module.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <Switch
                          checked={defaultModules.includes(module.code)}
                          disabled={module.required}
                          onCheckedChange={() => handleModuleToggle(module.code)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure platform-wide security policies</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    min={15}
                    max={1440}
                    value={sessionTimeout}
                    onChange={(e) => { setSessionTimeout(parseInt(e.target.value) || 480); setHasChanges(true); }}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before inactive sessions expire
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-login">Max Login Attempts</Label>
                  <Input
                    id="max-login"
                    type="number"
                    min={3}
                    max={10}
                    value={maxLoginAttempts}
                    onChange={(e) => { setMaxLoginAttempts(parseInt(e.target.value) || 5); setHasChanges(true); }}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Failed attempts before account lockout
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-length">Minimum Password Length</Label>
                  <Input
                    id="password-length"
                    type="number"
                    min={6}
                    max={32}
                    value={passwordMinLength}
                    onChange={(e) => { setPasswordMinLength(parseInt(e.target.value) || 8); setHasChanges(true); }}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum characters required for passwords
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Email Verification</Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={requireEmailVerification}
                      onCheckedChange={(checked) => { setRequireEmailVerification(checked); setHasChanges(true); }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {requireEmailVerification ? 'Required' : 'Not required'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Require users to verify email before access
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card className={maintenanceMode ? 'border-destructive' : ''}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${maintenanceMode ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                  <AlertTriangle className={`h-5 w-5 ${maintenanceMode ? 'text-destructive' : 'text-primary'}`} />
                </div>
                <div>
                  <CardTitle>Maintenance Mode</CardTitle>
                  <CardDescription>Control platform availability</CardDescription>
                </div>
                {maintenanceMode && (
                  <Badge variant="destructive" className="ml-auto">Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div>
                  <p className="font-medium">Enable Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, only super admins can access the platform
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={(checked) => { setMaintenanceMode(checked); setHasChanges(true); }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea
                  id="maintenance-message"
                  value={maintenanceMessage}
                  onChange={(e) => { setMaintenanceMessage(e.target.value); setHasChanges(true); }}
                  placeholder="Enter the message to display during maintenance"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be shown to users during maintenance
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Platform status and diagnostics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Platform Version</p>
                  <p className="text-lg font-semibold">1.0.0</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Environment</p>
                  <p className="text-lg font-semibold">Production</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}