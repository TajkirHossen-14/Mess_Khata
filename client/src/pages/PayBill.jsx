import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { formatTaka } from '../utils/money';

const METHODS = [
  { value: 'cash', label: 'Cash', needsTrx: false },
  { value: 'bkash', label: 'bKash', needsTrx: true },
  { value: 'nagad', label: 'Nagad', needsTrx: true },
];
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_BYTES = 1024 * 1024;

export default function PayBill() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [method, setMethod] = useState(() => (METHODS.some((m) => m.value === searchParams.get('method')) ? searchParams.get('method') : 'cash'));
  const [amount, setAmount] = useState(() => searchParams.get('amount') || '');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const previewUrlRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiFetch(`/bills/${id}?scope=me`, { token });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load this bill');
      setBill(result.data);
      if (!searchParams.get('amount')) setAmount(String(result.data.outstanding));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const outstanding = bill?.outstanding ?? 0;
  const needsTrx = useMemo(() => METHODS.find((m) => m.value === method)?.needsTrx ?? false, [method]);

  // Object URL for the screenshot thumbnail; revoked whenever the file changes.
  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (file) previewUrlRef.current = URL.createObjectURL(file);
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [file]);

  const validate = () => {
    const errors = {};
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1) errors.amount = 'Enter a whole amount of at least ৳1';
    else if (value > outstanding) errors.amount = `Amount cannot exceed the outstanding ${formatTaka(outstanding)}`;
    if (needsTrx && !transactionId.trim()) errors.transactionId = `${method === 'bkash' ? 'bKash' : 'Nagad'} requires a transaction ID`;
    if (file && file.size > MAX_PROOF_BYTES) errors.proof = 'Screenshot must be 1 MB or smaller';
    if (file && !PROOF_TYPES.includes(file.type)) errors.proof = 'Screenshot must be a JPG, PNG or WebP image';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const form = new FormData();
    form.append('billId', bill.id);
    form.append('amount', String(Number(amount)));
    form.append('method', method);
    if (needsTrx) form.append('transactionId', transactionId.trim());
    if (note.trim()) form.append('note', note.trim());
    if (file) form.append('proof', file);

    setSubmitting(true);
    try {
      const response = await apiFetch('/payments', { token, method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to submit your payment');
      setToast({ message: 'Payment submitted — a Manager will confirm it', variant: 'success' });
      setTimeout(() => navigate('/resident/payments'), 800);
    } catch (err) {
      setFormError(err.message); // surfaces 409 duplicate / 400 overpay from the server
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-xl py-16 text-center text-secondaryText">Loading…</div>;

  if (loadError) {
    return (
      <section className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <p className="text-statusError">{loadError}</p>
        <Button variant="secondary" onClick={load}>Retry</Button>
      </section>
    );
  }

  if (outstanding <= 0) {
    return (
      <section className="mx-auto max-w-xl py-16 text-center text-secondaryText">
        <p>This bill has nothing left to pay.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/resident/bills')}>Back to bills</Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 py-8">
      <h2 className="font-heading text-2xl font-bold text-navy900">Pay bill</h2>
      <p className="text-sm text-secondaryText">
        Outstanding: <span className="font-semibold text-navy900">{formatTaka(outstanding)}</span>
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-secondaryText">Payment method</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`rounded-control border px-3 py-3 text-sm font-medium transition-colors ${
                    method === m.value ? 'border-blue700 bg-ice100 text-blue700' : 'border-sky300 bg-white text-secondaryText hover:bg-ice50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Amount (৳)"
            name="amount"
            type="number"
            inputMode="numeric"
            min="1"
            max={outstanding}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={fieldErrors.amount}
          />

          {needsTrx && (
            <Input
              label="Transaction ID (TrxID)"
              name="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 8N7A6D5EE1"
              error={fieldErrors.transactionId}
            />
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="proof" className="text-sm font-medium text-secondaryText">Screenshot (optional)</label>
            <input
              id="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-compact border border-sky300 bg-white px-3 py-2 text-darkText focus:outline-none focus:ring-2 focus:ring-sky300"
            />
            {fieldErrors.proof && <span className="text-sm text-statusError">{fieldErrors.proof}</span>}
            {file && previewUrlRef.current && (
              <img src={previewUrlRef.current} alt="Screenshot preview" className="mt-2 max-h-40 rounded-compact border border-ice100 object-contain" />
            )}
          </div>

          <Textarea
            label="Note (optional)"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={fieldErrors.note}
          />

          <p className="rounded-control bg-ice50 p-3 text-sm text-secondaryText">
            A Manager confirms your payment manually. Your due updates after confirmation.
          </p>

          {formError && <p className="text-sm text-statusError">{formError}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit payment'}</Button>
          </div>
        </form>
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </section>
  );
}
