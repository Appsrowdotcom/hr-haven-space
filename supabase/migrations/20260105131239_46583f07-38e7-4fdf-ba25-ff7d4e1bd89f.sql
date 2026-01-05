-- Fix security definer views by recreating with security_invoker
DROP VIEW IF EXISTS public.payroll_run_summary;
DROP VIEW IF EXISTS public.employee_salary_details;

-- Recreate views with security_invoker = true
CREATE OR REPLACE VIEW public.payroll_run_summary 
WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW public.employee_salary_details 
WITH (security_invoker = true) AS
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