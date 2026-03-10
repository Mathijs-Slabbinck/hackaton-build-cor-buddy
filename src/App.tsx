import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CORProvider } from "@/contexts/CORContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { StockProvider } from "@/contexts/StockContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ProtectedRoute, { OwnerOnlyRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import CORPage from "@/pages/CORPage";
import EmployeesPage from "@/pages/EmployeesPage";
import StockPage from "@/pages/StockPage";
import ProjectsPage from "@/pages/ProjectsPage";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/UsersPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={session ? '/cor' : '/login'} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/cor" element={<ProtectedRoute><CORPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
      <Route path="/users" element={<OwnerOnlyRoute><UsersPage /></OwnerOnlyRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-right" />
        <AuthProvider>
          <CORProvider>
            <EmployeeProvider>
              <StockProvider>
                <ProjectProvider>
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </ProjectProvider>
              </StockProvider>
            </EmployeeProvider>
          </CORProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
