-- =============================================
-- PAYROLL MODULE DATABASE SCHEMA
-- =============================================

-- Payroll Settings for company (cycle, settings)
CREATE TABLE public.payroll_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pay_cycle text NOT NULL DEFAULT 'monthly', -- monthly, bi-weekly, weekly, custom
  pay_day integer NOT NULL DEFAULT 1, -- Day of month for monthly, or day of week for others
  currency text NOT NULL DEFAULT 'INR',
  pf_enabled boolean NOT NULL DEFAULT true,
  pf_employee_rate numeric NOT NULL DEFAULT 12, -- percentage
  pf_employer_rate numeric NOT NULL DEFAULT 12, -- percentage
  pf_limit numeric NOT NULL DEFAULT 15000, -- Max basic salary for PF calculation
  esi_enabled boolean NOT NULL DEFAULT true,
  esi_employee_rate numeric NOT NULL DEFAULT 0.75, -- percentage
  esi_employer_rate numeric NOT NULL DEFAULT 3.25, -- percentage
  esi_limit numeric NOT NULL DEFAULT 21000, -- Max gross salary for ESI eligibility
  professional_tax_enabled boolean NOT NULL DEFAULT false,
  tds_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Salary Components (earnings and deductions)
CREATE TABLE public.salary_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL, -- e.g., BASIC, HRA, CONV, PF, TDS
  type text NOT NULL CHECK (type IN ('earning', 'deduction')),
  calculation_type text NOT NULL DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage', 'formula')),
  percentage_of text, -- If percentage, which component (e.g., 'BASIC')
  percentage_value numeric, -- The percentage value
  is_taxable boolean NOT NULL DEFAULT true,
  is_pf_applicable boolean NOT NULL DEFAULT false,
  is_esi_applicable boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false, -- System components like PF, ESI can't be deleted
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Employee Salary Structure
CREATE TABLE public.employee_salaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date, -- NULL means current
  gross_salary numeric NOT NULL DEFAULT 0,
  ctc numeric NOT NULL DEFAULT 0,
  bank_account_number text,
  bank_name text,
  ifsc_code text,
  pan_number text,
  pf_number text,
  esi_number text,
  uan_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employee Salary Component Breakdown
CREATE TABLE public.employee_salary_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_salary_id uuid NOT NULL REFERENCES public.employee_salaries(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.salary_components(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_salary_id, component_id)
);

-- Payroll Runs
CREATE TABLE public.payroll_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  pay_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'processed', 'approved', 'paid', 'cancelled')),
  total_gross numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  total_employer_cost numeric NOT NULL DEFAULT 0,
  employee_count integer NOT NULL DEFAULT 0,
  processed_by uuid REFERENCES public.profiles(id),
  processed_at timestamp with time zone,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Payslips (individual employee records for a payroll run)
CREATE TABLE public.payslips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_salary_id uuid REFERENCES public.employee_salaries(id),
  
  -- Snapshot data at time of payroll
  employee_name text NOT NULL,
  employee_email text NOT NULL,
  department_name text,
  designation text,
  bank_account_number text,
  bank_name text,
  ifsc_code text,
  pan_number text,
  pf_number text,
  esi_number text,
  uan_number text,
  
  -- Pay period
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  working_days integer NOT NULL DEFAULT 0,
  days_worked integer NOT NULL DEFAULT 0,
  days_on_leave integer NOT NULL DEFAULT 0,
  lop_days integer NOT NULL DEFAULT 0, -- Loss of Pay days
  
  -- Amounts
  gross_earnings numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  employer_pf numeric NOT NULL DEFAULT 0,
  employer_esi numeric NOT NULL DEFAULT 0,
  employer_cost numeric NOT NULL DEFAULT 0,
  
  -- Tax info
  taxable_income numeric NOT NULL DEFAULT 0,
  tds_amount numeric NOT NULL DEFAULT 0,
  
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'paid', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(payroll_run_id, profile_id)
);

-- Payslip Line Items (detailed breakdown)
CREATE TABLE public.payslip_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payslip_id uuid NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.salary_components(id),
  component_name text NOT NULL,
  component_code text NOT NULL,
  type text NOT NULL CHECK (type IN ('earning', 'deduction', 'employer_contribution')),
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tax slabs for TDS calculation (Indian tax regime)
CREATE TABLE public.tax_slabs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  financial_year text NOT NULL, -- e.g., '2024-25'
  regime text NOT NULL DEFAULT 'new' CHECK (regime IN ('old', 'new')),
  min_income numeric NOT NULL,
  max_income numeric, -- NULL for last slab
  tax_rate numeric NOT NULL, -- percentage
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employee Tax Declarations (for old regime)
CREATE TABLE public.employee_tax_declarations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  financial_year text NOT NULL,
  regime text NOT NULL DEFAULT 'new' CHECK (regime IN ('old', 'new')),
  section_80c numeric NOT NULL DEFAULT 0,
  section_80d numeric NOT NULL DEFAULT 0,
  section_80g numeric NOT NULL DEFAULT 0,
  hra_exemption numeric NOT NULL DEFAULT 0,
  lta_exemption numeric NOT NULL DEFAULT 0,
  other_exemptions numeric NOT NULL DEFAULT 0,
  total_declarations numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, financial_year)
);

-- Enable RLS on all tables
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tax_declarations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Payroll Settings
CREATE POLICY "Users can view company payroll settings" ON public.payroll_settings
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage payroll settings" ON public.payroll_settings
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) 
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Salary Components
CREATE POLICY "Users can view company salary components" ON public.salary_components
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Payroll managers can manage salary components" ON public.salary_components
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) 
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Employee Salaries
CREATE POLICY "Users can view their own salary" ON public.employee_salaries
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Payroll managers can view all salaries" ON public.employee_salaries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = employee_salaries.profile_id AND p.company_id = get_user_company_id(auth.uid()))
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll') OR has_permission(auth.uid(), 'finance.view_payroll'))
  );

CREATE POLICY "Payroll managers can manage salaries" ON public.employee_salaries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = employee_salaries.profile_id AND p.company_id = get_user_company_id(auth.uid()))
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Employee Salary Components
CREATE POLICY "Users can view their own salary components" ON public.employee_salary_components
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employee_salaries es WHERE es.id = employee_salary_components.employee_salary_id AND es.profile_id = auth.uid())
  );

CREATE POLICY "Payroll managers can view all salary components" ON public.employee_salary_components
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employee_salaries es 
      JOIN profiles p ON p.id = es.profile_id 
      WHERE es.id = employee_salary_components.employee_salary_id 
      AND p.company_id = get_user_company_id(auth.uid())
    )
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll') OR has_permission(auth.uid(), 'finance.view_payroll'))
  );

CREATE POLICY "Payroll managers can manage salary components" ON public.employee_salary_components
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employee_salaries es 
      JOIN profiles p ON p.id = es.profile_id 
      WHERE es.id = employee_salary_components.employee_salary_id 
      AND p.company_id = get_user_company_id(auth.uid())
    )
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Payroll Runs
CREATE POLICY "Payroll viewers can view runs" ON public.payroll_runs
  FOR SELECT USING (
    company_id = get_user_company_id(auth.uid())
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll') OR has_permission(auth.uid(), 'finance.view_payroll'))
  );

CREATE POLICY "Payroll managers can manage runs" ON public.payroll_runs
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid())
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Payslips
CREATE POLICY "Users can view their own payslips" ON public.payslips
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Payroll viewers can view all payslips" ON public.payslips
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payslips.payroll_run_id AND pr.company_id = get_user_company_id(auth.uid()))
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll') OR has_permission(auth.uid(), 'finance.view_payroll'))
  );

CREATE POLICY "Payroll managers can manage payslips" ON public.payslips
  FOR ALL USING (
    EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payslips.payroll_run_id AND pr.company_id = get_user_company_id(auth.uid()))
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Payslip Items
CREATE POLICY "Users can view their own payslip items" ON public.payslip_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM payslips ps WHERE ps.id = payslip_items.payslip_id AND ps.profile_id = auth.uid())
  );

CREATE POLICY "Payroll viewers can view all payslip items" ON public.payslip_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payslips ps 
      JOIN payroll_runs pr ON pr.id = ps.payroll_run_id 
      WHERE ps.id = payslip_items.payslip_id 
      AND pr.company_id = get_user_company_id(auth.uid())
    )
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll') OR has_permission(auth.uid(), 'finance.view_payroll'))
  );

CREATE POLICY "Payroll managers can manage payslip items" ON public.payslip_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payslips ps 
      JOIN payroll_runs pr ON pr.id = ps.payroll_run_id 
      WHERE ps.id = payslip_items.payslip_id 
      AND pr.company_id = get_user_company_id(auth.uid())
    )
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Tax Slabs
CREATE POLICY "Users can view company tax slabs" ON public.tax_slabs
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Payroll managers can manage tax slabs" ON public.tax_slabs
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid())
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll'))
  );

-- Tax Declarations
CREATE POLICY "Users can view their own declarations" ON public.employee_tax_declarations
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can manage their own declarations" ON public.employee_tax_declarations
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "Payroll viewers can view all declarations" ON public.employee_tax_declarations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = employee_tax_declarations.profile_id AND p.company_id = get_user_company_id(auth.uid()))
    AND (is_company_admin(auth.uid()) OR has_permission(auth.uid(), 'finance.manage_payroll') OR has_permission(auth.uid(), 'finance.view_payroll'))
  );

-- Create updated_at triggers
CREATE TRIGGER update_payroll_settings_updated_at BEFORE UPDATE ON public.payroll_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_salary_components_updated_at BEFORE UPDATE ON public.salary_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_employee_salaries_updated_at BEFORE UPDATE ON public.employee_salaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_tax_slabs_updated_at BEFORE UPDATE ON public.tax_slabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_employee_tax_declarations_updated_at BEFORE UPDATE ON public.employee_tax_declarations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for payroll summary
CREATE OR REPLACE VIEW public.payroll_run_summary AS
SELECT 
  pr.id,
  pr.company_id,
  pr.pay_period_start,
  pr.pay_period_end,
  pr.pay_date,
  pr.status,
  pr.total_gross,
  pr.total_deductions,
  pr.total_net,
  pr.total_employer_cost,
  pr.employee_count,
  pr.processed_at,
  pr.approved_at,
  pr.paid_at,
  pr.notes,
  pr.created_at,
  proc.full_name as processed_by_name,
  appr.full_name as approved_by_name
FROM public.payroll_runs pr
LEFT JOIN public.profiles proc ON proc.id = pr.processed_by
LEFT JOIN public.profiles appr ON appr.id = pr.approved_by;

-- Create view for employee salary details
CREATE OR REPLACE VIEW public.employee_salary_details AS
SELECT 
  es.id,
  es.profile_id,
  es.effective_from,
  es.effective_to,
  es.gross_salary,
  es.ctc,
  es.bank_account_number,
  es.bank_name,
  es.ifsc_code,
  es.pan_number,
  es.pf_number,
  es.esi_number,
  es.uan_number,
  es.is_active,
  es.created_at,
  p.full_name as employee_name,
  p.email as employee_email,
  p.company_id,
  p.department_id,
  d.name as department_name,
  ed.designation,
  ed.employee_id
FROM public.employee_salaries es
JOIN public.profiles p ON p.id = es.profile_id
LEFT JOIN public.departments d ON d.id = p.department_id
LEFT JOIN public.employee_details ed ON ed.profile_id = es.profile_id;