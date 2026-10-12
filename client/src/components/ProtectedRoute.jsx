import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [internalToast, setInternalToast] = useState(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-secondaryText">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.messId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.some((role) => user.roles?.includes(role))) {
    const redirectTo = user.roles.includes('manager') ? '/manager/dashboard' : '/resident/dashboard';
    return (
      <>
        <Navigate to={redirectTo} replace />
        <Toast
          message="You don't have access to that page"
          variant="error"
          duration={3000}
          onClose={() => {}}
        />
      </>
    );
  }

  return children;
}
