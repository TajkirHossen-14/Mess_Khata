import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import useAutoRefresh from '../hooks/useAutoRefresh';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusPill from '../components/StatusPill';
import { formatTaka } from '../utils/money';

const COMPLAINT_STATUS = {
  open: { variant: 'pending', label: 'Open' },
  in_review: { variant: 'info', label: 'In review' },
  resolved: { variant: 'success', label: 'Resolved' },
};

function StatCard({ label, value, hint, to }) {
  const body = (
    <div className="h-full rounded-card bg-white p-5 shadow-sm transition-colors hover:bg-ice50">
      <p className="text-sm text-secondaryText">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-navy900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-mutedText">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const groupDutyByDay = (duties) => {
  const groups = new Map();
  for (const duty of duties) {
    if (!groups.has(duty.date)) groups.set(duty.date, []);
    groups.get(duty.date).push(duty);
  }
  return [...groups.entries()];
};

export default function ManagerDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await apiFetch('/dashboard/manager', { token });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Unable to load the dashboard');
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  if (loading) {
    return <div className="mx-auto max-w-6xl py-10 text-center text-secondaryText">Loading…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 py-10 text-center">
        <p className="text-statusError">{error}</p>
        <Button variant="secondary" onClick={load}>Retry</Button>
      </div>
    );
  }

  const { mess, residents, today, periods, billing, payments, complaints, dutyThisWeek } = data;
  const ungenerated = periods.latestEnded && !periods.latestEnded.hasIssuedBills;

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-navy900">{mess.name || 'Your mess'}</h2>
        <p className="mt-1 text-sm text-secondaryText">
          Code {mess.code || '—'} · {today.date}
          {periods.current ? ` · Period ${periods.current.startDate} – ${periods.current.endDate}` : ' · No active billing period'}
        </p>
      </div>

      {ungenerated && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-card border border-statusPending/30 bg-statusPending/10 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-navy900">
            Bills for {periods.latestEnded.startDate} – {periods.latestEnded.endDate} are not generated yet.
          </p>
          <Link to="/manager/billing"><Button size="sm">Generate bills</Button></Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard to="/manager/residents" label="Active residents" value={residents.active} hint={`${residents.total} total`} />
        <StatCard to="/manager/meal-records" label="Expected meals today" value={today.totalExpected} hint={`${today.expectedMeals.length} meal types`} />
        <StatCard to="/manager/billing" label="Outstanding dues" value={formatTaka(billing.outstandingTotal)} hint={`${billing.residentsWithDues} residents · ${billing.overdueBills} overdue`} />
        <StatCard to="/manager/payments" label="Pending payments" value={payments.pendingCount} hint={formatTaka(payments.pendingTotal)} />
        <StatCard to="/manager/complaints" label="Open complaints" value={complaints.openCount} hint={`${complaints.inReviewCount} in review`} />
        <StatCard to="/manager/billing" label="Current period" value={periods.current ? `${periods.current.startDate}` : '—'} hint={periods.current ? `ends ${periods.current.endDate}` : 'none'} />
      </div>

      {/* Expected meals breakdown */}
      <Card title="Today's expected meals">
        {today.expectedMeals.length === 0 ? (
          <p className="py-6 text-center text-sm text-mutedText">No meal types configured.</p>
        ) : (
          <ul className="divide-y divide-ice100">
            {today.expectedMeals.map((meal) => (
              <li key={meal.mealTypeId} className="flex items-center justify-between py-3 text-sm">
                <span className="text-navy900">{meal.name} <span className="text-mutedText">· {meal.time}</span></span>
                <span className="text-secondaryText tabular-nums">Own {meal.ownOn} · Guest {meal.guestCount} · <span className="font-semibold text-navy900">{meal.total}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent complaints */}
        <Card title="Recent complaints">
          {complaints.latest.length === 0 ? (
            <p className="py-6 text-center text-sm text-mutedText">No complaints.</p>
          ) : (
            <ul className="divide-y divide-ice100">
              {complaints.latest.map((item) => {
                const s = COMPLAINT_STATUS[item.status] || { variant: 'neutral', label: item.status };
                return (
                  <li key={item.id} className="space-y-1 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusPill variant={s.variant}>{s.label}</StatusPill>
                        {item.isAnonymous && <StatusPill variant="neutral">Anonymous</StatusPill>}
                      </div>
                    </div>
                    <p className="text-sm text-secondaryText">{item.excerpt}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4">
            <Link to="/manager/complaints" className="text-sm font-medium text-blue700 hover:underline">Review complaints →</Link>
          </div>
        </Card>

        {/* Duty this week grouped by day */}
        <Card title="This week's duty roster">
          {dutyThisWeek.length === 0 ? (
            <p className="py-6 text-center text-sm text-mutedText">No duties scheduled this week.</p>
          ) : (
            <div className="space-y-4">
              {groupDutyByDay(dutyThisWeek).map(([date, duties]) => (
                <div key={date}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-mutedText">{date}</p>
                  <ul className="mt-1 divide-y divide-ice100">
                    {duties.map((duty) => (
                      <li key={duty.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="capitalize text-navy900">{duty.type} duty</span>
                        <span className="text-secondaryText">{duty.residentName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link to="/manager/duty-assignments" className="text-sm font-medium text-blue700 hover:underline">Manage duty roster →</Link>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card title="Quick actions">
        <div className="flex flex-wrap gap-3">
          <Link to="/manager/payments"><Button variant="secondary" size="sm">Review payments</Button></Link>
          <Link to="/manager/billing"><Button variant="secondary" size="sm">Generate bills</Button></Link>
          <Link to="/manager/duty-assignments"><Button variant="secondary" size="sm">Assign duty</Button></Link>
          <Link to="/manager/meal-config"><Button variant="secondary" size="sm">Meal configuration</Button></Link>
          <Link to="/manager/fixed-costs"><Button variant="secondary" size="sm">Fixed costs</Button></Link>
        </div>
      </Card>
    </section>
  );
}
