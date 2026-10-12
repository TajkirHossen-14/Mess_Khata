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
import GuestMeals from './pages/GuestMeals';
import MealConfiguration from './pages/MealConfiguration';
import MealRecords from './pages/MealRecords';
import FixedCosts from './pages/FixedCosts';
import Residents from './pages/Residents';
import ProtectedRoute from './components/ProtectedRoute';

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="onboarding" element={<OnboardingRoute />} />
          <Route path="resident/dashboard" element={<ProtectedRoute allowedRoles={['resident']}><ResidentDashboard /></ProtectedRoute>} />
          <Route path="resident/duty" element={<ProtectedRoute allowedRoles={['resident']}><MyDutySchedule /></ProtectedRoute>} />
          <Route path="resident/meals" element={<ProtectedRoute allowedRoles={['resident']}><MealDeclaration /></ProtectedRoute>} />
          <Route path="resident/guest-meals" element={<ProtectedRoute allowedRoles={['resident']}><GuestMeals /></ProtectedRoute>} />
          <Route path="meal-records" element={<ProtectedRoute allowedRoles={['manager', 'resident']}><MealRecords /></ProtectedRoute>} />
          <Route path="resident/complaints" element={<ProtectedRoute allowedRoles={['resident']}><MyComplaints /></ProtectedRoute>} />
          <Route path="resident/complaints/new" element={<ProtectedRoute allowedRoles={['resident']}><SubmitComplaint /></ProtectedRoute>} />
          <Route path="manager/dashboard" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>} />
          <Route path="manager/duty" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDutyAssignment /></ProtectedRoute>} />
          <Route path="manager/meal-config" element={<ProtectedRoute allowedRoles={['manager']}><MealConfiguration /></ProtectedRoute>} />
          <Route path="manager/residents" element={<ProtectedRoute allowedRoles={['manager']}><Residents /></ProtectedRoute>} />
          <Route path="manager/fixed-costs" element={<ProtectedRoute allowedRoles={['manager']}><FixedCosts /></ProtectedRoute>} />
          <Route path="manager/complaints" element={<ProtectedRoute allowedRoles={['manager']}><ComplaintReview /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;