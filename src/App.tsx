import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CORProvider } from "@/contexts/CORContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { StockProvider } from "@/contexts/StockContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import CORPage from "@/pages/CORPage";
import EmployeesPage from "@/pages/EmployeesPage";
import StockPage from "@/pages/StockPage";
import ProjectsPage from "@/pages/ProjectsPage";
import DashboardPage from "@/pages/DashboardPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const authed = localStorage.getItem('cortrack_auth') === 'true';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-right" />
        <CORProvider>
          <EmployeeProvider>
            <StockProvider>
              <ProjectProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Navigate to={authed ? "/cor" : "/login"} replace />} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/cor" element={<ProtectedRoute><CORPage /></ProtectedRoute>} />
                    <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                    <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
                    <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </ProjectProvider>
            </StockProvider>
          </EmployeeProvider>
        </CORProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
