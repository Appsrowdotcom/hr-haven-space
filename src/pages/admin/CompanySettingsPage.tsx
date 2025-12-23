import React, { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'sonner';
import { Building2, Palette, Save, Loader2 } from 'lucide-react';

const CompanySettingsPage: React.FC = () => {
  const { company, branding, refreshCompany, isLoading } = useCompany();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: company?.name || '',
    legal_name: company?.legal_name || '',
    industry: company?.industry || '',
    size: company?.size || '',
  });

  // Branding form state
  const [brandingForm, setBrandingForm] = useState({
    primary_color: branding?.primary_color || '222.2 47.4% 11.2%',
    secondary_color: branding?.secondary_color || '210 40% 96.1%',
    accent_color: branding?.accent_color || '210 40% 96.1%',
    background_color: branding?.background_color || '0 0% 100%',
    foreground_color: branding?.foreground_color || '222.2 47.4% 11.2%',
    font_heading: branding?.font_heading || 'Inter',
    font_body: branding?.font_body || 'Inter',
    border_radius: branding?.border_radius || '0.5rem',
    logo_url: branding?.logo_url || '',
    logo_dark_url: branding?.logo_dark_url || '',
    favicon_url: branding?.favicon_url || '',
  });

  React.useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        legal_name: company.legal_name || '',
        industry: company.industry || '',
        size: company.size || '',
      });
    }
  }, [company]);

  React.useEffect(() => {
    if (branding) {
      setBrandingForm({
        primary_color: branding.primary_color || '222.2 47.4% 11.2%',
        secondary_color: branding.secondary_color || '210 40% 96.1%',
        accent_color: branding.accent_color || '210 40% 96.1%',
        background_color: branding.background_color || '0 0% 100%',
        foreground_color: branding.foreground_color || '222.2 47.4% 11.2%',
        font_heading: branding.font_heading || 'Inter',
        font_body: branding.font_body || 'Inter',
        border_radius: branding.border_radius || '0.5rem',
        logo_url: branding.logo_url || '',
        logo_dark_url: branding.logo_dark_url || '',
        favicon_url: branding.favicon_url || '',
      });
    }
  }, [branding]);

  const handleSaveCompany = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyForm.name,
          legal_name: companyForm.legal_name,
          industry: companyForm.industry,
          size: companyForm.size,
        })
        .eq('id', company.id);

      if (error) throw error;
      await refreshCompany();
      toast.success('Company details saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save company details');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_branding')
        .update({
          primary_color: brandingForm.primary_color,
          secondary_color: brandingForm.secondary_color,
          accent_color: brandingForm.accent_color,
          background_color: brandingForm.background_color,
          foreground_color: brandingForm.foreground_color,
          font_heading: brandingForm.font_heading,
          font_body: brandingForm.font_body,
          border_radius: brandingForm.border_radius,
          logo_url: brandingForm.logo_url || null,
          logo_dark_url: brandingForm.logo_dark_url || null,
          favicon_url: brandingForm.favicon_url || null,
        })
        .eq('company_id', company.id);

      if (error) throw error;
      await refreshCompany();
      toast.success('Branding saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Consulting',
    'Other',
  ];

  const companySizes = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+',
  ];

  const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company profile and branding</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>
                Update your company information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name</Label>
                  <Input
                    id="legal_name"
                    value={companyForm.legal_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                    placeholder="Enter legal name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={companyForm.industry}
                    onValueChange={(value) => setCompanyForm({ ...companyForm, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <Select
                    value={companyForm.size}
                    onValueChange={(value) => setCompanyForm({ ...companyForm, size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizes.map((size) => (
                        <SelectItem key={size} value={size}>{size} employees</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveCompany} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Colors</CardTitle>
                <CardDescription>Customize your brand colors using the color picker or hex code</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorPicker
                    label="Primary Color"
                    value={brandingForm.primary_color}
                    onChange={(value) => setBrandingForm({ ...brandingForm, primary_color: value })}
                  />
                  <ColorPicker
                    label="Secondary Color"
                    value={brandingForm.secondary_color}
                    onChange={(value) => setBrandingForm({ ...brandingForm, secondary_color: value })}
                  />
                  <ColorPicker
                    label="Accent Color"
                    value={brandingForm.accent_color}
                    onChange={(value) => setBrandingForm({ ...brandingForm, accent_color: value })}
                  />
                  <ColorPicker
                    label="Background Color"
                    value={brandingForm.background_color}
                    onChange={(value) => setBrandingForm({ ...brandingForm, background_color: value })}
                  />
                  <ColorPicker
                    label="Foreground Color"
                    value={brandingForm.foreground_color}
                    onChange={(value) => setBrandingForm({ ...brandingForm, foreground_color: value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography & Style</CardTitle>
                <CardDescription>Configure fonts and border radius</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="font_heading">Heading Font</Label>
                    <Select
                      value={brandingForm.font_heading}
                      onValueChange={(value) => setBrandingForm({ ...brandingForm, font_heading: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fonts.map((font) => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="font_body">Body Font</Label>
                    <Select
                      value={brandingForm.font_body}
                      onValueChange={(value) => setBrandingForm({ ...brandingForm, font_body: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fonts.map((font) => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="border_radius">Border Radius</Label>
                    <Select
                      value={brandingForm.border_radius}
                      onValueChange={(value) => setBrandingForm({ ...brandingForm, border_radius: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None (0)</SelectItem>
                        <SelectItem value="0.25rem">Small (0.25rem)</SelectItem>
                        <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                        <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                        <SelectItem value="1rem">Extra Large (1rem)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Logos</CardTitle>
                <CardDescription>Upload your company logos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      value={brandingForm.logo_url}
                      onChange={(e) => setBrandingForm({ ...brandingForm, logo_url: e.target.value })}
                      placeholder="https://..."
                    />
                    {brandingForm.logo_url && (
                      <img src={brandingForm.logo_url} alt="Logo" className="h-12 object-contain" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo_dark_url">Dark Mode Logo URL</Label>
                    <Input
                      id="logo_dark_url"
                      value={brandingForm.logo_dark_url}
                      onChange={(e) => setBrandingForm({ ...brandingForm, logo_dark_url: e.target.value })}
                      placeholder="https://..."
                    />
                    {brandingForm.logo_dark_url && (
                      <div className="bg-muted p-2 rounded">
                        <img src={brandingForm.logo_dark_url} alt="Dark Logo" className="h-12 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favicon_url">Favicon URL</Label>
                    <Input
                      id="favicon_url"
                      value={brandingForm.favicon_url}
                      onChange={(e) => setBrandingForm({ ...brandingForm, favicon_url: e.target.value })}
                      placeholder="https://..."
                    />
                    {brandingForm.favicon_url && (
                      <img src={brandingForm.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
                    )}
                  </div>
                </div>
                <Button onClick={handleSaveBranding} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Branding
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanySettingsPage;
