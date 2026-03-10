import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authed = localStorage.getItem('cortrack_auth') === 'true';
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
