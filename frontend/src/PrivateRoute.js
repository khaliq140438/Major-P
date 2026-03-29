import { Navigate } from 'react-router-dom';
import { useAuth } from './auth';

// Shows nothing while auth state is being read from localStorage
// Without this, PrivateRoute sees user=null and redirects before
// AuthProvider has finished loading the token
function AuthGate({ children, fallback }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return fallback ? fallback(user) : children;
}

// Protects any route that requires login
export function PrivateRoute({ children }) {
  return <AuthGate>{children}</AuthGate>;
}

// Protects admin-only routes
export function AdminRoute({ children }) {
  return (
    <AuthGate fallback={(user) => 
      user.role !== 'admin' 
        ? <Navigate to="/dashboard" replace /> 
        : children
    } />
  );
}

// Protects business-only routes
export function BusinessRoute({ children }) {
  return (
    <AuthGate fallback={(user) =>
      user.role !== 'business'
        ? <Navigate to="/admin/dashboard" replace />
        : children
    } />
  );
}