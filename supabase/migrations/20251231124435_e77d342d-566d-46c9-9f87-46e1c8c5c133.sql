-- View for leave balances with calculated remaining days and leave type info
CREATE OR REPLACE VIEW public.leave_balance_summary AS
SELECT 
  lb.id,
  lb.profile_id,
  lb.leave_type_id,
  lb.year,
  lb.total_days,
  lb.used_days,
  lb.carry_forward_days,
  lb.accrued_days,
  (lb.total_days - lb.used_days) AS remaining_days,
  lt.name AS leave_type_name,
  lt.description AS leave_type_description,
  lt.is_paid,
  lt.monthly_credit,
  lt.days_per_year,
  p.full_name,
  p.email,
  p.company_id,
  p.department_id
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
JOIN profiles p ON lb.profile_id = p.id
WHERE lt.is_active = true;

-- View for leave requests with all related info
CREATE OR REPLACE VIEW public.leave_request_details AS
SELECT 
  lr.id,
  lr.profile_id,
  lr.leave_type_id,
  lr.start_date,
  lr.end_date,
  lr.total_days,
  lr.reason,
  lr.status,
  lr.request_type,
  lr.is_paid,
  lr.requires_hr_approval,
  lr.auto_unpaid_reason,
  lr.manager_approved,
  lr.manager_approved_by,
  lr.manager_approved_at,
  lr.hr_approved,
  lr.hr_approved_by,
  lr.hr_approved_at,
  lr.approved_by,
  lr.approved_at,
  lr.rejection_reason,
  lr.created_at,
  lr.updated_at,
  lt.name AS leave_type_name,
  lt.is_paid AS leave_type_is_paid,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.employee_category,
  p.company_id,
  p.department_id,
  d.name AS department_name
FROM leave_requests lr
JOIN leave_types lt ON lr.leave_type_id = lt.id
JOIN profiles p ON lr.profile_id = p.id
LEFT JOIN departments d ON p.department_id = d.id;

-- View for pending manager approvals (requests needing department head approval)
CREATE OR REPLACE VIEW public.pending_manager_approvals AS
SELECT 
  lrd.*,
  dh.head_id AS department_head_id
FROM leave_request_details lrd
JOIN departments dh ON lrd.department_id = dh.id
WHERE lrd.status = 'pending'
  AND lrd.manager_approved IS NULL;

-- View for pending HR approvals (requests that have manager approval and need HR)
CREATE OR REPLACE VIEW public.pending_hr_approvals AS
SELECT *
FROM leave_request_details
WHERE status = 'pending'
  AND (
    (requires_hr_approval = true AND manager_approved = true AND hr_approved IS NULL)
    OR (requires_hr_approval = false AND manager_approved = true)
  );

-- View for leave type summary per company
CREATE OR REPLACE VIEW public.leave_type_summary AS
SELECT 
  lt.id,
  lt.company_id,
  lt.name,
  lt.description,
  lt.days_per_year,
  lt.monthly_credit,
  lt.is_paid,
  lt.is_carry_forward,
  lt.max_carry_forward_days,
  lt.is_active,
  COUNT(DISTINCT lb.profile_id) AS employees_with_balance,
  COALESCE(SUM(lb.used_days), 0) AS total_days_used,
  COALESCE(SUM(lb.total_days - lb.used_days), 0) AS total_days_remaining
FROM leave_types lt
LEFT JOIN leave_balances lb ON lt.id = lb.leave_type_id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY lt.id;

-- Enable RLS on views (views inherit RLS from underlying tables, but we make it explicit)
COMMENT ON VIEW public.leave_balance_summary IS 'Aggregated leave balance view with calculated remaining days';
COMMENT ON VIEW public.leave_request_details IS 'Leave requests with employee and leave type details';
COMMENT ON VIEW public.pending_manager_approvals IS 'Pending requests awaiting department head approval';
COMMENT ON VIEW public.pending_hr_approvals IS 'Pending requests awaiting HR approval';
COMMENT ON VIEW public.leave_type_summary IS 'Leave type statistics per company';