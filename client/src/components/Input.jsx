export default function Input({ label, error, ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-dark-text mb-1">{label}</label>}
      <input
        className={`w-full px-3 py-2 rounded-lg border bg-white text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue-700 ${
          error ? 'border-status-rejected' : 'border-sky-blue-300'
        }`}
        {...props}
      />
      {error && <p className="text-status-rejected text-sm mt-1">{error}</p>}
    </div>
  );
}
