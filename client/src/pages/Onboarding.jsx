import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Toast from '../components/Toast';

const Onboarding = () => {
  const [activeTab, setActiveTab] = useState(null); // 'create' or 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name) return setError('Mess name is required');
    setLoading(true);
    try {
      const res = await fetch('/api/mess/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('messkhata_token', data.data.token);
        await refreshUser();
        navigate('/manager/dashboard');
      } else {
        setError(data.message);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    if (!code) return setError('Mess code is required');
    setLoading(true);
    try {
      const res = await fetch('/api/mess/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: code.toUpperCase() })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('messkhata_token', data.data.token);
        await refreshUser();
        navigate('/resident/dashboard');
      } else {
        setError(data.message);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!activeTab) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 mt-10">
        <h2 className="text-3xl font-sora font-bold text-dark">How do you want to start?</h2>
        <div className="flex space-x-6">
          <Card className="w-64 p-6 cursor-pointer hover:shadow-lg transition-shadow flex flex-col items-center text-center" onClick={() => setActiveTab('create')}>
            <h3 className="text-xl font-bold text-blue700 mb-2">Create a Mess</h3>
            <p className="text-secondary text-sm">Start a new mess and become the manager.</p>
          </Card>
          <Card className="w-64 p-6 cursor-pointer hover:shadow-lg transition-shadow flex flex-col items-center text-center" onClick={() => setActiveTab('join')}>
            <h3 className="text-xl font-bold text-blue700 mb-2">Join a Mess</h3>
            <p className="text-secondary text-sm">Have an invite code? Join an existing mess.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-full mt-10">
      <Card className="w-full max-w-md p-6">
        <button className="text-sm text-blue700 mb-4 hover:underline" onClick={() => { setActiveTab(null); setError(''); }}>
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-dark">
          {activeTab === 'create' ? 'Create a Mess' : 'Join a Mess'}
        </h2>
        {error && <Toast message={error} type="error" onClose={() => setError('')} />}
        
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Mess Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunrise Mess"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Mess'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Mess Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. MK-A1B2C3"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Joining...' : 'Join Mess'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Onboarding;
