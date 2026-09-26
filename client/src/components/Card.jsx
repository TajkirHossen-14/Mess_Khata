export default function Card({ children, title, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-sky-blue-300 p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-deep-navy-900 mb-4 font-heading">{title}</h3>}
      {children}
    </div>
  );
}
