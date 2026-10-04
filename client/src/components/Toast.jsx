import { useState, useEffect } from 'react';

const styles = {
  success: 'bg-statusSuccess text-white',
  error: 'bg-statusError text-white',
  pending: 'bg-statusPending text-white',
};

export default function Toast({ message, variant = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-control shadow-md ${styles[variant] || styles.success}`}>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
