import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';

export default function MealRecords() {
  const { token } = useAuth();
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const response = await fetch('/api/billing-periods', {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('messkhata_token')}`,
          },
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load billing periods');
        }
        setBillingPeriods(result.data || []);
        if (result.data?.length) {
          setSelectedPeriodId(result.data[0]._id);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    loadPeriods();
  }, [token]);

  useEffect(() => {
    if (!selectedPeriodId) return;

    const loadRecords = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/meal-records?billingPeriodId=${selectedPeriodId}`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('messkhata_token')}`,
          },
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load meal records');
        }
        setRecords(result.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [selectedPeriodId, token]);

  return (
    <Card className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-navy900">Meal Records</h2>
          <p className="text-sm text-slate-600">Review meal counts captured for each billing period.</p>
        </div>

        <select
          value={selectedPeriodId}
          onChange={(event) => setSelectedPeriodId(event.target.value)}
          className="rounded-control border border-sky300 bg-white px-3 py-2 text-sm text-navy900"
        >
          {billingPeriods.length === 0 ? (
            <option value="">No billing periods</option>
          ) : (
            billingPeriods.map((period) => (
              <option key={period._id} value={period._id}>
                {new Date(period.startDate).toISOString().slice(0, 10)} to {new Date(period.endDate).toISOString().slice(0, 10)}
              </option>
            ))
          )}
        </select>
      </div>

      {error && <div className="rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-10 text-center text-slate-500">Loading meal records...</div>
      ) : (
        <div className="overflow-hidden rounded-control border border-sky300">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ice100 text-navy900">
              <tr>
                <th className="px-4 py-3 font-semibold">Resident</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Own meals</th>
                <th className="px-4 py-3 font-semibold">Guest meals</th>
                <th className="px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    No meal records found for this billing period.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={`${record.residentId?._id || record.residentId}-${record.date}`} className="border-t border-sky300">
                    <td className="px-4 py-3">{record.residentName || 'Unknown resident'}</td>
                    <td className="px-4 py-3">{new Date(record.date).toISOString().slice(0, 10)}</td>
                    <td className="px-4 py-3">{record.ownMealCount || 0}</td>
                    <td className="px-4 py-3">{record.guestMealCount || 0}</td>
                    <td className="px-4 py-3 font-semibold text-blue700">{record.totalMealCount || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
