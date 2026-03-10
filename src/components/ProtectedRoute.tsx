import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const OwnerOrManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'external_manager') return <Navigate to="/my-cors" replace />;
  return <>{children}</>;
};

export const OwnerOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== 'owner') return <Navigate to="/cor" replace />;
  return <>{children}</>;
};

export const ExternalRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== 'external_manager') return <Navigate to="/cor" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
