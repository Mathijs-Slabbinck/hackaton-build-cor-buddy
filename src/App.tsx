import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CORProvider } from "@/contexts/CORContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { StockProvider } from "@/contexts/StockContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { OwnerOrManagerRoute, OwnerOnlyRoute, ExternalRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import CORPage from "@/pages/CORPage";
import EmployeesPage from "@/pages/EmployeesPage";
import StockPage from "@/pages/StockPage";
import ProjectsPage from "@/pages/ProjectsPage";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/UsersPage";
import MyCorListPage from "@/pages/MyCorListPage";
import MyCorDetailPage from "@/pages/MyCorDetailPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { session } = useAuth();

  const homeRedirect = () => {
    if (!session) return "/login";
    return session.role === 'external_manager' ? '/my-cors' : '/cor';
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={homeRedirect()} replace />} />
      <Route path="/dashboard" element={<OwnerOrManagerRoute><DashboardPage /></OwnerOrManagerRoute>} />
      <Route path="/cor" element={<OwnerOrManagerRoute><CORPage /></OwnerOrManagerRoute>} />
      <Route path="/projects" element={<OwnerOrManagerRoute><ProjectsPage /></OwnerOrManagerRoute>} />
      <Route path="/employees" element={<OwnerOrManagerRoute><EmployeesPage /></OwnerOrManagerRoute>} />
      <Route path="/stock" element={<OwnerOrManagerRoute><StockPage /></OwnerOrManagerRoute>} />
      <Route path="/users" element={<OwnerOnlyRoute><UsersPage /></OwnerOnlyRoute>} />
      <Route path="/my-cors" element={<ExternalRoute><MyCorListPage /></ExternalRoute>} />
      <Route path="/my-cors/:corId" element={<ExternalRoute><MyCorDetailPage /></ExternalRoute>} />
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
