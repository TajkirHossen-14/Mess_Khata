import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import StatusPill from '../components/StatusPill';
import Toast from '../components/Toast';
import { formatTaka } from '../utils/money';

const BILL_STATUS = {
  unpaid: { variant: 'pending', label: 'Unpaid' },
  partial: { variant: 'info', label: 'Partial' },
  paid: { variant: 'success', label: 'Paid' },
  credit: { variant: 'info', label: 'Credit' },
};

const periodLabel = (period) => (period ? `${period.startDate} – ${period.endDate}` : '—');

export default function ResidentBills() {
  const { token, activeRole } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scope = activeRole === 'resident' ? '?scope=me' : '';
      const response = await apiFetch(`/bills${scope}`, { token });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load your bills');
      setBills(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, activeRole]);

  useEffect(() => { load(); }, [load]);

  const statusCell = (row) => (
    <div className="flex flex-wrap gap-1.5">
      <StatusPill variant={BILL_STATUS[row.paymentStatus]?.variant || 'neutral'}>
        {BILL_STATUS[row.paymentStatus]?.label || row.paymentStatus}
      </StatusPill>
      {row.isOverdue && <StatusPill variant="error">Overdue</StatusPill>}
    </div>
  );

  const columns = [
    { key: 'period', label: 'Period', render: (_, row) => periodLabel(row.period) },
    { key: 'totalDue', label: 'Total', render: (_, row) => formatTaka(row.breakdown?.totalDue) },
    { key: 'paid', label: 'Paid', render: (_, row) => formatTaka(row.confirmedPayments) },
    { key: 'outstanding', label: 'Outstanding', render: (v) => <span className="font-semibold">{formatTaka(v)}</span> },
    { key: 'dueDate', label: 'Due', render: (v) => v || '—' },
    { key: 'status', label: 'Status', render: (_, row) => statusCell(row) },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <Button variant="secondary" size="sm" onClick={() => navigate(`/resident/bills/${row.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-8">
      <Card title="Bills & Dues">
        {loading ? (
          <div className="py-10 text-center text-secondaryText">Loading…</div>
        ) : error ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-statusError">{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        ) : bills.length === 0 ? (
          <p className="py-10 text-center text-secondaryText">No bills yet.</p>
        ) : (
          <Table columns={columns} data={bills} />
        )}
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </section>
  );
}
