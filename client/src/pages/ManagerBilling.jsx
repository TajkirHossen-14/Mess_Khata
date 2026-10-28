import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Card from '../components/Card';
import Select from '../components/Select';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import StatusPill from '../components/StatusPill';
import Toast from '../components/Toast';
import { formatTaka } from '../utils/money';

const WARNING_TEXT = {
  PERIOD_NOT_ENDED: 'This billing period has not ended yet, so bills cannot be generated.',
  NO_RESIDENTS: 'There are no residents to bill for this period.',
  UNALLOCATED_FOOD_COST: 'Some food cost could not be allocated to recorded meals.',
  UNMATCHED_ADJUSTMENTS_OR_PAYMENTS: 'Some adjustments or payments do not match a billed resident.',
  OTHER_EXPENSES_NOT_BILLED: 'There are “other” category expenses that are not included in bills.',
  ASSET_EXPENSES_NOT_BILLED: 'Asset expenses are excluded from bills (handled as depreciation, separate).',
  NO_MEALS_RECORDED: 'No meals have been recorded for this period yet.',
  CONFIGURATION_ERROR: 'The billing setup is incomplete — fix the configuration before generating.',
};

const BILL_STATUS = {
  unpaid: { variant: 'pending', label: 'Unpaid' },
  partial: { variant: 'info', label: 'Partial' },
  paid: { variant: 'success', label: 'Paid' },
  credit: { variant: 'info', label: 'Credit' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ManagerBilling() {
  const { token } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [summary, setSummary] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [bills, setBills] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals
  const [generateOpen, setGenerateOpen] = useState(false);
  const [dueDate, setDueDate] = useState(todayStr());
  const [acknowledged, setAcknowledged] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({ residentId: '', isCredit: false, amount: '', reason: '' });
  const [adjVoidOpen, setAdjVoidOpen] = useState(false);
  const [adjVoidTarget, setAdjVoidTarget] = useState(null);
  const [adjVoidReason, setAdjVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [periodsRes, residentsRes] = await Promise.all([
          apiFetch('/billing-periods', { token }),
          apiFetch('/residents', { token }),
        ]);
        const periodsJson = await periodsRes.json();
        const residentsJson = await residentsRes.json();
        if (periodsJson.success) {
          const list = periodsJson.data || [];
          setPeriods(list);
          if (list[0]) setPeriodId(list[0].id);
        }
        if (residentsJson.success) setResidents(residentsJson.data || []);
      } catch (err) {
        setToast({ message: err.message, variant: 'error' });
      }
    })();
  }, [token]);

  const loadPeriod = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, readinessRes] = await Promise.all([
        apiFetch(`/billing/summary?billingPeriodId=${periodId}`, { token }),
        apiFetch(`/bills/readiness?billingPeriodId=${periodId}`, { token }),
      ]);
      const summaryJson = await summaryRes.json();
      const readinessJson = await readinessRes.json();
      if (!summaryJson.success) throw new Error(summaryJson.message || 'Unable to load billing summary');
      setSummary(summaryJson.data);
      setReadiness(readinessJson.success ? readinessJson.data : null);

      const issued = readinessJson.success && readinessJson.data?.hasIssuedBills;
      if (issued) {
        const billsRes = await apiFetch(`/bills?billingPeriodId=${periodId}&includeVoided=true`, { token });
        const billsJson = await billsRes.json();
        setBills(billsJson.success ? billsJson.data || [] : []);
      } else {
        setBills([]);
      }

      const adjRes = await apiFetch(`/adjustments?billingPeriodId=${periodId}`, { token });
      const adjJson = await adjRes.json();
      setAdjustments(adjJson.success ? adjJson.data || [] : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodId, token]);

  useEffect(() => { loadPeriod(); }, [loadPeriod]);

  const periodLocked = Boolean(readiness?.hasIssuedBills);
  const blockingMessages = (readiness?.blocking || []).map((item) => WARNING_TEXT[item.code] || item.message);
  const ackMessages = (readiness?.needsAcknowledgement || []).map((item) => WARNING_TEXT[item.code] || item.message);
  const canGenerate = Boolean(readiness?.canGenerate) && (!readiness?.needsAcknowledgement?.length || acknowledged);

  const generateBills = async () => {
    setBusy(true);
    try {
      const response = await apiFetch('/bills/generate', {
        token,
        method: 'POST',
        body: { billingPeriodId: periodId, dueDate, acknowledgeWarnings: acknowledged },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to generate bills');
      setGenerateOpen(false);
      setAcknowledged(false);
      setToast({ message: 'Bills generated', variant: 'success' });
      loadPeriod();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const voidBills = async () => {
    setBusy(true);
    try {
      const response = await apiFetch('/bills/void', {
        token,
        method: 'POST',
        body: { billingPeriodId: periodId, reason: voidReason },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to void bills');
      setVoidOpen(false);
      setVoidReason('');
      setToast({ message: 'Bills voided', variant: 'success' });
      loadPeriod();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const addAdjustment = async () => {
    const magnitude = Number(adjForm.amount);
    if (!adjForm.residentId || !Number.isInteger(magnitude) || magnitude < 1) {
      setToast({ message: 'Pick a resident and a whole amount of at least ৳1', variant: 'error' });
      return;
    }
    const amount = adjForm.isCredit ? -magnitude : magnitude;
    setBusy(true);
    try {
      const response = await apiFetch('/adjustments', {
        token,
        method: 'POST',
        body: { residentId: adjForm.residentId, billingPeriodId: periodId, amount, reason: adjForm.reason },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to add adjustment');
      setAdjOpen(false);
      setAdjForm({ residentId: '', isCredit: false, amount: '', reason: '' });
      setToast({ message: 'Adjustment added', variant: 'success' });
      loadPeriod();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const voidAdjustment = async () => {
    setBusy(true);
    try {
      const response = await apiFetch(`/adjustments/${adjVoidTarget.id}/void`, {
        token,
        method: 'POST',
        body: { reason: adjVoidReason },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to void adjustment');
      setAdjVoidOpen(false);
      setAdjVoidReason('');
      setAdjVoidTarget(null);
      setToast({ message: 'Adjustment voided', variant: 'success' });
      loadPeriod();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const summaryColumns = [
    { key: 'name', label: 'Resident' },
    { key: 'ownMealCount', label: 'Own' },
    { key: 'guestMealCount', label: 'Guest' },
    { key: 'billableMeals', label: 'Billable' },
    { key: 'mealCost', label: 'Meal cost', render: (v) => formatTaka(v) },
    { key: 'fixedCostShare', label: 'Fixed share', render: (v) => formatTaka(v) },
    { key: 'adjustmentsNet', label: 'Adjustments', render: (v) => formatTaka(v) },
    { key: 'subtotal', label: 'Subtotal', render: (v) => formatTaka(v) },
  ];

  const billColumns = [
    { key: 'residentName', label: 'Resident' },
    { key: 'totalDue', label: 'Total', render: (_, row) => formatTaka(row.breakdown?.totalDue) },
    { key: 'confirmedPayments', label: 'Paid', render: (v) => formatTaka(v) },
    { key: 'outstanding', label: 'Outstanding', render: (v) => formatTaka(v) },
    {
      key: 'status',
      label: 'Status',
      render: (v, row) => (
        <div className="flex flex-wrap gap-1.5">
          {v === 'voided' ? (
            <StatusPill variant="neutral">Voided</StatusPill>
          ) : (
            <>
              <StatusPill variant={BILL_STATUS[row.paymentStatus]?.variant || 'neutral'}>
                {BILL_STATUS[row.paymentStatus]?.label || row.paymentStatus}
              </StatusPill>
              {row.isOverdue && <StatusPill variant="error">Overdue</StatusPill>}
            </>
          )}
        </div>
      ),
    },
  ];

  const adjustmentColumns = [
    { key: 'residentName', label: 'Resident' },
    {
      key: 'amount',
      label: 'Amount',
      render: (v) => (
        <div className="flex items-center gap-2">
          <StatusPill variant={v >= 0 ? 'pending' : 'success'}>{v >= 0 ? 'Charge' : 'Credit'}</StatusPill>
          <span>{formatTaka(v)}</span>
        </div>
      ),
    },
    { key: 'reason', label: 'Reason' },
    { key: 'createdByName', label: 'Added by' },
    {
      key: 'isVoided',
      label: 'Status',
      render: (v, row) =>
        v ? (
          <div className="space-y-1">
            <StatusPill variant="neutral">Voided</StatusPill>
            {row.voidReason && <p className="text-xs text-mutedText">{row.voidReason}</p>}
          </div>
        ) : (
          <StatusPill variant="info">Active</StatusPill>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) =>
        !row.isVoided && (
          <Button
            variant="secondary"
            size="sm"
            disabled={periodLocked}
            onClick={() => { setAdjVoidTarget(row); setAdjVoidReason(''); setAdjVoidOpen(true); }}
          >
            Void
          </Button>
        ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-8">
      <Card title="Billing">
        <Select
          label="Billing period"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          options={periods.map((p) => ({ value: p.id, label: `${p.startDate} – ${p.endDate}` }))}
        />
        {periods.length === 0 && <p className="mt-2 text-sm text-mutedText">No billing periods yet.</p>}
      </Card>

      {loading && <div className="py-10 text-center text-secondaryText">Loading…</div>}
      {error && !loading && (
        <div className="space-y-4 py-8 text-center">
          <p className="text-statusError">{error}</p>
          <Button variant="secondary" onClick={loadPeriod}>Retry</Button>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Readiness / generate */}
          <Card title="Generate bills">
            {blockingMessages.length > 0 && (
              <div className="mb-4 space-y-2">
                {blockingMessages.map((msg, idx) => (
                  <p key={idx} className="rounded-control bg-statusError/10 p-3 text-sm text-statusError">{msg}</p>
                ))}
              </div>
            )}
            {ackMessages.length > 0 && !periodLocked && (
              <div className="mb-4 space-y-2">
                {ackMessages.map((msg, idx) => (
                  <p key={idx} className="rounded-control bg-statusPending/15 p-3 text-sm text-statusPending">{msg}</p>
                ))}
                <label className="flex items-center gap-2 text-sm text-secondaryText">
                  <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                  I understand these warnings and want to continue.
                </label>
              </div>
            )}

            {periodLocked ? (
              <div className="space-y-3">
                <p className="text-sm text-secondaryText">
                  Bills are issued for this period. Expenses and adjustments are locked until you void them.
                </p>
                <Button variant="secondary" onClick={() => { setVoidReason(''); setVoidOpen(true); }}>Void bills</Button>
              </div>
            ) : (
              <Button
                disabled={!canGenerate}
                onClick={() => { setDueDate(todayStr()); setGenerateOpen(true); }}
              >
                Generate bills
              </Button>
            )}
          </Card>

          {/* Issued bills */}
          {periodLocked && bills.length > 0 && (
            <Card title="Bills">
              <Table columns={billColumns} data={bills} />
            </Card>
          )}

          {/* Preview */}
          <Card title="Preview">
            <Table columns={summaryColumns} data={summary.residents || []} />
          </Card>

          {/* Adjustments */}
          <Card
            title="Adjustments"
            footer={
              <div className="flex items-center justify-between">
                <p className="text-sm text-mutedText">{periodLocked ? 'Locked while bills are issued for this period.' : 'Add one-off charges or credits before generating bills.'}</p>
                <Button size="sm" disabled={periodLocked} onClick={() => { setAdjForm({ residentId: '', isCredit: false, amount: '', reason: '' }); setAdjOpen(true); }}>
                  Add adjustment
                </Button>
              </div>
            }
          >
            {periodLocked && <p className="mb-3 text-sm text-statusPending">Expenses and adjustments are locked until bills are voided.</p>}
            <Table columns={adjustmentColumns} data={adjustments} />
          </Card>
        </>
      )}

      {/* Generate modal */}
      <Modal isOpen={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate bills">
        <div className="space-y-4">
          <Input label="Due date" type="date" min={todayStr()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setGenerateOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={generateBills} disabled={busy || !dueDate}>{busy ? 'Generating…' : 'Generate'}</Button>
          </div>
        </div>
      </Modal>

      {/* Void bills modal */}
      <Modal isOpen={voidOpen} onClose={() => setVoidOpen(false)} title="Void bills">
        <div className="space-y-4">
          <p className="text-sm text-secondaryText">Voiding frees the period so expenses and adjustments can change again, then you can regenerate.</p>
          <Textarea label="Reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="At least 3 characters" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setVoidOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={voidBills} disabled={busy || voidReason.trim().length < 3}>{busy ? 'Voiding…' : 'Void bills'}</Button>
          </div>
        </div>
      </Modal>

      {/* Add adjustment modal */}
      <Modal isOpen={adjOpen} onClose={() => setAdjOpen(false)} title="Add adjustment">
        <div className="space-y-4">
          <Select
            label="Resident"
            value={adjForm.residentId}
            onChange={(e) => setAdjForm({ ...adjForm, residentId: e.target.value })}
            options={[{ value: '', label: 'Select a resident' }, ...residents.map((r) => ({ value: r.id, label: r.name }))]}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondaryText">Credit</span>
            <Toggle checked={adjForm.isCredit} onChange={(v) => setAdjForm({ ...adjForm, isCredit: v })} label="Charge or credit" />
            <span className="text-sm text-secondaryText">Charge</span>
          </div>
          <Input
            label="Amount (৳)"
            type="number"
            min="1"
            value={adjForm.amount}
            onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
            placeholder="Positive amount"
          />
          <Textarea label="Reason" rows={3} value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAdjOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={addAdjustment} disabled={busy || !adjForm.residentId || !adjForm.amount || adjForm.reason.trim().length < 3}>
              {busy ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Void adjustment modal */}
      <Modal isOpen={adjVoidOpen} onClose={() => setAdjVoidOpen(false)} title="Void adjustment">
        <div className="space-y-4">
          <p className="text-sm text-secondaryText">This removes the adjustment from future bill calculations.</p>
          <Textarea label="Reason" value={adjVoidReason} onChange={(e) => setAdjVoidReason(e.target.value)} placeholder="At least 3 characters" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAdjVoidOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={voidAdjustment} disabled={busy || adjVoidReason.trim().length < 3}>{busy ? 'Voiding…' : 'Void'}</Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </section>
  );
}
