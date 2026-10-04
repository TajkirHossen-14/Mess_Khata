export default function Input({ label, error, id, className = '', ...props }) {
  const inputId = id || props.name;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-secondaryText">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-white border border-sky300 rounded-compact text-darkText placeholder:text-mutedText focus:outline-none focus:ring-2 focus:ring-sky300 ${error ? 'border-statusError' : ''}`}
        {...props}
      />
      {error && <span className="text-sm text-statusError">{error}</span>}
    </div>
  );
}
