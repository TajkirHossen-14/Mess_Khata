import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Toast from '../components/Toast';

export default function MealDeclaration() {
  const { token } = useAuth();

  // Default to today in YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [windowData, setWindowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchDeclarationWindow = useCallback(async (date) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/meals?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('messkhata_token')}`,
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setWindowData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load meal declarations');
      }
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDeclarationWindow(selectedDate);
  }, [fetchDeclarationWindow, selectedDate]);

  const handleToggleMeal = async (slot) => {
    if (!slot.isOpen) return;

    setUpdatingId(slot.mealTypeId);
    const newCount = slot.count > 0 ? 0 : 1;

    try {
      const response = await fetch('/api/meals/declare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('messkhata_token')}`,
        },
        body: JSON.stringify({
          mealTypeId: slot.mealTypeId,
          date: selectedDate,
          count: newCount,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update meal declaration');
      }

      setToast({
        message: `${slot.name} set to ${newCount > 0 ? 'ON' : 'OFF'}`,
        variant: 'success',
      });
      await fetchDeclarationWindow(selectedDate);
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCountChange = async (slot, newCount) => {
    if (!slot.isOpen) return;
    if (newCount < 0) return;

    setUpdatingId(slot.mealTypeId);
    try {
      const response = await fetch('/api/meals/declare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('messkhata_token')}`,
        },
        body: JSON.stringify({
          mealTypeId: slot.mealTypeId,
          date: selectedDate,
          count: newCount,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update meal declaration');
      }

      setToast({
        message: `${slot.name} count updated to ${newCount}`,
        variant: 'success',
      });
      await fetchDeclarationWindow(selectedDate);
    } catch (err) {
      setToast({ message: err.message, variant: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const changeDateBy = (days) => {
    const cur = new Date(`${selectedDate}T00:00:00`);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  return (
    <section className="mx-auto max-w-4xl py-6 space-y-6 font-body text-darkText">
      {/* Date Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-card shadow-sm border border-ice100">
        <div>
          <h2 className="text-xl font-bold font-heading text-navy900">Meal Declaration</h2>
          <p className="text-sm text-secondaryText">Declare your daily meals before each cutoff deadline.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => changeDateBy(-1)}>
            &larr; Prev
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-sky300 rounded-compact text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-sky300"
          />
          <Button variant="secondary" size="sm" onClick={() => changeDateBy(1)}>
            Next &rarr;
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Non-member Notice */}
      {windowData && !windowData.isMember && (
        <div className="rounded-card bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm">
          <strong>Notice:</strong> You are not an active resident on this date ({selectedDate}). Meal declarations cannot be made for this day.
        </div>
      )}

      {/* Meal Slots List */}
      {loading ? (
        <div className="p-8 text-center text-secondaryText">Loading meal declarations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {windowData?.slots?.map((slot) => {
            const isOptedIn = slot.count > 0;
            const cutoffDate = new Date(slot.cutoffAt);
            const cutoffTimeStr = cutoffDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={slot.mealTypeId}
                className={`flex flex-col justify-between transition-all border ${
                  isOptedIn ? 'border-blue400 shadow-sm' : 'border-ice100 opacity-90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold font-heading text-navy900">{slot.name}</h3>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        slot.isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {slot.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <p className="text-sm text-secondaryText mb-1">
                    Meal Time: <span className="font-semibold text-darkText">{slot.time}</span>
                  </p>

                  <p className="text-xs text-mutedText mb-4">
                    Cutoff: {cutoffTimeStr} ({slot.deadlineHoursBefore}h before)
                  </p>

                  {!slot.isOpen && (
                    <p className="text-xs text-statusError bg-red-50 p-2 rounded-compact mb-3">
                      Declaration window has passed.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-ice100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-darkText">Status</span>
                    <button
                      type="button"
                      disabled={!slot.isOpen || updatingId === slot.mealTypeId}
                      onClick={() => handleToggleMeal(slot)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isOptedIn ? 'bg-blue700' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isOptedIn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-secondaryText">Meal Count</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!slot.isOpen || slot.count <= 0 || updatingId === slot.mealTypeId}
                        onClick={() => handleCountChange(slot, slot.count - 1)}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center font-bold text-darkText">{slot.count}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!slot.isOpen || updatingId === slot.mealTypeId}
                        onClick={() => handleCountChange(slot, slot.count + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={3500}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
