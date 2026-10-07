import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Toast from '../components/Toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    if (!user.messId) {
      return <Navigate to="/onboarding" replace />;
    }
    const redirectTo = user.roles.includes('manager') ? '/manager/dashboard' : '/resident/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      if (!result.user.messId) {
        navigate('/onboarding');
      } else {
        const redirectTo = result.user.roles.includes('manager') ? '/manager/dashboard' : '/resident/dashboard';
        navigate(redirectTo);
      }
    } else {
      setServerError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md bg-white rounded-panel shadow-sm p-8">
        <h2 className="text-2xl font-bold text-darkText font-heading mb-1">Welcome back</h2>
        <p className="text-secondaryText text-sm mb-6">Sign in to your MessKhata account</p>
        {serverError && <Toast message={serverError} type="error" onClose={() => setServerError('')} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="Enter your password"
          />
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-sm text-secondaryText mt-4 text-center">
          Don't have an account? <a href="/register" className="text-blue700 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
