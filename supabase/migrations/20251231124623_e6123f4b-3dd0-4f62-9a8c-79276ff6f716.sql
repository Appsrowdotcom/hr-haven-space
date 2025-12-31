-- =============================================
-- EMPLOYEE & PROFILE VIEWS
-- =============================================

-- Complete employee profile with all details
CREATE OR REPLACE VIEW public.employee_profile_complete AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.status,
  p.employee_category,
  p.company_id,
  p.department_id,
  p.created_at,
  p.activated_at,
  p.deactivated_at,
  d.name AS department_name,
  d.description AS department_description,
  ed.employee_id,
  ed.designation,
  ed.date_of_birth,
  ed.date_of_joining,
  ed.gender,
  ed.marital_status,
  ed.nationality,
  ed.employment_type,
  ed.work_location,
  ed.address,
  ed.city,
  ed.state,
  ed.postal_code,
  ed.country,
  ed.emergency_contact_name,
  ed.emergency_contact_phone,
  ed.emergency_contact_relation,
  ed.reporting_manager_id,
  rm.full_name AS reporting_manager_name,
  rm.email AS reporting_manager_email,
  -- Calculate tenure
  CASE 
    WHEN ed.date_of_joining IS NOT NULL THEN
      EXTRACT(YEAR FROM age(CURRENT_DATE, ed.date_of_joining)) * 12 +
      EXTRACT(MONTH FROM age(CURRENT_DATE, ed.date_of_joining))
    ELSE 0
  END AS months_employed,
  CASE 
    WHEN ed.date_of_joining IS NOT NULL THEN
      EXTRACT(YEAR FROM age(CURRENT_DATE, ed.date_of_joining))
    ELSE 0
  END AS years_employed
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN employee_details ed ON p.id = ed.profile_id
LEFT JOIN profiles rm ON ed.reporting_manager_id = rm.id;

-- Employee directory view (simplified for listing)
CREATE OR REPLACE VIEW public.employee_directory AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.status,
  p.employee_category,
  p.company_id,
  p.department_id,
  d.name AS department_name,
  ed.designation,
  ed.employee_id,
  ed.work_location,
  ed.date_of_joining
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN employee_details ed ON p.id = ed.profile_id
WHERE p.status != 'deactivated';

-- =============================================
-- ATTENDANCE VIEWS
-- =============================================

-- Daily attendance with employee details
CREATE OR REPLACE VIEW public.attendance_daily AS
SELECT 
  a.id,
  a.profile_id,
  a.date,
  a.check_in,
  a.check_out,
  a.status,
  a.work_hours,
  a.notes,
  a.created_at,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.company_id,
  p.department_id,
  d.name AS department_name,
  ed.designation,
  -- Calculate if late (assuming 9 AM start)
  CASE 
    WHEN a.check_in IS NOT NULL AND EXTRACT(HOUR FROM a.check_in) >= 9 AND EXTRACT(MINUTE FROM a.check_in) > 30 THEN true
    ELSE false
  END AS is_late,
  -- Calculate overtime (assuming 8 hours standard)
  CASE 
    WHEN a.work_hours IS NOT NULL AND a.work_hours > 8 THEN a.work_hours - 8
    ELSE 0
  END AS overtime_hours
FROM attendance a
JOIN profiles p ON a.profile_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN employee_details ed ON p.id = ed.profile_id;

-- Attendance punches with employee info
CREATE OR REPLACE VIEW public.attendance_punch_details AS
SELECT 
  ap.id,
  ap.profile_id,
  ap.punch_time,
  ap.punch_type,
  ap.source,
  ap.device_id,
  ap.device_location,
  ap.card_id,
  ap.notes,
  ap.created_at,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.company_id,
  p.department_id,
  d.name AS department_name,
  DATE(ap.punch_time) AS punch_date
FROM attendance_punches ap
JOIN profiles p ON ap.profile_id = p.id
LEFT JOIN departments d ON p.department_id = d.id;

-- Monthly attendance summary per employee
CREATE OR REPLACE VIEW public.attendance_monthly_summary AS
SELECT 
  a.profile_id,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.company_id,
  p.department_id,
  d.name AS department_name,
  EXTRACT(YEAR FROM a.date) AS year,
  EXTRACT(MONTH FROM a.date) AS month,
  COUNT(*) FILTER (WHERE a.status = 'present') AS days_present,
  COUNT(*) FILTER (WHERE a.status = 'absent') AS days_absent,
  COUNT(*) FILTER (WHERE a.status = 'half_day') AS days_half,
  COUNT(*) FILTER (WHERE a.status = 'on_leave') AS days_on_leave,
  COUNT(*) AS total_days_recorded,
  COALESCE(SUM(a.work_hours), 0) AS total_work_hours,
  COALESCE(AVG(a.work_hours), 0) AS avg_work_hours
FROM attendance a
JOIN profiles p ON a.profile_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
GROUP BY a.profile_id, p.full_name, p.email, p.company_id, p.department_id, d.name, 
         EXTRACT(YEAR FROM a.date), EXTRACT(MONTH FROM a.date);

-- =============================================
-- ONBOARDING VIEWS
-- =============================================

-- Onboarding progress with employee and template info
CREATE OR REPLACE VIEW public.onboarding_progress AS
SELECT 
  eo.id,
  eo.profile_id,
  eo.template_id,
  eo.status,
  eo.started_at,
  eo.completed_at,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.company_id,
  p.department_id,
  ot.name AS template_name,
  ot.description AS template_description,
  -- Count items
  (SELECT COUNT(*) FROM employee_onboarding_items eoi WHERE eoi.onboarding_id = eo.id) AS total_items,
  (SELECT COUNT(*) FROM employee_onboarding_items eoi WHERE eoi.onboarding_id = eo.id AND eoi.is_completed = true) AS completed_items,
  -- Calculate progress percentage
  CASE 
    WHEN (SELECT COUNT(*) FROM employee_onboarding_items eoi WHERE eoi.onboarding_id = eo.id) > 0 THEN
      ROUND(
        (SELECT COUNT(*) FROM employee_onboarding_items eoi WHERE eoi.onboarding_id = eo.id AND eoi.is_completed = true)::numeric /
        (SELECT COUNT(*) FROM employee_onboarding_items eoi WHERE eoi.onboarding_id = eo.id)::numeric * 100,
        2
      )
    ELSE 0
  END AS progress_percentage
FROM employee_onboarding eo
JOIN profiles p ON eo.profile_id = p.id
JOIN onboarding_templates ot ON eo.template_id = ot.id;

-- Onboarding items with details
CREATE OR REPLACE VIEW public.onboarding_item_details AS
SELECT 
  eoi.id,
  eoi.onboarding_id,
  eoi.template_item_id,
  eoi.is_completed,
  eoi.completed_at,
  eoi.completed_by,
  eoi.notes,
  oti.title,
  oti.description,
  oti.category,
  oti.is_required,
  oti.due_days,
  oti.assigned_to_role,
  oti.sort_order,
  eo.profile_id,
  eo.started_at AS onboarding_started_at,
  p.full_name AS employee_name,
  p.company_id,
  cb.full_name AS completed_by_name,
  -- Calculate due date
  CASE 
    WHEN oti.due_days IS NOT NULL THEN eo.started_at + (oti.due_days || ' days')::interval
    ELSE NULL
  END AS due_date,
  -- Check if overdue
  CASE 
    WHEN oti.due_days IS NOT NULL AND eoi.is_completed = false 
         AND CURRENT_TIMESTAMP > eo.started_at + (oti.due_days || ' days')::interval THEN true
    ELSE false
  END AS is_overdue
FROM employee_onboarding_items eoi
JOIN onboarding_template_items oti ON eoi.template_item_id = oti.id
JOIN employee_onboarding eo ON eoi.onboarding_id = eo.id
JOIN profiles p ON eo.profile_id = p.id
LEFT JOIN profiles cb ON eoi.completed_by = cb.id;

-- =============================================
-- ROLES & PERMISSIONS VIEWS
-- =============================================

-- User roles with role details
CREATE OR REPLACE VIEW public.user_role_details AS
SELECT 
  ur.id,
  ur.user_id,
  ur.role_id,
  ur.assigned_at,
  ur.assigned_by,
  r.name AS role_name,
  r.description AS role_description,
  r.is_system_role,
  r.is_active AS role_is_active,
  r.company_id,
  p.full_name AS user_name,
  p.email AS user_email,
  ab.full_name AS assigned_by_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN profiles p ON ur.user_id = p.id
LEFT JOIN profiles ab ON ur.assigned_by = ab.id;

-- Role permissions with permission details
CREATE OR REPLACE VIEW public.role_permission_details AS
SELECT 
  rp.id,
  rp.role_id,
  rp.permission_id,
  rp.granted_at,
  rp.granted_by,
  r.name AS role_name,
  r.company_id,
  perm.code AS permission_code,
  perm.name AS permission_name,
  perm.description AS permission_description,
  perm.category AS permission_category,
  perm.module AS permission_module,
  perm.is_sensitive
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions perm ON rp.permission_id = perm.id;

-- =============================================
-- DEPARTMENT VIEWS
-- =============================================

-- Department hierarchy with employee counts
CREATE OR REPLACE VIEW public.department_summary AS
SELECT 
  d.id,
  d.name,
  d.description,
  d.company_id,
  d.parent_id,
  d.head_id,
  pd.name AS parent_department_name,
  h.full_name AS head_name,
  h.email AS head_email,
  (SELECT COUNT(*) FROM profiles p WHERE p.department_id = d.id AND p.status = 'active') AS active_employee_count,
  (SELECT COUNT(*) FROM profiles p WHERE p.department_id = d.id) AS total_employee_count
FROM departments d
LEFT JOIN departments pd ON d.parent_id = pd.id
LEFT JOIN profiles h ON d.head_id = h.id;

-- =============================================
-- COMPANY & SUBSCRIPTION VIEWS
-- =============================================

-- Company overview with subscription and stats
CREATE OR REPLACE VIEW public.company_overview AS
SELECT 
  c.id,
  c.name,
  c.legal_name,
  c.logo_url,
  c.industry,
  c.size,
  c.created_at,
  cs.status AS subscription_status,
  cs.billing_cycle,
  cs.current_period_start,
  cs.current_period_end,
  cs.trial_ends_at,
  sp.name AS plan_name,
  sp.max_users,
  sp.max_departments,
  (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id AND p.status = 'active') AS active_users,
  (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) AS total_users,
  (SELECT COUNT(*) FROM departments d WHERE d.company_id = c.id) AS department_count
FROM companies c
LEFT JOIN company_subscriptions cs ON c.id = cs.company_id
LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id;

-- Company modules with status
CREATE OR REPLACE VIEW public.company_module_status AS
SELECT 
  cm.id,
  cm.company_id,
  cm.module,
  cm.is_enabled,
  cm.enabled_at,
  cm.enabled_by,
  cm.settings,
  c.name AS company_name,
  p.full_name AS enabled_by_name
FROM company_modules cm
JOIN companies c ON cm.company_id = c.id
LEFT JOIN profiles p ON cm.enabled_by = p.id;

-- =============================================
-- NOTIFICATIONS VIEW
-- =============================================

-- Notifications with read status
CREATE OR REPLACE VIEW public.notification_details AS
SELECT 
  n.id,
  n.profile_id,
  n.title,
  n.message,
  n.type,
  n.link,
  n.is_read,
  n.read_at,
  n.created_at,
  p.full_name AS recipient_name,
  p.email AS recipient_email,
  p.company_id,
  -- Time since created
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - n.created_at)) / 3600 AS hours_ago
FROM notifications n
JOIN profiles p ON n.profile_id = p.id;

-- =============================================
-- AUDIT LOG VIEW
-- =============================================

-- Audit logs with user details
CREATE OR REPLACE VIEW public.audit_log_details AS
SELECT 
  al.id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.old_value,
  al.new_value,
  al.ip_address,
  al.user_agent,
  al.created_at,
  al.company_id,
  al.user_id,
  p.full_name AS user_name,
  p.email AS user_email,
  c.name AS company_name
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
LEFT JOIN companies c ON al.company_id = c.id;

-- =============================================
-- SET SECURITY INVOKER ON ALL VIEWS
-- =============================================

ALTER VIEW public.employee_profile_complete SET (security_invoker = true);
ALTER VIEW public.employee_directory SET (security_invoker = true);
ALTER VIEW public.attendance_daily SET (security_invoker = true);
ALTER VIEW public.attendance_punch_details SET (security_invoker = true);
ALTER VIEW public.attendance_monthly_summary SET (security_invoker = true);
ALTER VIEW public.onboarding_progress SET (security_invoker = true);
ALTER VIEW public.onboarding_item_details SET (security_invoker = true);
ALTER VIEW public.user_role_details SET (security_invoker = true);
ALTER VIEW public.role_permission_details SET (security_invoker = true);
ALTER VIEW public.department_summary SET (security_invoker = true);
ALTER VIEW public.company_overview SET (security_invoker = true);
ALTER VIEW public.company_module_status SET (security_invoker = true);
ALTER VIEW public.notification_details SET (security_invoker = true);
ALTER VIEW public.audit_log_details SET (security_invoker = true);