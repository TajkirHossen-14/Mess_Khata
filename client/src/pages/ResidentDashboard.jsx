import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import useFetch from '../hooks/useFetch';
import useAutoRefresh from '../hooks/useAutoRefresh';
import PageState, { Loading, EmptyState, ErrorState } from '../components/PageState';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusPill from '../components/StatusPill';
import { billPaymentStatusPill } from '../utils/billStatus';
import { formatTaka } from '../utils/money';

function StatCard({ label, value, tone, to }) {
  const inner = (
    <div className="bg-white rounded-card shadow-sm p-5 h-full">
      <p className="text-sm text-mutedText">{label}</p>
      <p className={`mt-2 text-2xl font-heading font-bold tabular-nums ${tone || 'text-darkText'}`}>{value}</p>
    </div>
  );
  return to ? <Link to={to} className="block hover:shadow-md transition-shadow">{inner}</Link> : inner;
}

const mealPill = (meal) => {
  if (meal.isLocked && !meal.status) return { status: 'info', label: 'Locked' };
  if (meal.status === 'on') return { status: 'success', label: 'ON' };
  if (meal.status === 'off') return { status: 'error', label: 'OFF' };
  return { status: 'pending', label: 'Not declared' };
};

export default function ResidentDashboard() {
  const { data, loading, error, reload } = useFetch(
    () => get('/dashboard/resident', { params: { scope: 'me' } }).then((b) => b.data),
    [],
  );
  useAutoRefresh(reload);

  if (loading) return <PageState><Card><Loading /></Card></PageState>;
  if (error) return <PageState><Card><ErrorState message={error} onRetry={reload} /></Card></PageState>;

  const { resident, today, billing, mealCounts, notifications, upcomingDuties } = data;

  return (
    <PageState>
      <h1 className="text-2xl font-heading font-bold text-navy900">Hello, {resident.name}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Outstanding due"
          value={formatTaka(billing.outstandingTotal)}
          tone={billing.outstandingTotal > 0 ? 'text-statusError' : 'text-statusSuccess'}
          to="/resident/bills"
        />
        <StatCard
          label="This period's meals"
          value={mealCounts ? `${mealCounts.own} / ${mealCounts.guest} / ${mealCounts.billable}` : '—'}
        />
        <StatCard
          label="Next due date"
          value={billing.nextDue ? billing.nextDue.dueDate : '—'}
          to="/resident/bills"
        />
      </div>

      <Card title="Today's meals">
        {!today.meals.length ? (
          <EmptyState title="No meals scheduled" description="The manager has not configured meal types yet." />
        ) : (
          <ul className="divide-y divide-ice100">
            {today.meals.map((meal) => {
              const pill = mealPill(meal);
              return (
                <li key={meal.mealTypeId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-darkText">{meal.name}</p>
                    <p className="text-xs text-mutedText">
                      {meal.time}
                      {meal.isLocked ? ' · Locked' : ` · Cutoff ${new Date(meal.cutoffAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <StatusPill status={pill.status}>{pill.label}</StatusPill>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {billing.latestBill && (
        <Card title="Latest bill">
          {(() => {
            const b = billing.latestBill;
            const pill = billPaymentStatusPill(b.paymentStatus, b.dueDate < today.date && b.outstanding > 0);
            return (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-mutedText">
                    {b.period ? `${b.period.startDate} → ${b.period.endDate}` : '—'} · Due {b.dueDate}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-darkText tabular-nums">
                    Outstanding {formatTaka(b.outstanding)}
                  </p>
                  <div className="mt-1"><StatusPill status={pill.status}>{pill.label}</StatusPill></div>
                </div>
                <Link to={`/resident/bills/${b.id}`}>
                  <Button variant="primary" disabled={b.outstanding <= 0}>
                    {b.outstanding <= 0 ? 'Settled' : 'Pay now'}
                  </Button>
                </Link>
              </div>
            );
          })()}
        </Card>
      )}

      <Card title={`Notifications${notifications.unreadCount ? ` (${notifications.unreadCount} new)` : ''}`}>
        {!notifications.latest.length ? (
          <EmptyState title="No notifications" />
        ) : (
          <ul className="divide-y divide-ice100">
            {notifications.latest.map((n) => (
              <li key={n.id} className={`py-3 ${n.isRead ? 'opacity-70' : ''}`}>
                <p className="text-sm font-medium text-darkText">{n.title}</p>
                <p className="text-sm text-secondaryText">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Upcoming duty">
        {!upcomingDuties.length ? (
          <EmptyState title="No upcoming duty" />
        ) : (
          <ul className="divide-y divide-ice100">
            {upcomingDuties.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between">
                <span className="text-sm text-darkText">{d.type}</span>
                <span className="text-sm text-mutedText">{d.date}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to="/resident/bills"><Button variant="secondary" size="sm">View bills</Button></Link>
        <Link to="/resident/payments"><Button variant="secondary" size="sm">Payment history</Button></Link>
      </div>
    </PageState>
  );
}
