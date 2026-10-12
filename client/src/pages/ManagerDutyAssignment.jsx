import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Table from '../components/Table';
import Toast from '../components/Toast';

const DUTY_TYPES = ['bazar', 'cleaning', 'washroom'];

export default function ManagerDutyAssignment() {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    residentId: '',
    type: 'bazar',
    date: '',
  });

  const fetchResidents = async () => {
    try {
      const response = await fetch('/api/residents', {
        headers: { Authorization: `Bearer ${localStorage.getItem('messkhata_token')}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setResidents(result.data);
      }
    } catch (err) {
      // silent
    }
  };

  const fetchDuties = async () => {
    try {
      const response = await fetch('/api/duty', {
        headers: { Authorization: `Bearer ${localStorage.getItem('messkhata_token')}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setDuties(result.data);
      }
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    fetchResidents();
    fetchDuties();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setToast(null);

    if (!formData.residentId || !formData.type || !formData.date) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/duty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('messkhata_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to assign duty');
      }

      setFormData({ residentId: '', type: 'bazar', date: '' });
      fetchDuties();
      setToast({ message: 'Duty assigned successfully', variant: 'success' });
    } catch (err) {
      setError(err.message);
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      const response = await fetch(`/api/duty/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('messkhata_token')}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to cancel duty');
      }

      fetchDuties();
      setToast({ message: 'Duty cancelled', variant: 'success' });
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    }
  };

  const columns = [
    { key: 'residentName', label: 'Resident', render: (_, row) => row?.residentId?.userId?.name || 'Unknown' },
    { key: 'type', label: 'Type' },
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={row.status === 'cancelled'}
          onClick={() => handleCancel(row._id)}
        >
          Cancel
        </Button>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-4xl py-8 space-y-6">
      <Card title="Assign Duty">
        {error && (
          <p className="mb-4 rounded-control bg-red-50 px-4 py-3 text-sm text-statusError">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="residentId" className="text-sm font-medium text-secondaryText">
                Resident
              </label>
              <select
                id="residentId"
                value={formData.residentId}
                onChange={(e) => setFormData({ ...formData, residentId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-sky300 rounded-compact text-darkText focus:outline-none focus:ring-2 focus:ring-sky300"
              >
                <option value="">Select resident</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="type" className="text-sm font-medium text-secondaryText">
                Duty Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-sky300 rounded-compact text-darkText focus:outline-none focus:ring-2 focus:ring-sky300"
              >
                {DUTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Assigning...' : 'Assign Duty'}
          </Button>
        </form>
      </Card>

      <Card title="All Duty Assignments">
        <Table
          columns={columns}
          data={duties.map((d) => ({
            ...d,
            residentName: d?.residentId?.userId?.name,
          }))}
        />
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} duration={4000} onClose={() => setToast(null)} />}
    </section>
  );
}
