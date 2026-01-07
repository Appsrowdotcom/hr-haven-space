-- Create attendance_policies table for policy-driven attendance rules
CREATE TABLE public.attendance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Policy',
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Working schedule
  working_days JSONB NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
  shift_start_time TIME NOT NULL DEFAULT '09:00:00',
  shift_end_time TIME NOT NULL DEFAULT '18:00:00',
  min_work_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  
  -- Grace period rules
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  
  -- Late arrival rules
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  late_deduction_enabled BOOLEAN NOT NULL DEFAULT false,
  late_deduction_per_instance NUMERIC(8,2) NOT NULL DEFAULT 0,
  max_late_per_month INTEGER NOT NULL DEFAULT 3,
  
  -- Early exit rules  
  early_exit_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  early_exit_deduction_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Short hours rules
  short_hours_threshold NUMERIC(4,2) NOT NULL DEFAULT 4.0,
  
  -- Auto half-day rules
  auto_half_day_enabled BOOLEAN NOT NULL DEFAULT true,
  half_day_min_hours NUMERIC(4,2) NOT NULL DEFAULT 4.0,
  half_day_max_hours NUMERIC(4,2) NOT NULL DEFAULT 6.0,
  
  -- Auto absent rules
  auto_absent_enabled BOOLEAN NOT NULL DEFAULT true,
  absent_if_no_punch BOOLEAN NOT NULL DEFAULT true,
  absent_if_less_than_hours NUMERIC(4,2) NOT NULL DEFAULT 4.0,
  
  -- Overtime rules
  overtime_enabled BOOLEAN NOT NULL DEFAULT false,
  overtime_after_hours NUMERIC(4,2) NOT NULL DEFAULT 9.0,
  overtime_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.5,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, name)
);

-- Create attendance_overrides table for manual attendance corrections
CREATE TABLE public.attendance_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  original_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  original_check_in TIMESTAMP WITH TIME ZONE,
  new_check_in TIMESTAMP WITH TIME ZONE,
  original_check_out TIMESTAMP WITH TIME ZONE,
  new_check_out TIMESTAMP WITH TIME ZONE,
  original_work_hours NUMERIC(4,2),
  new_work_hours NUMERIC(4,2),
  reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_overrides ENABLE ROW LEVEL SECURITY;

-- RLS for attendance_policies
CREATE POLICY "Users can view policies in their company"
ON public.attendance_policies FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage attendance policies"
ON public.attendance_policies FOR ALL
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS for attendance_overrides
CREATE POLICY "Users can view overrides for their attendance"
ON public.attendance_overrides FOR SELECT
USING (profile_id = auth.uid() OR 
       profile_id IN (SELECT id FROM public.profiles WHERE company_id IN 
         (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Authorized users can create overrides"
ON public.attendance_overrides FOR INSERT
WITH CHECK (overridden_by = auth.uid());

-- Create indexes
CREATE INDEX idx_attendance_policies_company_id ON public.attendance_policies(company_id);
CREATE INDEX idx_attendance_overrides_attendance_id ON public.attendance_overrides(attendance_id);
CREATE INDEX idx_attendance_overrides_profile_id ON public.attendance_overrides(profile_id);

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_policies_updated_at
  BEFORE UPDATE ON public.attendance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();