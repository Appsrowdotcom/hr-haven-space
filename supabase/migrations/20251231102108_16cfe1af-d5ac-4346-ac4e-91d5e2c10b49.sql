-- Create table for company attendance settings including API keys
CREATE TABLE public.company_attendance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  punch_api_key text NOT NULL,
  punch_api_enabled boolean NOT NULL DEFAULT true,
  webhook_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_attendance_settings ENABLE ROW LEVEL SECURITY;

-- Policies for company attendance settings
CREATE POLICY "Company admins can manage attendance settings"
ON public.company_attendance_settings
FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND is_company_admin(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_company_admin(auth.uid()));

CREATE POLICY "HR can view attendance settings"
ON public.company_attendance_settings
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR')));

-- Create trigger for updated_at
CREATE TRIGGER update_company_attendance_settings_updated_at
BEFORE UPDATE ON public.company_attendance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();