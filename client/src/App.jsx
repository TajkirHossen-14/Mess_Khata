import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ProtectedRoute from './components/ProtectedRoute';
import ResidentDashboardPage from './pages/ResidentDashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import Residents from './pages/Residents';
import ManagerDutyAssignment from './pages/ManagerDutyAssignment';

function RequireMess({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user?.messId && !isLoading) return <Navigate to="/onboarding" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route
              path="resident/dashboard"
              element={
                <ProtectedRoute allowedRoles={['resident']}>
                  <ResidentDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="manager/residents"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <Residents />
                </ProtectedRoute>
              }
            />
            <Route
              path="manager/duty-assignments"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDutyAssignment />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
