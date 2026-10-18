import { useState, useEffect } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import Table from '../components/Table.jsx';
import Toast from '../components/Toast.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { API_BASE, useAuth } from '../context/AuthContext.jsx';

export default function GuestMeals() {
  const { token } = useAuth();
  const [mealTypes, setMealTypes] = useState([]);
  const [guestMeals, setGuestMeals] = useState([]);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [date, setDate] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchMealTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/meal-types?activeOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.length) {
        setMealTypes(data.data);
        setSelectedMealType(data.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGuestMeals = async () => {
    try {
      const res = await fetch(`${API_BASE}/guest-meals?scope=me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setGuestMeals(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMealTypes();
    fetchGuestMeals();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMealType || !date || !count) {
      setToast({ message: 'Please fill in all fields', variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/guest-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mealTypeId: selectedMealType,
          date,
          count: parseInt(count, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to add guest meal');
      }
      setToast({ message: 'Guest meal recorded successfully', variant: 'success' });
      setDate('');
      setCount(1);
      fetchGuestMeals();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/guest-meals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove guest meal');
      }
      setToast({ message: 'Guest meal removed', variant: 'success' });
      fetchGuestMeals();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    }
  };

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'mealName', header: 'Meal Type' },
    { key: 'count', header: 'Guests' },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.isLocked ? (
          <StatusPill variant="neutral">Locked</StatusPill>
        ) : (
          <StatusPill variant="success">Active</StatusPill>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.isLocked ? (
          <span className="text-mutedText text-xs">Deadline passed</span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleRemove(row.id)}
          >
            Remove
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-sora font-extrabold text-darkText">Guest Meals</h1>
      <Card header="Add Guest Meal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Meal Type"
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
              options={mealTypes.map((m) => ({ label: `${m.name} (${m.time})`, value: m._id }))}
            />
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Number of Guests"
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding…' : 'Add Guest Meal'}
          </Button>
        </form>
      </Card>

      <Card header="Upcoming Guest Meals">
        <Table columns={columns} data={guestMeals} emptyMessage="No guest meals scheduled." />
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
