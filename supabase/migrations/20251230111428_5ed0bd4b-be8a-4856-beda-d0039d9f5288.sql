-- Create platform_settings table for super admin configuration
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage platform settings
CREATE POLICY "Super admins can view platform settings"
ON public.platform_settings
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
  ('platform_name', '"HR Platform"', 'Name of the platform displayed in UI', 'branding'),
  ('platform_logo_url', 'null', 'URL of the platform logo', 'branding'),
  ('support_email', '"support@example.com"', 'Support contact email address', 'contact'),
  ('default_trial_days', '14', 'Default trial period for new companies (days)', 'billing'),
  ('default_modules', '["HR_CORE", "ADMIN"]', 'Default modules enabled for new companies', 'modules'),
  ('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours default)', 'security'),
  ('max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'security'),
  ('password_min_length', '8', 'Minimum password length requirement', 'security'),
  ('require_email_verification', 'false', 'Require email verification for new users', 'security'),
  ('maintenance_mode', 'false', 'Enable maintenance mode (blocks all non-super-admin access)', 'system'),
  ('maintenance_message', '"The platform is currently under maintenance. Please try again later."', 'Message shown during maintenance', 'system');