export default function ResidentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy900">Resident Dashboard</h1>
        <p className="text-secondarytext mt-1">Coming soon - Your mess overview</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Meals This Month', value: '—', icon: '🍽️' },
          { label: 'Pending Bills', value: '—', icon: '📄' },
          { label: 'Duty This Week', value: '—', icon: '📋' },
          { label: 'Balance', value: '৳0', icon: '💰' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-blue300 p-6">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-secondarytext text-sm">{stat.label}</p>
            <p className="font-heading text-xl font-bold text-navy900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}