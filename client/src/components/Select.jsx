export default function Select({ label, error, id, options = [], className = '', ...props }) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      {label && <span className="text-sm font-medium text-secondaryText">{label}</span>}
      <select
        id={id}
        className={`w-full rounded-compact border border-sky300 bg-white px-3.5 py-2.5 text-darkText outline-none transition focus:ring-2 focus:ring-sky300 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      {error && <span className="block text-sm text-statusError">{error}</span>}
    </label>
  );
}
