import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

const initialForm = { name: '', purchasePrice: '', purchaseDate: '', usefulLife: '' };

export default function SharedAssetRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [residents, setResidents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('messkhata_token');

  useEffect(() => {
    let active = true;
    const loadResidents = async () => {
      try {
        const response = await fetch('/api/shared-assets/residents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load residents');
        if (active) setResidents(result.data);
      } catch (error) {
        if (active) setMessage({ type: 'error', text: error.message || 'Unable to load residents' });
      } finally {
        if (active) setLoadingResidents(false);
      }
    };
    loadResidents();
    return () => { active = false; };
  }, [token]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Asset name is required';
    if (form.purchasePrice === '' || !Number.isFinite(Number(form.purchasePrice)) || Number(form.purchasePrice) <= 0) {
      nextErrors.purchasePrice = 'Enter a positive purchase price';
    }
    if (!form.purchaseDate || Number.isNaN(new Date(`${form.purchaseDate}T00:00:00`).getTime())) {
      nextErrors.purchaseDate = 'Purchase date is required';
    }
    if (form.usefulLife === '' || !Number.isFinite(Number(form.usefulLife)) || Number(form.usefulLife) <= 0) {
      nextErrors.usefulLife = 'Enter a positive useful life';
    }
    if (participants.length === 0) nextErrors.participants = 'Select at least one participant';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/shared-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, participantIds: participants }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to register asset');
      setMessage({ type: 'success', text: `${result.data.asset.name} was registered with ${result.data.participants.length} participant(s).` });
      setForm(initialForm);
      setParticipants([]);
      setErrors({});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to register asset' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link to="/manager/dashboard" className="text-sm font-medium text-blue700 hover:underline">← Manager dashboard</Link>
        <h2 className="mt-3 font-heading text-2xl font-bold text-navy900">Register shared asset</h2>
        <p className="mt-1 text-secondaryText">Add purchase details and choose the residents sharing this asset.</p>
      </div>
      <Card>
        {message && (
          <div role={message.type === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-control px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-statusError' : 'bg-ice100 text-navy900'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Input label="Asset name" name="name" value={form.name} onChange={updateField} error={errors.name} maxLength={120} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Purchase price" name="purchasePrice" type="number" min="0.01" step="any" value={form.purchasePrice} onChange={updateField} error={errors.purchasePrice} required />
            <Input label="Purchase date" name="purchaseDate" type="date" value={form.purchaseDate} onChange={updateField} error={errors.purchaseDate} required />
            <Input label="Useful life (years)" name="usefulLife" type="number" min="0.01" step="any" value={form.usefulLife} onChange={updateField} error={errors.usefulLife} required />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-secondaryText">Participants <span className="text-statusError">*</span></legend>
            {loadingResidents ? <p className="text-sm text-mutedText">Loading residents…</p> : residents.length === 0 ? (
              <p className="text-sm text-mutedText">No active residents are available in this mess.</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-compact border border-sky300 p-2">
                {residents.map((resident) => (
                  <label key={resident.id} className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 hover:bg-ice50">
                    <input
                      type="checkbox"
                      checked={participants.includes(resident.id)}
                      onChange={(event) => setParticipants((current) => event.target.checked
                        ? [...current, resident.id]
                        : current.filter((id) => id !== resident.id))}
                      className="h-4 w-4 accent-blue700"
                    />
                    <span className="text-sm text-darkText">{resident.name}<span className="ml-2 text-mutedText">{resident.email}</span></span>
                  </label>
                ))}
              </div>
            )}
            {errors.participants && <p className="text-sm text-statusError">{errors.participants}</p>}
          </fieldset>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || loadingResidents || residents.length === 0}>
              {submitting ? 'Saving…' : 'Register asset'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
