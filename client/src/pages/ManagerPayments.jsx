import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import Toast from '../components/Toast';
import { formatTaka } from '../utils/money';

const PAYMENT_STATUS = {
  pending: { variant: 'pending', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  rejected: { variant: 'error', label: 'Rejected' },
};
const METHOD_LABEL = { cash: 'Cash', bkash: 'bKash', nagad: 'Nagad' };
const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];
const LIMIT = 50;

export default function ManagerPayments() {
  const { token } = useAuth();
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const [proofUrl, setProofUrl] = useState(null);
  const proofUrlRef = useRef(null);

  const fetchPage = useCallback(async (targetPage, statusValue) => {
    const statusQuery = statusValue ? `status=${statusValue}&` : '';
    const response = await apiFetch(`/payments?${statusQuery}page=${targetPage}&limit=${LIMIT}`, { token });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load payments');
    return result.data;
  }, [token]);

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

  const viewProof = async (payment) => {
    try {
      const response = await apiFetch(`/payments/${payment.id}/proof`, { token });
      if (!response.ok) throw new Error('Unable to load the proof image');
      const blob = await response.blob();
      if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
      proofUrlRef.current = URL.createObjectURL(blob);
      setProofUrl(proofUrlRef.current);
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    }
  };

  const closeProof = () => {
    if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
    proofUrlRef.current = null;
    setProofUrl(null);
  };

  useEffect(() => () => { if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current); }, []);

  const confirm = async () => {
    setBusy(true);
    try {
      const response = await apiFetch(`/payments/${confirmTarget.id}/confirm`, { token, method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to confirm payment');
      setConfirmTarget(null);
      setToast({ message: 'Payment confirmed', variant: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      const response = await apiFetch(`/payments/${rejectTarget.id}/reject`, {
        token,
        method: 'POST',
        body: { reason: rejectReason },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to reject payment');
      setRejectTarget(null);
      setRejectReason('');
      setToast({ message: 'Payment rejected', variant: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'submittedAt', label: 'Submitted', render: (v) => (v ? new Date(v).toLocaleString() : '—') },
    { key: 'residentName', label: 'Resident' },
    { key: 'period', label: 'Period', render: (p) => (p ? `${p.startDate} – ${p.endDate}` : '—') },
    { key: 'method', label: 'Method', render: (v) => METHOD_LABEL[v] || v },
    { key: 'amount', label: 'Amount', render: (v) => formatTaka(v) },
    { key: 'transactionId', label: 'TrxID', render: (v) => v || '—' },
    {
      key: 'hasProof',
      label: 'Proof',
      render: (v, row) => (v ? <Button variant="secondary" size="sm" onClick={() => viewProof(row)}>View</Button> : <span className="text-mutedText">—</span>),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusPill variant={PAYMENT_STATUS[v]?.variant || 'neutral'}>{PAYMENT_STATUS[v]?.label || v}</StatusPill>,
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => {
        if (row.status !== 'pending') return null;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button size="sm" disabled={!row.canReview} onClick={() => setConfirmTarget(row)}>Confirm</Button>
              <Button size="sm" variant="secondary" disabled={!row.canReview} onClick={() => { setRejectTarget(row); setRejectReason(''); }}>Reject</Button>
            </div>
            {!row.canReview && row.reviewBlockedReason && (
              <span className="max-w-[14rem] text-xs text-mutedText">{row.reviewBlockedReason}</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-8">
      <Card title="Payments">
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`rounded-control px-3 py-1.5 text-sm font-medium ${
                status === tab.key ? 'bg-blue700 text-white' : 'bg-ice100 text-secondaryText hover:bg-ice50'
              }`}
            >
              {tab.label}
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
          <p className="py-10 text-center text-secondaryText">No payments here.</p>
        ) : (
          <>
            <Table columns={columns} data={items} />
            {items.length < total && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={Boolean(confirmTarget)} onClose={() => setConfirmTarget(null)} title="Confirm payment">
        {confirmTarget && (
          <div className="space-y-4">
            <p className="text-sm text-secondaryText">
              Confirm <span className="font-semibold text-navy900">{formatTaka(confirmTarget.amount)}</span> from
              {' '}{confirmTarget.residentName} via {METHOD_LABEL[confirmTarget.method] || confirmTarget.method}?
              This reduces their outstanding due.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={busy}>Cancel</Button>
              <Button onClick={confirm} disabled={busy}>{busy ? 'Confirming…' : 'Confirm'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title="Reject payment">
        {rejectTarget && (
          <div className="space-y-4">
            <p className="text-sm text-secondaryText">
              Reject {formatTaka(rejectTarget.amount)} from {rejectTarget.residentName}. The resident will see your reason and can resubmit.
            </p>
            <Textarea label="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="At least 3 characters" />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setRejectTarget(null)} disabled={busy}>Cancel</Button>
              <Button onClick={reject} disabled={busy || rejectReason.trim().length < 3}>{busy ? 'Rejecting…' : 'Reject'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(proofUrl)} onClose={closeProof} title="Payment proof">
        {proofUrl && <img src={proofUrl} alt="Payment proof" className="max-h-[60vh] w-full object-contain" />}
      </Modal>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </section>
  );
}
