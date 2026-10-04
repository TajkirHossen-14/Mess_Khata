import { useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Toast from '../components/Toast.jsx';
import { API_BASE, useAuth } from '../context/AuthContext.jsx';

export default function SubmitComplaint() {
  const { token } = useAuth(); const [content, setContent] = useState(''); const [isAnonymous, setIsAnonymous] = useState(false); const [toast, setToast] = useState(null); const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => { event.preventDefault(); if (!content.trim()) return setToast({ message: 'Complaint content is required', variant: 'error' }); setSubmitting(true); try {
    const response = await fetch(`${API_BASE}/complaints`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content, isAnonymous }) });
    const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Unable to submit complaint');
    setContent(''); setIsAnonymous(false); setToast({ message: 'Your complaint has been submitted.', variant: 'success' });
  } catch (error) { setToast({ message: error.message, variant: 'error' }); } finally { setSubmitting(false); } };
  return <><Card className="mx-auto max-w-2xl" header="Submit a complaint"><form onSubmit={submit} className="space-y-4"><label className="block space-y-1.5"><span className="text-sm font-medium text-secondaryText">What would you like to report?</span><textarea value={content} onChange={(event) => setContent(event.target.value)} rows="6" className="w-full rounded-compact border border-sky300 bg-white px-3.5 py-2.5 text-darkText outline-none focus:ring-2 focus:ring-sky300" /></label><label className="flex items-center gap-2 text-sm text-secondaryText"><input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} />Submit anonymously</label><Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit complaint'}</Button></form></Card><Toast {...toast} onDismiss={() => setToast(null)} /></>;
}
