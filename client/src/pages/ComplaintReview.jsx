import { useState, useEffect, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Select from '../components/Select.jsx';
import Textarea from '../components/Textarea.jsx';
import StatusPill from '../components/StatusPill.jsx';
import Table from '../components/Table.jsx';
import Toast from '../components/Toast.jsx';
import { API_BASE, useAuth } from '../context/AuthContext.jsx';

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Resolved', value: 'resolved' },
];

const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Resolved', value: 'resolved' },
];

export default function ComplaintReview() {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalStatus, setModalStatus] = useState('open');
  const [modalResponse, setModalResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const url = filterStatus
        ? `${API_BASE}/complaints?status=${filterStatus}`
        : `${API_BASE}/complaints`;
      const res = await fetch(url, {
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
  }, [filterStatus, token]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleOpenModal = (complaint) => {
    setSelectedComplaint(complaint);
    setModalStatus(complaint.status);
    setModalResponse(complaint.response || '');
  };

  const handleCloseModal = () => {
    setSelectedComplaint(null);
    setModalResponse('');
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: modalStatus,
          response: modalResponse,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update complaint');
      }
      setToast({ message: 'Complaint review saved successfully', variant: 'success' });
      handleCloseModal();
      fetchComplaints();
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === 'resolved') return <StatusPill status="success">Resolved</StatusPill>;
    if (status === 'in_review') return <StatusPill status="info">In Review</StatusPill>;
    return <StatusPill status="pending">Open</StatusPill>;
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: 'content',
      label: 'Content Excerpt',
      render: (val) => (
        <span className="font-medium text-darkText line-clamp-1 max-w-xs">
          {val.length > 55 ? `${val.slice(0, 55)}…` : val}
        </span>
      ),
    },
    {
      key: 'submitter',
      label: 'Submitter',
      render: (_, row) =>
        row.isAnonymous ? (
          <StatusPill status="neutral">Anonymous</StatusPill>
        ) : (
          <span className="text-sm text-secondaryText">{row.submitter?.name || 'Resident'}</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => renderStatusBadge(val),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(row)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-sora font-extrabold text-darkText">Complaint Review</h1>
          <p className="text-sm text-secondaryText mt-1">Review and respond to resident complaints and feedback.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => {
          const isActive = filterStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={`rounded-control px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue700 text-white shadow-sm'
                  : 'bg-white text-secondaryText border border-sky300 hover:bg-ice50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-secondaryText">Loading complaints…</p>
        ) : (
          <Table columns={columns} data={complaints} />
        )}
      </Card>

      <Modal isOpen={Boolean(selectedComplaint)} onClose={handleCloseModal} title="Review Complaint">
        {selectedComplaint && (
          <form onSubmit={handleSaveReview} className="space-y-4">
            <div className="rounded-compact bg-ice50 p-4 border border-sky300 space-y-2">
              <div className="flex items-center justify-between text-xs text-secondaryText">
                <span>Submitted on {new Date(selectedComplaint.createdAt).toLocaleDateString()}</span>
                {selectedComplaint.isAnonymous ? (
                  <StatusPill status="neutral">Anonymous</StatusPill>
                ) : (
                  <span className="font-medium text-darkText">By {selectedComplaint.submitter?.name || 'Resident'}</span>
                )}
              </div>
              <p className="text-sm text-darkText whitespace-pre-wrap">{selectedComplaint.content}</p>
            </div>

            <Select
              label="Status"
              id="review-status"
              value={modalStatus}
              onChange={(e) => setModalStatus(e.target.value)}
              options={statusOptions}
              required
            />

            <Textarea
              label="Manager Response"
              id="review-response"
              value={modalResponse}
              onChange={(e) => setModalResponse(e.target.value)}
              rows={4}
              placeholder="Write a clear resolution or explanation for the resident..."
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Response'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
