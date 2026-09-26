export default function Card({
  children,
  header,
  footer,
  className = '',
  hover = false
}) {
  return (
    <div className={`bg-white rounded-card border border-blue300 shadow-sm ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-blue300">
          {header}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-blue300 bg-iceblue50 rounded-b-card">
          {footer}
        </div>
      )}
    </div>
  )
}