import { Outlet, Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/resident/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/resident/meals', label: 'Meals', icon: '🍽️' },
  { path: '/resident/expenses', label: 'Expenses', icon: '💰' },
  { path: '/resident/bills', label: 'Bills', icon: '📄' },
  { path: '/resident/payments', label: 'Payments', icon: '💳' },
  { path: '/resident/duty', label: 'Duty Roster', icon: '📋' },
  { path: '/resident/notices', label: 'Notices', icon: '📢' },
  { path: '/resident/complaints', label: 'Complaints', icon: '⚠️' },
]

const managerNavItems = [
  { path: '/manager/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/manager/residents', label: 'Residents', icon: '👥' },
  { path: '/manager/expenses', label: 'Expenses', icon: '💰' },
  { path: '/manager/billing', label: 'Billing', icon: '📊' },
  { path: '/manager/collections', label: 'Collections', icon: '💳' },
  { path: '/manager/assets', label: 'Assets', icon: '🏷️' },
  { path: '/manager/duty', label: 'Duty Roster', icon: '📋' },
  { path: '/manager/notices', label: 'Notices', icon: '📢' },
  { path: '/manager/complaints', label: 'Complaints', icon: '⚠️' },
  { path: '/manager/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const location = useLocation()
  const isManager = location.pathname.startsWith('/manager')
  const isResident = location.pathname.startsWith('/resident')
  const items = isManager ? managerNavItems : (isResident ? navItems : [])

  return (
    <div className="min-h-screen bg-iceblue50 font-body">
      {items.length > 0 && (
        <aside className="fixed left-0 top-0 h-full w-64 bg-navy900 text-white z-40 hidden lg:block">
          <div className="p-6 border-b border-navy800">
            <h1 className="font-heading text-xl font-bold">MessKhata</h1>
          </div>
          <nav className="p-4 space-y-1">
            {items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-iceblue100 text-navy900'
                    : 'text-blue300 hover:bg-navy800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      )}

      <div className="lg:ml-64 min-h-screen">
        <header className="bg-iceblue50 border-b border-blue300 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="font-heading text-xl font-semibold text-navy900">
                {isManager ? 'Manager Portal' : isResident ? 'Resident Portal' : 'MessKhata'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 text-sm font-medium bg-blue100 text-blue700 rounded-full">
                {isManager ? 'Manager' : isResident ? 'Resident' : 'Guest'}
              </span>
              <button className="relative p-2 text-mutedtext hover:text-darktext transition-colors">
                🔔
                <span className="absolute top-1 right-1 w-2 h-2 bg-rejected rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}