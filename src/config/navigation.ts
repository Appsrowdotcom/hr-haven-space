import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Handshake,
  ShieldCheck,
  Settings,
  UserCog,
  CreditCard,
  PieChart,
  Target,
  ClipboardList,
  UserPlus,
  LucideIcon,
} from 'lucide-react';
import type { Enums } from '@/integrations/supabase/types';

type ModuleCode = Enums<'module_code'>;

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  module?: ModuleCode;
  permission?: string;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

// Navigation configuration - all menu items derived from this config
// Permission codes must match database permissions table
export const navigationConfig: NavSection[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'hr',
    title: 'Human Resources',
    items: [
      {
        id: 'employees',
        title: 'Employee Directory',
        href: '/hr/employees',
        icon: Users,
        module: 'HR_CORE',
        permission: 'hr.view_employee',
      },
      {
        id: 'onboarding',
        title: 'Onboarding',
        href: '/hr/onboarding',
        icon: UserPlus,
        module: 'HR_CORE',
        permission: 'hr.manage_department',
      },
      {
        id: 'attendance',
        title: 'Attendance',
        href: '/hr/attendance',
        icon: Clock,
        module: 'ATTENDANCE',
        permission: 'attendance.view',
      },
      {
        id: 'leave',
        title: 'Leave Management',
        href: '/hr/leave',
        icon: CalendarDays,
        module: 'LEAVE',
        permission: 'leave.view',
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    items: [
      {
        id: 'payroll',
        title: 'Payroll',
        href: '/finance/payroll',
        icon: DollarSign,
        module: 'FINANCE',
        permission: 'finance.view_payroll',
      },
      {
        id: 'expenses',
        title: 'Expenses',
        href: '/finance/expenses',
        icon: CreditCard,
        module: 'FINANCE',
        permission: 'finance.view',
      },
    ],
  },
  {
    id: 'revenue',
    title: 'Revenue',
    items: [
      {
        id: 'revenue-dashboard',
        title: 'Dashboard',
        href: '/revenue/dashboard',
        icon: TrendingUp,
        module: 'REVENUE',
        permission: 'revenue.view',
      },
      {
        id: 'revenue-reports',
        title: 'Reports',
        href: '/revenue/reports',
        icon: PieChart,
        module: 'REVENUE',
        permission: 'revenue.view',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & CRM',
    items: [
      {
        id: 'leads',
        title: 'Leads',
        href: '/sales/leads',
        icon: Target,
        module: 'SALES_CRM',
        permission: 'sales.manage_leads',
      },
      {
        id: 'deals',
        title: 'Deals',
        href: '/sales/deals',
        icon: Handshake,
        module: 'SALES_CRM',
        permission: 'sales.manage_deals',
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    items: [
      {
        id: 'policies',
        title: 'Policies',
        href: '/compliance/policies',
        icon: ShieldCheck,
        module: 'COMPLIANCE',
        permission: 'compliance.view',
      },
      {
        id: 'audits',
        title: 'Audits',
        href: '/compliance/audits',
        icon: ClipboardList,
        module: 'COMPLIANCE',
        permission: 'compliance.manage',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    items: [
      {
        id: 'company-settings',
        title: 'Company Settings',
        href: '/admin/company',
        icon: Building2,
        module: 'ADMIN',
        permission: 'admin.manage_company',
      },
      {
        id: 'user-management',
        title: 'User Management',
        href: '/admin/users',
        icon: UserCog,
        module: 'ADMIN',
        permission: 'admin.invite_users',
      },
      {
        id: 'roles-permissions',
        title: 'Roles & Permissions',
        href: '/admin/roles',
        icon: ShieldCheck,
        module: 'ADMIN',
        permission: 'admin.manage_roles',
      },
      {
        id: 'modules',
        title: 'Modules',
        href: '/admin/modules',
        icon: Settings,
        module: 'ADMIN',
        permission: 'admin.manage_modules',
      },
    ],
  },
];
