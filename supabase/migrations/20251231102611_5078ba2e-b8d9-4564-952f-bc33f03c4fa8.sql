-- Add columns to leave_requests for policy enforcement
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'planned' CHECK (request_type IN ('planned', 'unplanned', 'emergency')),
ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS manager_approved boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS manager_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hr_approved boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hr_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS hr_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_unpaid_reason text,
ADD COLUMN IF NOT EXISTS requires_hr_approval boolean NOT NULL DEFAULT false;

-- Create leave policies table for company-level configuration
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  min_days_advance_planned integer NOT NULL DEFAULT 2,
  probation_months integer NOT NULL DEFAULT 3,
  leave_credit_start_month integer NOT NULL DEFAULT 4,
  allow_negative_balance boolean NOT NULL DEFAULT false,
  emergency_default_unpaid boolean NOT NULL DEFAULT true,
  unplanned_default_unpaid boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS on leave_policies
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_policies
CREATE POLICY "Users can view their company leave policies"
ON public.leave_policies
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "HR/Admins can manage leave policies"
ON public.leave_policies
FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR')))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR')));

-- Create function to check if employee is eligible for paid leave
CREATE OR REPLACE FUNCTION public.is_eligible_for_paid_leave(_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee_category employee_category;
  _date_of_joining date;
  _months_employed integer;
BEGIN
  -- Get employee category
  SELECT employee_category INTO _employee_category
  FROM profiles WHERE id = _profile_id;
  
  -- Trainees and Interns never get paid leave
  IF _employee_category IN ('trainee', 'intern') THEN
    RETURN false;
  END IF;
  
  -- Get date of joining
  SELECT date_of_joining INTO _date_of_joining
  FROM employee_details WHERE profile_id = _profile_id;
  
  -- If no joining date, assume not eligible
  IF _date_of_joining IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate months employed
  _months_employed := EXTRACT(YEAR FROM age(CURRENT_DATE, _date_of_joining)) * 12 +
                      EXTRACT(MONTH FROM age(CURRENT_DATE, _date_of_joining));
  
  -- Probation employees in first 3 months don't get paid leave
  IF _employee_category = 'probation' AND _months_employed < 3 THEN
    RETURN false;
  END IF;
  
  -- Confirmed employees or probation > 3 months are eligible
  RETURN true;
END;
$$;

-- Create function to get months of employment
CREATE OR REPLACE FUNCTION public.get_months_employed(_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _date_of_joining date;
BEGIN
  SELECT date_of_joining INTO _date_of_joining
  FROM employee_details WHERE profile_id = _profile_id;
  
  IF _date_of_joining IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, _date_of_joining)) * 12 +
         EXTRACT(MONTH FROM age(CURRENT_DATE, _date_of_joining));
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_leave_policies_updated_at
BEFORE UPDATE ON public.leave_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();