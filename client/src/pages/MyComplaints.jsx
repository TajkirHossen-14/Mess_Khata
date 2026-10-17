import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import StatusPill from '../components/StatusPill.jsx';
import Toast from '../components/Toast.jsx';
import { API_BASE, useAuth } from '../context/AuthContext.jsx';

export default function MyComplaints() {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchMyComplaints = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/complaints/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch complaints');
        }
        setComplaints(data.data || []);
      } catch (err) {
        setToast({ message: err.message, variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, [token]);

  const renderStatus = (status) => {
    if (status === 'resolved') return <StatusPill status="success">Resolved</StatusPill>;
    if (status === 'in_review') return <StatusPill status="info">In Review</StatusPill>;
    return <StatusPill status="pending">Open</StatusPill>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-sora font-extrabold text-darkText">My Complaints</h1>
          <p className="text-sm text-secondaryText mt-1">Track the status and manager responses to your complaints.</p>
        </div>
        <Link to="/resident/complaints/new">
          <Button variant="primary">Submit New Complaint</Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-secondaryText">Loading your complaints…</p>
        </Card>
      ) : complaints.length === 0 ? (
        <Card>
          <div className="py-8 text-center space-y-3">
            <p className="text-secondaryText">You have not submitted any complaints yet.</p>
            <Link to="/resident/complaints/new">
              <Button variant="secondary">Submit a complaint</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((item) => (
            <Card key={item.id} className="transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-ice100">
                <span className="text-xs text-mutedText">
                  Submitted on {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  {item.isAnonymous && <StatusPill status="neutral">Anonymous</StatusPill>}
                  {renderStatus(item.status)}
                </div>
              </div>

              <div className="pt-3">
                <p className="text-sm text-darkText whitespace-pre-wrap">{item.content}</p>
              </div>

              {item.response ? (
                <div className="mt-4 rounded-compact border border-sky300 bg-ice50 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-secondaryText uppercase tracking-wider">
                    <span>Manager Response</span>
                    {item.respondedAt && (
                      <span className="normal-case font-normal text-mutedText">
                        {new Date(item.respondedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-darkText whitespace-pre-wrap">{item.response}</p>
                </div>
              ) : (
                <div className="mt-3 text-xs text-mutedText italic">
                  Awaiting response from manager.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
