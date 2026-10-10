import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Toggle from '../components/Toggle';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Toast from '../components/Toast';
import StatusPill from '../components/StatusPill';

export default function MealConfiguration() {
  const { token } = useAuth();
  const [mealTypes, setMealTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [name, setName] = useState('');
  const [time, setTime] = useState('13:00');
  const [hoursBefore, setHoursBefore] = useState(4);

  const fetchMealTypes = async () => {
    try {
      const res = await fetch('/api/meal-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMealTypes(data.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load meal configuration.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealTypes();
  }, []);

  const openAddModal = () => {
    setEditingMeal(null);
    setName('');
    setTime('13:00');
    setHoursBefore(4);
    setIsModalOpen(true);
  };

  const openEditModal = (meal) => {
    setEditingMeal(meal);
    setName(meal.name);
    setTime(meal.time);
    setHoursBefore(meal.deadlineHoursBefore);
    setIsModalOpen(true);
  };

  const saveMealType = async () => {
    try {
      const url = editingMeal ? `/api/meal-types/${editingMeal._id}` : '/api/meal-types';
      const method = editingMeal ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, time, deadlineHoursBefore: hoursBefore })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchMealTypes();
        setToast({ type: 'success', message: 'Meal type saved.' });
      } else {
        setToast({ type: 'error', message: data.message });
      }
    } catch {
      setToast({ type: 'error', message: 'Network error.' });
    }
  };

  const deleteMealType = async (id) => {
    try {
      const res = await fetch(`/api/meal-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchMealTypes();
        setToast({ type: 'success', message: 'Meal type deleted.' });
      } else {
        setToast({ type: 'error', message: data.message });
      }
    } catch {
      setToast({ type: 'error', message: 'Network error.' });
    }
  };

  const toggleActive = async (meal) => {
    try {
      const res = await fetch(`/api/meal-types/${meal._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !meal.isActive })
      });
      const data = await res.json();
      if (data.success) {
        fetchMealTypes();
      } else {
        setToast({ type: 'error', message: data.message });
      }
    } catch {
      setToast({ type: 'error', message: 'Network error.' });
    }
  };

  const getCutoffText = (cutoff) => {
    if (!cutoff) return '';
    if (cutoff.dayOffset === 0) return `Closes ${cutoff.time} same day`;
    if (cutoff.dayOffset === -1) return `Closes ${cutoff.time} the day before`;
    return `Closes ${cutoff.time} ${Math.abs(cutoff.dayOffset)} days before`;
  };

  const previewCutoff = () => {
    try {
      const [h, m] = time.split(':').map(Number);
      let th = h - parseInt(hoursBefore, 10);
      let offset = 0;
      while (th < 0) {
        th += 24;
        offset -= 1;
      }
      return getCutoffText({ time: `${String(th).padStart(2, '0')}:${String(m).padStart(2, '0')}`, dayOffset: offset });
    } catch {
      return '';
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'time', label: 'Time' },
    { key: 'cutoff', label: 'Cutoff', render: (val) => getCutoffText(val) },
    {
      key: 'isActive',
      label: 'Active',
      render: (val, row) => (
        <Toggle checked={val} onChange={() => toggleActive(row)} />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => openEditModal(row)}>Edit</Button>
          <Button variant="danger" onClick={() => deleteMealType(row._id)}>Delete</Button>
        </div>
      )
    }
  ];

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-heading text-darkText">Schedule</h2>
        </div>
        <p className="text-sm text-secondaryText">
          Schedule options are configured here in a later step.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-heading text-darkText">Meal Types</h2>
          <Button variant="primary" onClick={openAddModal}>Add Meal Type</Button>
        </div>
        <Table columns={columns} data={mealTypes} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMeal ? 'Edit Meal Type' : 'Add Meal Type'}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Breakfast" />
          <Input label="Serving Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Input
            label="Declaration closes ___ hours before the meal"
            type="number"
            min="0" max="48"
            value={hoursBefore}
            onChange={(e) => setHoursBefore(e.target.value)}
          />
          <p className="text-sm text-secondaryText italic">{previewCutoff()}</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveMealType}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
