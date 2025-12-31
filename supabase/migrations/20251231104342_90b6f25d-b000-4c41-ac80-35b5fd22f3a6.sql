-- Add monthly leave credit rate to leave_types
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS monthly_credit numeric(4,2) DEFAULT 1.5;

-- Add advance leave control to leave_policies
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS allow_advance_leave boolean DEFAULT false;

-- Update leave_balances to track accrued vs available
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS accrued_days numeric(5,2) DEFAULT 0;

-- Create a function to calculate accrued leave days for an employee
CREATE OR REPLACE FUNCTION public.calculate_accrued_leave(
  _profile_id uuid,
  _leave_type_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _date_of_joining date;
  _months_employed integer;
  _leave_credit_start_month integer;
  _monthly_credit numeric;
  _employee_category employee_category;
  _accrual_months integer;
  _accrued numeric;
  _company_id uuid;
BEGIN
  -- Get employee details
  SELECT date_of_joining INTO _date_of_joining
  FROM employee_details WHERE profile_id = _profile_id;
  
  SELECT employee_category, company_id INTO _employee_category, _company_id
  FROM profiles WHERE id = _profile_id;
  
  -- Trainees and Interns get no accrual
  IF _employee_category IN ('trainee', 'intern') THEN
    RETURN 0;
  END IF;
  
  -- If no joining date, no accrual
  IF _date_of_joining IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get company policy
  SELECT leave_credit_start_month INTO _leave_credit_start_month
  FROM leave_policies WHERE company_id = _company_id;
  
  IF _leave_credit_start_month IS NULL THEN
    _leave_credit_start_month := 4; -- Default to month 4
  END IF;
  
  -- Get monthly credit for leave type
  SELECT COALESCE(monthly_credit, 1.5) INTO _monthly_credit
  FROM leave_types WHERE id = _leave_type_id;
  
  -- Calculate months employed
  _months_employed := EXTRACT(YEAR FROM age(CURRENT_DATE, _date_of_joining)) * 12 +
                      EXTRACT(MONTH FROM age(CURRENT_DATE, _date_of_joining)) + 1;
  
  -- Calculate accrual months (months since credit start)
  IF _months_employed < _leave_credit_start_month THEN
    RETURN 0;
  END IF;
  
  _accrual_months := _months_employed - _leave_credit_start_month + 1;
  
  -- Calculate accrued days
  _accrued := _accrual_months * _monthly_credit;
  
  RETURN _accrued;
END;
$$;