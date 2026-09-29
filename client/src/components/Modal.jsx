import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white/70 backdrop-blur-[18px] rounded-panel shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ice100">
          <h3 className="text-lg font-semibold text-darkText font-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-mutedText hover:text-darkText text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
