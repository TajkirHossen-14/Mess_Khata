import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleSwitch from './RoleSwitch';

const guestItems = [
  { label: 'Home', href: '/' },
  { label: 'Login', href: '/login' },
  { label: 'Register', href: '/register' },
];

const managerItems = [
  { label: 'Dashboard', path: '/manager/dashboard' },
  { label: 'Residents', path: '/manager/residents' },
  { label: 'Meal records', path: '/manager/meal-records' },
  { label: 'Expenses and billing', placeholder: true },
  { label: 'Notices', placeholder: true },
];

const residentItems = [
  { label: 'Dashboard', href: '/resident/dashboard' },
  { label: 'My Duty Schedule', href: '/resident/duty' },
  { label: 'Meal Declaration', href: '/resident/meals' },
  { label: 'Guest Meals', href: '/resident/guest-meals' },
  { label: 'Meal Records', href: '/meal-records' },
  { label: 'My Complaints', href: '/resident/complaints' },
  { label: 'Expenses and bills', placeholder: true },
  { label: 'Notices', placeholder: true },
];

const getMenuItems = (user, activeRole) => {
  const roles = (user && user.roles) || [];
  if (roles.length === 0) return guestItems;

  const role = activeRole || (roles.includes('manager') ? 'manager' : 'resident');

  if (role === 'manager' && roles.includes('manager')) return managerItems;
  if (role === 'resident' && roles.includes('resident')) return residentItems;
  return guestItems;
};

const getRoleLabel = (user, activeRole) => {
  const roles = (user && user.roles) || [];
  if (roles.length === 0) return 'Guest';
  const role = activeRole || (roles.includes('manager') ? 'manager' : 'resident');
  return role === 'manager' ? 'Manager' : 'Resident';
};

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, activeRole, logout } = useAuth();
  const navigate = useNavigate();
  const menuItems = getMenuItems(user, activeRole);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ice50 font-body text-darkText md:flex">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-navy900/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col bg-navy900 text-white transition-transform md:static md:translate-x-0 ${menuOpen ? 'translate-x-0' : ''}`}
      >
        <div className="flex items-center justify-between border-b border-navy800 px-6 py-5">
          <h2 className="font-heading text-xl font-bold">MessKhata</h2>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="rounded-control p-1 text-sky300 hover:text-white md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {menuItems.map((item) => (
            item.placeholder ? (
              <span key={item.label} className="block rounded-control px-4 py-3 text-sm text-sky300">
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.label}
                to={item.href}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-control px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-sky300 hover:bg-navy800 hover:text-white'}`
                }
              >
                {item.label}
              </NavLink>
            )
          ))}
        </nav>

        {user && (
          <div className="border-t border-navy800 px-6 py-4">
            <p className="truncate text-sm text-white">{user.name}</p>
            <p className="truncate text-xs text-sky300">{user.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-control bg-navy800 px-3 py-2 text-sm font-medium text-white hover:bg-navy900"
            >
              Log out
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-sky300 bg-ice50 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-control text-navy900 hover:bg-ice100 md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <span className="h-0.5 w-5 bg-current" />
              <span className="h-0.5 w-5 bg-current" />
              <span className="h-0.5 w-5 bg-current" />
            </button>
            <span className="rounded-control bg-ice100 px-3 py-1.5 text-sm font-medium text-blue700">
              {getRoleLabel(user, activeRole)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <RoleSwitch />
            <button className="relative p-2 text-navy900 hover:text-blue700" aria-label="Notifications">
              <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-statusError" />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.03 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 00-2-2v0a2 2 0 00-2 2v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
