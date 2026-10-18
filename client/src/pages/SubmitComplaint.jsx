import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Toast from '../components/Toast.jsx';
import Textarea from '../components/Textarea.jsx';
import { API_BASE, useAuth } from '../context/AuthContext.jsx';

export default function SubmitComplaint() {
  const { token } = useAuth();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) {
      return setToast({ message: 'Complaint content is required', variant: 'error' });
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim(), isAnonymous }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to submit complaint');
      }
      setContent('');
      setIsAnonymous(false);
      setSubmitted(true);
      setToast({ message: 'Your complaint has been submitted.', variant: 'success' });
    } catch (error) {
      setToast({ message: error.message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="mx-auto max-w-2xl" header="Submit a complaint">
        {submitted ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-secondaryText">
              Your complaint has been submitted successfully and will be reviewed by the mess management.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/resident/complaints">
                <Button variant="primary">View My Complaints</Button>
              </Link>
              <Button variant="secondary" onClick={() => setSubmitted(false)}>
                Submit Another Complaint
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Textarea
              label="What would you like to report?"
              id="complaint-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Describe your issue or feedback in detail..."
              required
            />
            <label className="flex items-center gap-2 text-sm text-secondaryText cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="h-4 w-4 rounded border-sky300 text-blue700 focus:ring-sky300"
              />
              Submit anonymously
            </label>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </Button>
          </form>
        )}
      </Card>
      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </>
  );
}
