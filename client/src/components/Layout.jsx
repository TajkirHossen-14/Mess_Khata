import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleSwitch from './RoleSwitch';

const residentItems = [
  { label: 'Dashboard', path: '/resident/dashboard' },
  { label: 'Meals', placeholder: true },
  { label: 'Expenses and bills', placeholder: true },
  { label: 'Duty roster', path: '/resident/dashboard' },
  { label: 'Notices', placeholder: true }
];

const managerItems = [
  { label: 'Dashboard', path: '/manager/dashboard' },
  { label: 'Residents', placeholder: true },
  { label: 'Expenses and billing', placeholder: true },
  { label: 'Duty roster', path: '/manager/dashboard' },
  { label: 'Notices and complaints', placeholder: true }
];

const guestItems = [
  { label: 'Home', path: '/' },
  { label: 'Login', path: '/login' },
  { label: 'Register', path: '/register' }
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, activeRole, setActiveRole, logout } = useAuth();
  const navigate = useNavigate();

  const roles = user?.roles || [];
  const isDualRole = roles.length > 1;

  const isManager = location.pathname.startsWith('/manager');
  const isResident = location.pathname.startsWith('/resident');

  let roleLabel = 'Guest';
  if (isManager) roleLabel = 'Manager';
  else if (isResident) roleLabel = 'Resident';

  let items = guestItems;
  if (roles.includes('manager') && activeRole === 'manager') {
    items = managerItems;
  } else if (roles.includes('resident') && activeRole === 'resident') {
    items = residentItems;
  } else if (roles.includes('manager')) {
    items = managerItems;
  } else if (roles.includes('resident')) {
    items = residentItems;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ice50 font-body text-darkText">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-navy900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 -translate-x-full bg-navy900 text-white transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : ''}`}>
        <div className="border-b border-navy800 px-6 py-5">
          <Link to="/" className="font-heading text-xl font-bold" onClick={() => setMenuOpen(false)}>
            MessKhata
          </Link>
        </div>
        <nav aria-label="Main navigation" className="space-y-1 p-4">
          {items.map((item) => item.path ? (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-control px-4 py-3 text-sm font-medium transition-colors ${location.pathname === item.path ? 'bg-ice100 text-navy900' : 'text-white hover:bg-navy800'}`}
            >
              {item.label}
            </Link>
          ) : (
            <span key={item.label} className="block rounded-control px-4 py-3 text-sm text-sky300">
              {item.label}
            </span>
          ))}
        </nav>
        {user && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-navy800 p-4">
            <p className="text-sm text-sky300 truncate">{user.name}</p>
            <p className="text-xs text-sky300/70 truncate">{user.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-control bg-navy800 px-3 py-2 text-sm text-white hover:bg-navy900"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      <div className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-sky300 bg-ice50 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-control text-navy900 hover:bg-ice100 lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <span className="h-0.5 w-5 bg-current" />
              <span className="h-0.5 w-5 bg-current" />
              <span className="h-0.5 w-5 bg-current" />
            </button>
            <h1 className="font-heading text-lg font-semibold text-navy900">MessKhata</h1>
          </div>
          <div className="flex items-center gap-3">
            {isDualRole && <RoleSwitch activeRole={activeRole} onSwitch={setActiveRole} />}
            <span className="rounded-control bg-ice100 px-3 py-1.5 text-sm font-medium text-blue700">{roleLabel}</span>
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-10 w-10 place-items-center rounded-control text-navy900 hover:bg-ice100"
            >
              <span aria-hidden="true">🔔</span>
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
