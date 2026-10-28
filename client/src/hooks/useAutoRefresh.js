import { useEffect, useRef } from 'react';

// Refetch on window focus and on a fixed interval. Cleans up its timer.
export default function useAutoRefresh(callback, { intervalMs = 60000, enabled = true } = {}) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => saved.current(), intervalMs);
    const onFocus = () => saved.current();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [intervalMs, enabled]);
}
