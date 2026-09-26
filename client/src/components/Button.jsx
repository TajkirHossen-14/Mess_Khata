export default function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variants = {
    primary: 'bg-primary-blue-700 text-white hover:bg-secondary-blue-600',
    secondary: 'bg-ice-blue-100 text-deep-navy-900 hover:bg-soft-blue-400',
    danger: 'bg-status-rejected text-white hover:opacity-90',
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
