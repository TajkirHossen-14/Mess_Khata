export default function Textarea({ label, error, id, className = '', rows = 4, ...props }) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      {label && <span className="text-sm font-medium text-secondaryText">{label}</span>}
      <textarea
        id={id}
        rows={rows}
        className={`w-full rounded-compact border border-sky300 bg-white px-3.5 py-2.5 text-darkText outline-none transition focus:ring-2 focus:ring-sky300 ${className}`}
        {...props}
      />
      {error && <span className="block text-sm text-statusError">{error}</span>}
    </label>
  );
}
