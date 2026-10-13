import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import ResidentDashboard from './pages/ResidentDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerDutyAssignment from './pages/ManagerDutyAssignment';
import MyDutySchedule from './pages/MyDutySchedule';
import SubmitComplaint from './pages/SubmitComplaint';
import MyComplaints from './pages/MyComplaints';
import ComplaintReview from './pages/ComplaintReview';
import MealDeclaration from './pages/MealDeclaration';
import MealRecords from './pages/MealRecords';

/**
 * Onboarding is only for members without a mess. Someone who already joined
 * is sent to their own dashboard - always a different path, so this can never
 * redirect back into itself.
 */
function OnboardingRoute() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return <p className="p-6 text-secondaryText">Loading your account...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.messId) {
    const role = user.roles && user.roles.includes('manager') ? 'manager' : 'resident';
    return <Navigate to={`/${role}/dashboard`} replace />;
  }
  return <Onboarding />;
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
              path="resident/meals"
              element={
                <ProtectedRoute allowedRoles={['resident']}>
                  <MealDeclaration />
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
            <Route
              path="manager/meal-records"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <MealRecords />
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