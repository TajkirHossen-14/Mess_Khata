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

const PAYMENT_STATUS = {
  pending: { variant: 'pending', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  rejected: { variant: 'error', label: 'Rejected' },
};
const METHOD_LABEL = { cash: 'Cash', bkash: 'bKash', nagad: 'Nagad' };
const CHIPS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
];
const LIMIT = 20;

export default function PaymentHistory() {
  const { token, activeRole } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPage = useCallback(async (targetPage, statusValue) => {
    const scope = activeRole === 'resident' ? 'scope=me&' : '';
    const statusQuery = statusValue ? `status=${statusValue}&` : '';
    const response = await apiFetch(`/payments?${scope}${statusQuery}page=${targetPage}&limit=${LIMIT}`, { token });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load your payments');
    return result.data;
  }, [token, activeRole]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(1, status);
      setItems(data.items || []);
      setPage(1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, status]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(page + 1, status);
      setItems((prev) => [...prev, ...(data.items || [])]);
      setPage((prev) => prev + 1);
      setTotal(data.total || 0);
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  const columns = [
    { key: 'submittedAt', label: 'Date', render: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
    { key: 'period', label: 'Period', render: (p) => (p ? `${p.startDate} – ${p.endDate}` : '—') },
    { key: 'method', label: 'Method', render: (v) => METHOD_LABEL[v] || v },
    { key: 'amount', label: 'Amount', render: (v) => formatTaka(v) },
    { key: 'transactionId', label: 'TrxID', render: (v) => v || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (v, row) => (
        <div className="space-y-1">
          <StatusPill variant={PAYMENT_STATUS[v]?.variant || 'neutral'}>{PAYMENT_STATUS[v]?.label || v}</StatusPill>
          {v === 'rejected' && row.rejectReason && (
            <p className="max-w-[16rem] text-xs text-statusError">{row.rejectReason}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) =>
        row.status === 'rejected' ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={!row.currentBillId}
            onClick={() => navigate(`/resident/bills/${row.currentBillId}/pay?method=${row.method}&amount=${row.amount}`)}
          >
            Resubmit
          </Button>
        ) : null,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-8">
      <Card title="Payment History">
        <div className="mb-4 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setStatus(chip.key)}
              className={`rounded-control px-3 py-1.5 text-sm font-medium ${
                status === chip.key ? 'bg-blue700 text-white' : 'bg-ice100 text-secondaryText hover:bg-ice50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-secondaryText">Loading…</div>
        ) : error ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-statusError">{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-secondaryText">No payments yet.</p>
        ) : (
          <>
            <Table columns={columns} data={items} />
            {items.length < total && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </section>
  );
}
