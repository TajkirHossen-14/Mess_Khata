import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Table from '../components/Table.jsx';
import Toast from '../components/Toast.jsx';
import { API_BASE, useAuth } from '../context/AuthContext.jsx';

export default function MyDutySchedule() {
  const { token } = useAuth(); const [duties, setDuties] = useState([]); const [toast, setToast] = useState(null);
  const load = useCallback(async () => { try { const response = await fetch(`${API_BASE}/duty/my`, { headers: { Authorization: `Bearer ${token}` } }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load duties'); setDuties(result.data); } catch (error) { setToast({ message: error.message, variant: 'error' }); } }, [token]);
  useEffect(() => { load(); }, [load]);
  return <><Card header="My upcoming duties"><Table columns={[{ key: 'type', header: 'Duty', render: (duty) => duty.type }, { key: 'date', header: 'Date', render: (duty) => new Date(duty.date).toLocaleDateString() }]} data={duties} emptyMessage="You have no upcoming duties." /></Card><Toast {...toast} onDismiss={() => setToast(null)} /></>;
}
