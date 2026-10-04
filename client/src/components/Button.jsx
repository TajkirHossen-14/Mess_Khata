export default function Button({ variant = 'primary', size = 'md', disabled = false, children, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-control transition-colors focus:outline-none focus:ring-2 focus:ring-sky300 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-blue700 text-white hover:bg-blue600',
    secondary: 'bg-white text-blue700 border border-blue700 hover:bg-ice100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const classes = [base, variants[variant], sizes[size], className].join(' ');

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
