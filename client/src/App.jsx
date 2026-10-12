import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { dashboardPath, useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import ResidentDashboard from './pages/ResidentDashboard.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import SubmitComplaint from './pages/SubmitComplaint.jsx';
import ManagerDutyAssignment from './pages/ManagerDutyAssignment.jsx';
import MyDutySchedule from './pages/MyDutySchedule.jsx';
import GuestMeals from './pages/GuestMeals.jsx';

function OnboardingRoute() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return <p className="p-6 text-secondaryText">Loading your account…</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.messId) return <Navigate to={dashboardPath(user)} replace />;
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
          <Route path="manager/dashboard" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>} />
          <Route path="resident/complaints/new" element={<ProtectedRoute allowedRoles={['resident']}><SubmitComplaint /></ProtectedRoute>} />
          <Route path="resident/duties" element={<ProtectedRoute allowedRoles={['resident']}><MyDutySchedule /></ProtectedRoute>} />
          <Route path="resident/guest-meals" element={<ProtectedRoute allowedRoles={['resident']}><GuestMeals /></ProtectedRoute>} />
          <Route path="manager/duties" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDutyAssignment /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
