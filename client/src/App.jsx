
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Onboarding from './pages/Onboarding';
import ResidentDashboardPage from './pages/ResidentDashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import Residents from './pages/Residents';
import ManagerDutyAssignment from './pages/ManagerDutyAssignment';
import MyDutySchedule from './pages/MyDutySchedule';
import SubmitComplaint from './pages/SubmitComplaint';
import MyComplaints from './pages/MyComplaints';
import ComplaintReview from './pages/ComplaintReview';
import MealDeclaration from './pages/MealDeclaration';
import MealRecords from './pages/MealRecords';
import GuestMeals from './pages/GuestMeals';
import MealConfiguration from './pages/MealConfiguration';
import SharedAssetRegistrationPage from './pages/SharedAssetRegistrationPage';

function OnboardingRoute() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <p className="p-6 text-secondaryText">Loading your account...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.messId) {
    const role = user.roles?.includes('manager') ? 'manager' : 'resident';
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return <Onboarding />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="onboarding" element={<OnboardingRoute />} />

          <Route
            path="resident/dashboard"
            element={
              <ProtectedRoute allowedRoles={['resident']}>
                <ResidentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="resident/duty"
            element={
              <ProtectedRoute allowedRoles={['resident']}>
                <MyDutySchedule />
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
            path="resident/guest-meals"
            element={
              <ProtectedRoute allowedRoles={['resident']}>
                <GuestMeals />
              </ProtectedRoute>
            }
          />
          <Route
            path="resident/complaints"
            element={
              <ProtectedRoute allowedRoles={['resident']}>
                <MyComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="resident/complaints/new"
            element={
              <ProtectedRoute allowedRoles={['resident']}>
                <SubmitComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="meal-records"
            element={
              <ProtectedRoute allowedRoles={['resident', 'manager']}>
                <MealRecords />
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
          <Route
            path="manager/meal-configuration"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <MealConfiguration />
              </ProtectedRoute>
            }
          />
          <Route
            path="manager/complaints"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ComplaintReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="manager/shared-assets/new"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <SharedAssetRegistrationPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
