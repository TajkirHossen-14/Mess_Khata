import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusPill from '../components/StatusPill';
import { formatTaka } from '../utils/money';

const BILL_STATUS = {
  unpaid: { variant: 'pending', label: 'Unpaid' },
  partial: { variant: 'info', label: 'Partial' },
  paid: { variant: 'success', label: 'Paid' },
  credit: { variant: 'info', label: 'Credit' },
};

const Row = ({ label, children, strong = false }) => (
  <div className={`flex items-center justify-between py-2 ${strong ? 'text-base font-semibold text-navy900' : 'text-sm'}`}>
    <span className={strong ? '' : 'text-secondaryText'}>{label}</span>
    <span>{children}</span>
  </div>
);

export default function BillDetail() {
  const { id } = useParams();
  const { token, activeRole } = useAuth();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scope = activeRole === 'resident' ? '?scope=me' : '';
      const response = await apiFetch(`/bills/${id}${scope}`, { token });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load this bill');
      setBill(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token, activeRole]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="mx-auto max-w-2xl py-16 text-center text-secondaryText">Loading…</div>;

  if (error) {
    return (
      <section className="mx-auto max-w-2xl space-y-4 py-16 text-center">
        <p className="text-statusError">{error}</p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={load}>Retry</Button>
          <Link to="/resident/bills" className="inline-flex items-center rounded-control border border-blue700 px-4 py-2 text-blue700 hover:bg-ice100">
            Back to bills
          </Link>
        </div>
      </section>
    );
  }

  const b = bill.breakdown || {};
  const adjustments = b.adjustments || [];

  return (
    <section className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-navy900">Bill detail</h2>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill variant={BILL_STATUS[bill.paymentStatus]?.variant || 'neutral'}>
            {BILL_STATUS[bill.paymentStatus]?.label || bill.paymentStatus}
          </StatusPill>
          {bill.isOverdue && <StatusPill variant="error">Overdue</StatusPill>}
        </div>
      </div>

      <Card title={bill.period ? `${bill.period.startDate} – ${bill.period.endDate}` : 'Billing period'}>
        <div className="divide-y divide-ice100">
          <Row label="Meal rate">{b.mealRate == null ? '—' : formatTaka(b.mealRate)}</Row>
          <Row label="Own meals">{b.ownMealCount}</Row>
          <Row label="Guest meals">{b.guestMealCount}</Row>
          <Row label="Billable meals">{b.billableMeals}</Row>
          <Row label="Meal cost">{formatTaka(b.mealCost)}</Row>
          <Row label={`Fixed share${b.fixedCostPolicy ? ` (${b.fixedCostPolicy})` : ''}`}>{formatTaka(b.fixedCostShare)}</Row>

          {adjustments.length > 0 ? (
            adjustments.map((adj, idx) => (
              <Row key={idx} label={`Adjustment · ${adj.reason || '—'}`}>{formatTaka(adj.amount)}</Row>
            ))
          ) : (
            <Row label="Adjustments">None</Row>
          )}
          <Row label="Adjustments net">{formatTaka(b.adjustmentsNet)}</Row>
          <Row label="Total due" strong>{formatTaka(b.totalDue)}</Row>
          <Row label="Confirmed payments">− {formatTaka(bill.confirmedPayments)}</Row>
          <Row label="Pending (awaiting confirmation)">
            <span className="text-statusPending">{formatTaka(bill.pendingPayments)}</span>
          </Row>
          <Row label="Outstanding" strong>{formatTaka(bill.outstanding)}</Row>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-secondaryText">Due by {bill.dueDate || '—'}</p>
          <Button onClick={() => navigate(`/resident/bills/${bill.id}/pay`)} disabled={bill.outstanding <= 0}>
            {bill.outstanding <= 0 ? 'Nothing left to pay' : 'Pay now'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
