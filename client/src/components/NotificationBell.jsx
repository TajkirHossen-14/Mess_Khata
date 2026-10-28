import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import useAutoRefresh from '../hooks/useAutoRefresh';

const TYPE_META = {
  meal_deadline: { label: 'Meal', color: 'bg-statusPending' },
  bill_due: { label: 'Bill', color: 'bg-blue600' },
  payment_status: { label: 'Payment', color: 'bg-statusSuccess' },
  duty_reminder: { label: 'Duty', color: 'bg-blue400' },
  complaint: { label: 'Complaint', color: 'bg-statusError' },
  general: { label: 'Update', color: 'bg-mutedText' },
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  const load = useCallback(async () => {
    const { body } = await apiGet('/notifications', { params: { limit: 50 } });
    if (body?.success) {
      setItems(body.data.items);
      setUnreadCount(body.data.unreadCount);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = async (id) => {
    await apiPost(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAll = async () => {
    await apiPost('/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const visible = items.slice(0, limit);
  const badge = unreadCount === 0 ? null : unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-control hover:bg-ice100 text-secondaryText"
        aria-label="Notifications"
      >
        <span className="text-lg leading-none">🔔</span>
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-statusError text-white text-[10px] font-semibold flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] overflow-y-auto bg-white rounded-panel shadow-lg border border-ice100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ice100 sticky top-0 bg-white">
            <h4 className="font-semibold text-darkText font-heading">Notifications</h4>
            <button onClick={markAll} className="text-sm text-blue700 hover:underline">Mark all as read</button>
          </div>

          {error && <div className="px-4 py-2 text-sm text-statusError">{error}</div>}
          {visible.length === 0 && !error && (
            <div className="px-4 py-8 text-center text-mutedText text-sm">No notifications yet.</div>
          )}

          <ul className="divide-y divide-ice100">
            {visible.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.general;
              return (
                <li
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-ice50 ${n.isRead ? 'opacity-70' : 'bg-ice50/60'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${n.isRead ? 'text-secondaryText' : 'font-semibold text-darkText'}`}>{n.title}</p>
                        <span className="text-xs text-mutedText whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-sm text-secondaryText mt-0.5 break-words">{n.content}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {items.length > visible.length && (
            <button onClick={() => setLimit((l) => l + 10)} className="w-full py-3 text-sm text-blue700 hover:bg-ice50">
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
