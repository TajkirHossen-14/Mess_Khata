import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
function StatusPill({ variant = 'neutral', label }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800',
    neutral: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant] || styles.neutral}`}>
      {label}
    </span>
  );
}

export default function Residents() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [joiningDate, setJoiningDate] = useState('');
  const [leavingDate, setLeavingDate] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchResidents = async () => {
    try {
      const response = await fetch('/api/residents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setResidents(result.data);
      }
    } catch (err) {
      setToast({ message: 'Failed to load residents', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line
  useEffect(() => { fetchResidents(); }, []);

  const openEdit = (resident) => {
    setEditingResident(resident);
    setJoiningDate(resident.joiningDate || '');
    setLeavingDate(resident.leavingDate || '');
    setFormError('');
    setEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (joiningDate && leavingDate && leavingDate < joiningDate) {
      setFormError('Leaving date cannot be before joining date');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/residents/${editingResident.id}/membership`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          joiningDate: joiningDate || undefined,
          leavingDate: leavingDate || null,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update membership');
      }

      setEditModalOpen(false);
      setToast({ message: 'Membership dates updated', variant: 'success' });
      fetchResidents();
    } catch (err) {
      setFormError(err.message);
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'joiningDate', label: 'Joined' },
    { key: 'leavingDate', label: 'Left', render: (v) => v || '-' },
    {
      key: 'isActiveToday',
      label: 'Status',
      render: (v) => v ? <StatusPill variant="success" label="Active" /> : <StatusPill variant="neutral" label="Left" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
          Edit dates
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div className="p-6 text-secondaryText">Loading...</div>;
  }

  return (
    <section className="mx-auto max-w-6xl py-8">
      <Card title="Residents">
        <Table columns={columns} data={residents} />
      </Card>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Membership Dates"
      >
        {formError && (
          <p className="mb-4 rounded-control bg-red-50 px-4 py-3 text-sm text-statusError">{formError}</p>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Joining Date"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
          />
          <Input
            label="Leaving Date"
            type="date"
            value={leavingDate}
            onChange={(e) => setLeavingDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} variant={toast.variant} duration={4000} onClose={() => setToast(null)} />}
    </section>
  );
}