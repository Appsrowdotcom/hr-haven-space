import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RequireSuperAdmin } from "@/components/guards";
import { AppLayout } from "@/components/layout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import ModuleDisabled from "./pages/ModuleDisabled";
import NotFound from "./pages/NotFound";
import {
  SuperAdminDashboard,
  CompaniesPage,
  CompanyDetailPage,
  SubscriptionsPage,
  PlansPage,
  SuperAdminsPage,
  SettingsPage,
} from "./pages/super-admin";
import {
  CompanySettingsPage,
  UserManagementPage,
  RolesPermissionsPage,
  ModulesPage,
} from "./pages/admin";
import {
  EmployeeDirectoryPage,
  LeaveManagementPage,
  AttendancePage,
  OnboardingPage,
} from "./pages/hr";
import { PayrollPage, ExpensesPage } from "./pages/finance";
import { RevenuePage } from "./pages/revenue";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SuperAdminProvider>
            <CompanyProvider>
              <PermissionProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/module-disabled" element={<ModuleDisabled />} />

                  {/* Super Admin routes */}
                  <Route element={<RequireSuperAdmin><SuperAdminLayout /></RequireSuperAdmin>}>
                    <Route path="/super-admin" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/companies" element={<CompaniesPage />} />
                    <Route path="/super-admin/companies/:companyId" element={<CompanyDetailPage />} />
                    <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
                    <Route path="/super-admin/plans" element={<PlansPage />} />
                    <Route path="/super-admin/admins" element={<SuperAdminsPage />} />
                    <Route path="/super-admin/settings" element={<SettingsPage />} />
                  </Route>

                  {/* Protected routes with layout */}
                  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    
                    {/* HR Module routes */}
                    <Route element={<ProtectedRoute module="HR_CORE" />}>
                      <Route path="/hr/employees" element={<EmployeeDirectoryPage />} />
                      <Route path="/hr/onboarding" element={<OnboardingPage />} />
                    </Route>

                    {/* Attendance Module routes */}
                    <Route element={<ProtectedRoute module="ATTENDANCE" />}>
                      <Route path="/hr/attendance" element={<AttendancePage />} />
                    </Route>

                    {/* Leave Module routes */}
                    <Route element={<ProtectedRoute module="LEAVE" />}>
                      <Route path="/hr/leave" element={<LeaveManagementPage />} />
                    </Route>


                    {/* Finance Module routes */}
                    <Route element={<ProtectedRoute module="FINANCE" />}>
                      <Route path="/finance/payroll" element={<PayrollPage />} />
                      <Route path="/finance/expenses" element={<ExpensesPage />} />
                    </Route>

                    {/* Revenue Module routes */}
                    <Route element={<ProtectedRoute module="REVENUE" />}>
                      <Route path="/revenue/*" element={<RevenuePage />} />
                    </Route>

                    {/* Sales CRM Module routes */}
                    <Route element={<ProtectedRoute module="SALES_CRM" />}>
                      <Route path="/sales/*" element={<Dashboard />} />
                    </Route>

                    {/* Compliance Module routes */}
                    <Route element={<ProtectedRoute module="COMPLIANCE" />}>
                      <Route path="/compliance/*" element={<Dashboard />} />
                    </Route>

                    {/* Admin Module routes */}
                    <Route element={<ProtectedRoute module="ADMIN" />}>
                      <Route path="/admin/company" element={<CompanySettingsPage />} />
                      <Route path="/admin/users" element={<UserManagementPage />} />
                      <Route path="/admin/roles" element={<RolesPermissionsPage />} />
                      <Route path="/admin/modules" element={<ModulesPage />} />
                    </Route>
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PermissionProvider>
            </CompanyProvider>
          </SuperAdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
