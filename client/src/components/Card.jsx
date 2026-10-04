export default function Card({ title, footer, children, className = '' }) {
  return (
    <div className={`bg-white rounded-card shadow-sm ${className}`}>
      {(title || footer) && (
        <div className="px-6 py-4 border-b border-ice100">
          {title && <h3 className="text-lg font-semibold text-darkText font-heading">{title}</h3>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-ice100">{footer}</div>}
    </div>
  );
}
