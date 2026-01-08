import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Building2, Phone, Mail, MapPin, Calendar, Briefcase, Shield, Save, Loader2, Lock } from 'lucide-react';
import ChangePassword from '@/components/profile/ChangePassword';

interface EmployeeDetails {
  designation: string | null;
  date_of_joining: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  employment_type: string | null;
  work_location: string | null;
}

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { company } = useCompany();
  const [isLoading, setIsLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const [detailsForm, setDetailsForm] = useState<EmployeeDetails>({
    designation: null,
    date_of_joining: null,
    date_of_birth: null,
    gender: null,
    marital_status: null,
    nationality: null,
    address: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relation: null,
    employment_type: null,
    work_location: null,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
      fetchEmployeeDetails();
    }
  }, [profile]);

  const fetchEmployeeDetails = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employee_details')
      .select('*')
      .eq('profile_id', user.id)
      .single();

    if (!error && data) {
      setEmployeeDetails(data);
      setDetailsForm({
        designation: data.designation,
        date_of_joining: data.date_of_joining,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        marital_status: data.marital_status,
        nationality: data.nationality,
        address: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relation: data.emergency_contact_relation,
        employment_type: data.employment_type,
        work_location: data.work_location,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
      refreshProfile?.();
    }

    setIsLoading(false);
  };

  const handleSaveDetails = async () => {
    if (!user) return;
    setIsLoading(true);

    if (employeeDetails) {
      // Update existing
      const { error } = await supabase
        .from('employee_details')
        .update(detailsForm)
        .eq('profile_id', user.id);

      if (error) {
        toast.error('Failed to update details');
      } else {
        toast.success('Details updated successfully');
      }
    }

    setIsLoading(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left space-y-1">
              <h1 className="text-2xl font-bold">{profile?.full_name || 'User'}</h1>
              <p className="text-muted-foreground">{detailsForm.designation || 'Employee'}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </span>
                {company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {company.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">
            <User className="h-4 w-4 mr-2" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="employment">
            <Briefcase className="h-4 w-4 mr-2" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="personal">
            <Shield className="h-4 w-4 mr-2" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="emergency">
            <Phone className="h-4 w-4 mr-2" />
            Emergency
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Basic Info */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Info */}
        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle>Employment Information</CardTitle>
              <CardDescription>
                Your employment details (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input value={detailsForm.designation || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Input value={detailsForm.employment_type || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Date of Joining</Label>
                  <Input value={detailsForm.date_of_joining || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Work Location</Label>
                  <Input value={detailsForm.work_location || ''} disabled />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Contact HR to update employment information.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Info */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={detailsForm.date_of_birth || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={detailsForm.gender || ''}
                    onValueChange={(value) => setDetailsForm({ ...detailsForm, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select
                    value={detailsForm.marital_status || ''}
                    onValueChange={(value) => setDetailsForm({ ...detailsForm, marital_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input
                    value={detailsForm.nationality || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, nationality: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={detailsForm.address || ''}
                  onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={detailsForm.city || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={detailsForm.state || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={detailsForm.postal_code || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, postal_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={detailsForm.country || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, country: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <Button onClick={handleSaveDetails} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contact */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>
                Update your emergency contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={detailsForm.emergency_contact_name || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={detailsForm.emergency_contact_phone || ''}
                    onChange={(e) => setDetailsForm({ ...detailsForm, emergency_contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={detailsForm.emergency_contact_relation || ''}
                    onValueChange={(value) => setDetailsForm({ ...detailsForm, emergency_contact_relation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <Button onClick={handleSaveDetails} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <ChangePassword />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
