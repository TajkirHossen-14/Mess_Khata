import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResidentDashboard from './pages/resident/Dashboard'
import ManagerDashboard from './pages/manager/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/resident/dashboard" element={<ResidentDashboard />} />
        <Route path="/resident/meals" element={<div>Coming soon - Meals</div>} />
        <Route path="/resident/expenses" element={<div>Coming soon - Expenses</div>} />
        <Route path="/resident/bills" element={<div>Coming soon - Bills</div>} />
        <Route path="/resident/payments" element={<div>Coming soon - Payments</div>} />
        <Route path="/resident/duty" element={<div>Coming soon - Duty Roster</div>} />
        <Route path="/resident/notices" element={<div>Coming soon - Notices</div>} />
        <Route path="/resident/complaints" element={<div>Coming soon - Complaints</div>} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/residents" element={<div>Coming soon - Residents</div>} />
        <Route path="/manager/expenses" element={<div>Coming soon - Expenses</div>} />
        <Route path="/manager/billing" element={<div>Coming soon - Billing</div>} />
        <Route path="/manager/collections" element={<div>Coming soon - Collections</div>} />
        <Route path="/manager/assets" element={<div>Coming soon - Assets</div>} />
        <Route path="/manager/duty" element={<div>Coming soon - Duty Roster</div>} />
        <Route path="/manager/notices" element={<div>Coming soon - Notices</div>} />
        <Route path="/manager/complaints" element={<div>Coming soon - Complaints</div>} />
        <Route path="/manager/settings" element={<div>Coming soon - Settings</div>} />
      </Route>
    </Routes>
  )
}

export default App