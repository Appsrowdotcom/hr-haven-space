import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw, Settings } from "lucide-react";

interface AttendanceSettingsProps {
  companyId: string;
}

export function AttendanceSettings({ companyId }: AttendanceSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    punch_api_key: "",
    punch_api_enabled: true,
    webhook_url: ""
  });
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [companyId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("company_attendance_settings")
        .select("*")
        .eq("company_id", companyId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          punch_api_key: data.punch_api_key,
          punch_api_enabled: data.punch_api_enabled,
          webhook_url: data.webhook_url || ""
        });
        setHasSettings(true);
      } else {
        // Generate a default API key
        setSettings(prev => ({
          ...prev,
          punch_api_key: generateApiKey()
        }));
        setHasSettings(false);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load attendance settings");
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "pk_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (hasSettings) {
        const { error } = await supabase
          .from("company_attendance_settings")
          .update({
            punch_api_key: settings.punch_api_key,
            punch_api_enabled: settings.punch_api_enabled,
            webhook_url: settings.webhook_url || null
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_attendance_settings")
          .insert({
            company_id: companyId,
            punch_api_key: settings.punch_api_key,
            punch_api_enabled: settings.punch_api_enabled,
            webhook_url: settings.webhook_url || null
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
        setHasSettings(true);
      }

      toast.success("Attendance settings saved");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = () => {
    setSettings(prev => ({
      ...prev,
      punch_api_key: generateApiKey()
    }));
    toast.info("New API key generated. Remember to save and update your punch device.");
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(settings.punch_api_key);
    toast.success("API key copied to clipboard");
  };

  const handleCopyCompanyId = () => {
    navigator.clipboard.writeText(companyId);
    toast.success("Company ID copied to clipboard");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Punch API Settings
        </CardTitle>
        <CardDescription>
          Configure your attendance punch device API integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="api-enabled">Enable Punch API</Label>
            <p className="text-sm text-muted-foreground">
              Allow punch devices to send attendance data
            </p>
          </div>
          <Switch
            id="api-enabled"
            checked={settings.punch_api_enabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, punch_api_enabled: checked }))
            }
          />
        </div>

        {/* Company ID */}
        <div className="space-y-2">
          <Label>Company ID</Label>
          <div className="flex gap-2">
            <Input
              value={companyId}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button variant="outline" size="icon" onClick={handleCopyCompanyId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Use this in the <code className="bg-muted px-1 rounded">x-company-id</code> header
          </p>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                value={settings.punch_api_key}
                readOnly
                className="font-mono text-sm pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopyKey}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRegenerateKey}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Use this in the <code className="bg-muted px-1 rounded">x-api-key</code> header
          </p>
        </div>

        {/* Webhook URL (optional) */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://your-system.com/webhook"
            value={settings.webhook_url}
            onChange={(e) => 
              setSettings(prev => ({ ...prev, webhook_url: e.target.value }))
            }
          />
          <p className="text-sm text-muted-foreground">
            Receive notifications when punches are recorded
          </p>
        </div>

        {/* API Documentation */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <h4 className="font-medium">API Endpoint</h4>
          <code className="block text-sm bg-background p-2 rounded overflow-x-auto">
            POST {window.location.origin.replace('localhost', 'your-project-id.supabase.co')}/functions/v1/attendance-punch
          </code>
          
          <h4 className="font-medium mt-4">Required Headers</h4>
          <pre className="text-sm bg-background p-2 rounded overflow-x-auto">
{`x-api-key: ${showApiKey ? settings.punch_api_key : '••••••••••••••••'}
x-company-id: ${companyId}
Content-Type: application/json`}
          </pre>
          
          <h4 className="font-medium mt-4">Request Body</h4>
          <pre className="text-sm bg-background p-2 rounded overflow-x-auto">
{`{
  "card_id": "CARD123",
  "punch_time": "2024-01-15T09:00:00Z",  // optional
  "device_id": "DEVICE001",              // optional
  "device_location": "Main Entrance",    // optional
  "punch_type": "in"                     // optional: "in" or "out"
}`}
          </pre>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
