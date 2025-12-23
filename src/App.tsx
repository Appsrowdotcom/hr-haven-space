import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Unauthorized from "./pages/Unauthorized";
import ModuleDisabled from "./pages/ModuleDisabled";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <PermissionProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="/module-disabled" element={<ModuleDisabled />} />

                {/* Protected routes with layout */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* HR Module routes - example with module + permission guards */}
                  <Route element={<ProtectedRoute module="HR_CORE" />}>
                    <Route path="/employees" element={<Dashboard />} />
                    <Route path="/departments" element={<Dashboard />} />
                    <Route path="/positions" element={<Dashboard />} />
                  </Route>

                  {/* Attendance Module routes */}
                  <Route element={<ProtectedRoute module="ATTENDANCE" />}>
                    <Route path="/attendance/*" element={<Dashboard />} />
                  </Route>

                  {/* Leave Module routes */}
                  <Route element={<ProtectedRoute module="LEAVE" />}>
                    <Route path="/leave/*" element={<Dashboard />} />
                  </Route>

                  {/* Finance Module routes */}
                  <Route element={<ProtectedRoute module="FINANCE" />}>
                    <Route path="/finance/*" element={<Dashboard />} />
                  </Route>

                  {/* Revenue Module routes */}
                  <Route element={<ProtectedRoute module="REVENUE" />}>
                    <Route path="/revenue/*" element={<Dashboard />} />
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
                    <Route path="/admin/*" element={<Dashboard />} />
                  </Route>
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PermissionProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
