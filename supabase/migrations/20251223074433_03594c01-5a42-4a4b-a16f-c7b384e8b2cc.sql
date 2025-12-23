-- =============================================
-- HRMS FOUNDATION SCHEMA
-- =============================================

-- 1. ENUMS
-- =============================================

-- Employee categories
CREATE TYPE employee_category AS ENUM ('trainee', 'intern', 'probation', 'confirmed');

-- User status
CREATE TYPE user_status AS ENUM ('invited', 'pending', 'active', 'deactivated');

-- Module codes
CREATE TYPE module_code AS ENUM (
  'HR_CORE', 
  'ATTENDANCE', 
  'LEAVE', 
  'FINANCE', 
  'REVENUE', 
  'SALES_CRM', 
  'COMPLIANCE', 
  'ADMIN'
);

-- =============================================
-- 2. COMPANIES TABLE
-- =============================================

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  industry TEXT,
  size TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. PROFILES TABLE (extends auth.users)
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  status user_status NOT NULL DEFAULT 'invited',
  employee_category employee_category DEFAULT 'confirmed',
  department_id UUID,
  invite_token TEXT,
  invite_expires_at TIMESTAMPTZ,
  invited_by UUID,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. DEPARTMENTS TABLE
-- =============================================

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  head_id UUID REFERENCES public.profiles(id),
  parent_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Add department_id foreign key to profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_department 
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

-- =============================================
-- 5. ROLES TABLE
-- =============================================

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(company_id, name)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. PERMISSIONS TABLE (System-wide definitions)
-- =============================================

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module module_code NOT NULL,
  category TEXT NOT NULL,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. ROLE_PERMISSIONS (Junction table)
-- =============================================

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. USER_ROLES (Junction table)
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, role_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. COMPANY_MODULES (Enabled modules per company)
-- =============================================

CREATE TABLE public.company_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module module_code NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  enabled_by UUID REFERENCES public.profiles(id),
  settings JSONB DEFAULT '{}',
  UNIQUE(company_id, module)
);

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. COMPANY_BRANDING (Theme customization)
-- =============================================

CREATE TABLE public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '222.2 47.4% 11.2%',
  secondary_color TEXT DEFAULT '210 40% 96.1%',
  accent_color TEXT DEFAULT '210 40% 96.1%',
  background_color TEXT DEFAULT '0 0% 100%',
  foreground_color TEXT DEFAULT '222.2 47.4% 11.2%',
  font_heading TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',
  border_radius TEXT DEFAULT '0.5rem',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. AUDIT LOGS TABLE
-- =============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. SECURITY DEFINER FUNCTIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = _role_name
      AND r.is_active = true
  )
$$;

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.code = _permission_code
  )
$$;

-- Get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- Check if user is company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'Company Admin')
$$;

-- Check if module is enabled for company
CREATE OR REPLACE FUNCTION public.is_module_enabled(_company_id UUID, _module module_code)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_modules
    WHERE company_id = _company_id
      AND module = _module
      AND is_enabled = true
  )
$$;

-- =============================================
-- 13. RLS POLICIES
-- =============================================

-- Companies: Users can only see their own company
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update their company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (id = public.get_user_company_id(auth.uid()) AND public.is_company_admin(auth.uid()));

-- Profiles: Users can see profiles in their company
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can update any profile in their company"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid()) 
    AND (public.is_company_admin(auth.uid()) OR public.has_role(auth.uid(), 'HR'))
  );

CREATE POLICY "Admins can insert profiles in their company"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND (public.is_company_admin(auth.uid()) OR public.has_role(auth.uid(), 'HR'))
  );

-- Departments: Users can see departments in their company
CREATE POLICY "Users can view departments in their company"
  ON public.departments FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_admin(auth.uid())
  );

-- Roles: Users can see roles in their company
CREATE POLICY "Users can view roles in their company"
  ON public.roles FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_admin(auth.uid())
  );

-- Permissions: All authenticated users can view permissions
CREATE POLICY "Users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- Role permissions: Users can see role permissions in their company
CREATE POLICY "Users can view role permissions in their company"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r 
      WHERE r.id = role_id 
      AND r.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r 
      WHERE r.id = role_id 
      AND r.company_id = public.get_user_company_id(auth.uid())
    )
    AND public.is_company_admin(auth.uid())
  );

-- User roles: Users can see user roles in their company
CREATE POLICY "Users can view user roles in their company"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_id 
      AND p.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_id 
      AND p.company_id = public.get_user_company_id(auth.uid())
    )
    AND public.is_company_admin(auth.uid())
  );

-- Company modules: Users can see enabled modules
CREATE POLICY "Users can view company modules"
  ON public.company_modules FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage company modules"
  ON public.company_modules FOR ALL
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_admin(auth.uid())
  );

-- Company branding: Users can see their company branding
CREATE POLICY "Users can view company branding"
  ON public.company_branding FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage company branding"
  ON public.company_branding FOR ALL
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_admin(auth.uid())
  );

-- Audit logs: Users can see logs in their company
CREATE POLICY "Users can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- =============================================
-- 14. TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 15. SEED DEFAULT PERMISSIONS
-- =============================================

INSERT INTO public.permissions (code, name, description, module, category) VALUES
-- HR Core permissions
('hr.view_employee', 'View Employees', 'View employee directory and details', 'HR_CORE', 'VIEW'),
('hr.create_employee', 'Create Employee', 'Add new employees', 'HR_CORE', 'CREATE'),
('hr.edit_employee', 'Edit Employee', 'Modify employee information', 'HR_CORE', 'EDIT'),
('hr.delete_employee', 'Delete Employee', 'Remove employees', 'HR_CORE', 'DELETE'),
('hr.manage_department', 'Manage Departments', 'Create and edit departments', 'HR_CORE', 'MANAGE'),

-- Attendance permissions
('attendance.view', 'View Attendance', 'View attendance records', 'ATTENDANCE', 'VIEW'),
('attendance.check_in', 'Check In/Out', 'Record own attendance', 'ATTENDANCE', 'CREATE'),
('attendance.view_reports', 'View Reports', 'Access attendance reports', 'ATTENDANCE', 'VIEW'),
('attendance.override', 'Override Attendance', 'Modify attendance records', 'ATTENDANCE', 'EDIT'),
('attendance.manage_policy', 'Manage Policies', 'Configure attendance policies', 'ATTENDANCE', 'MANAGE'),

-- Leave permissions
('leave.view', 'View Leave', 'View leave information', 'LEAVE', 'VIEW'),
('leave.apply', 'Apply Leave', 'Submit leave requests', 'LEAVE', 'CREATE'),
('leave.approve', 'Approve Leave', 'Approve or reject leave requests', 'LEAVE', 'APPROVE'),
('leave.manage_policy', 'Manage Policies', 'Configure leave policies', 'LEAVE', 'MANAGE'),
('leave.manage_balance', 'Manage Balance', 'Adjust leave balances', 'LEAVE', 'MANAGE'),

-- Finance permissions
('finance.view', 'View Finance', 'View financial data', 'FINANCE', 'VIEW'),
('finance.view_own', 'View Own Expenses', 'View personal expenses', 'FINANCE', 'VIEW'),
('finance.create_expense', 'Create Expense', 'Submit expense requests', 'FINANCE', 'CREATE'),
('finance.approve_expense', 'Approve Expense', 'Approve expense requests', 'FINANCE', 'APPROVE'),
('finance.manage_categories', 'Manage Categories', 'Configure expense categories', 'FINANCE', 'MANAGE'),
('finance.view_payroll', 'View Payroll', 'Access payroll information', 'FINANCE', 'VIEW'),
('finance.manage_payroll', 'Manage Payroll', 'Configure and process payroll', 'FINANCE', 'MANAGE'),

-- Revenue permissions
('revenue.view', 'View Revenue', 'View revenue data', 'REVENUE', 'VIEW'),
('revenue.view_own', 'View Own Revenue', 'View personal revenue entries', 'REVENUE', 'VIEW'),
('revenue.create', 'Create Revenue', 'Add revenue entries', 'REVENUE', 'CREATE'),
('revenue.add_collection', 'Add Collection', 'Record collections', 'REVENUE', 'CREATE'),
('revenue.manage_categories', 'Manage Categories', 'Configure revenue categories', 'REVENUE', 'MANAGE'),

-- Sales CRM permissions
('sales.view', 'View Sales', 'View sales data', 'SALES_CRM', 'VIEW'),
('sales.manage_leads', 'Manage Leads', 'Create and manage leads', 'SALES_CRM', 'MANAGE'),
('sales.manage_deals', 'Manage Deals', 'Create and manage deals', 'SALES_CRM', 'MANAGE'),
('sales.view_reports', 'View Reports', 'Access sales reports', 'SALES_CRM', 'VIEW'),

-- Compliance permissions
('compliance.view', 'View Compliance', 'View compliance documents', 'COMPLIANCE', 'VIEW'),
('compliance.manage', 'Manage Compliance', 'Manage compliance requirements', 'COMPLIANCE', 'MANAGE'),

-- Admin permissions
('admin.manage_company', 'Manage Company', 'Configure company settings', 'ADMIN', 'MANAGE'),
('admin.manage_roles', 'Manage Roles', 'Create and manage roles', 'ADMIN', 'MANAGE'),
('admin.manage_modules', 'Manage Modules', 'Enable/disable modules', 'ADMIN', 'MANAGE'),
('admin.manage_branding', 'Manage Branding', 'Configure company branding', 'ADMIN', 'MANAGE'),
('admin.view_audit', 'View Audit Logs', 'Access audit logs', 'ADMIN', 'VIEW'),
('admin.invite_users', 'Invite Users', 'Invite new users to company', 'ADMIN', 'MANAGE');