-- Create attendance_punches table for multiple punch entries per day
CREATE TABLE public.attendance_punches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  punch_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  punch_type TEXT NOT NULL CHECK (punch_type IN ('in', 'out')),
  card_id TEXT,
  device_id TEXT,
  device_location TEXT,
  source TEXT NOT NULL DEFAULT 'card' CHECK (source IN ('card', 'manual', 'web', 'mobile')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_attendance_punches_profile_date ON public.attendance_punches(profile_id, punch_time);
CREATE INDEX idx_attendance_punches_card ON public.attendance_punches(card_id);

-- Enable RLS
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_punches
CREATE POLICY "Users can view their own punches"
ON public.attendance_punches
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "HR/Admins can view all punches"
ON public.attendance_punches
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = attendance_punches.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can insert punches"
ON public.attendance_punches
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = attendance_punches.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can update punches"
ON public.attendance_punches
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = attendance_punches.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can delete punches"
ON public.attendance_punches
FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = attendance_punches.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Create employee_cards table to map card IDs to employees
CREATE TABLE public.employee_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  card_type TEXT DEFAULT 'rfid',
  is_active BOOLEAN NOT NULL DEFAULT true,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id)
);

-- Create index
CREATE INDEX idx_employee_cards_card_id ON public.employee_cards(card_id);
CREATE INDEX idx_employee_cards_profile ON public.employee_cards(profile_id);

-- Enable RLS
ALTER TABLE public.employee_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_cards
CREATE POLICY "Users can view their own cards"
ON public.employee_cards
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "HR/Admins can manage employee cards"
ON public.employee_cards
FOR ALL
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_cards.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_cards.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Add trigger for updated_at
CREATE TRIGGER update_employee_cards_updated_at
  BEFORE UPDATE ON public.employee_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();