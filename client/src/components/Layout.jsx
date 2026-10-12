import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import RoleSwitch from './RoleSwitch.jsx';

const residentLinks = [['Resident dashboard', '/resident/dashboard'], ['Guest Meals', '/resident/guest-meals'], ['My duty schedule', '/resident/duties'], ['Submit complaint', '/resident/complaints/new']];
const managerLinks = [['Manager dashboard', '/manager/dashboard'], ['Duty assignments', '/manager/duties']];

export default function Layout() {
  const { user, logout, activeRole } = useAuth();
  const isDualRole = user?.roles.length > 1;
  const links = !user ? [['Home', '/'], ['Login', '/login'], ['Register', '/register']] : [
    ['Home', '/'],
    ...(user.roles.includes('manager') && (!isDualRole || activeRole === 'manager') ? managerLinks : []),
    ...(user.roles.includes('resident') && (!isDualRole || activeRole === 'resident') ? residentLinks : []),
  ];

  return <div className="min-h-screen bg-ice50 md:flex">
    <aside className="flex shrink-0 flex-col bg-navy900 px-4 py-5 text-white md:min-h-screen md:w-64">
      <NavLink to="/" className="mb-5 font-heading text-xl font-bold">MessKhata</NavLink>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">{links.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `whitespace-nowrap rounded-control px-3 py-2 text-sm transition ${isActive ? 'bg-blue700 text-white' : 'text-ice100 hover:bg-navy800'}`}>{label}</NavLink>)}</nav>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex min-h-16 items-center justify-end gap-3 bg-ice50 px-5 py-3">
        {user && <><RoleSwitch /><span className="hidden text-sm text-secondaryText sm:block">{user.name}</span><button className="rounded-control px-3 py-2 text-sm text-blue700 hover:bg-ice100" onClick={logout}>Log out</button></>}
        <button aria-label="Notifications" className="rounded-control p-2 text-blue700 hover:bg-ice100">◌</button>
      </header>
      <main className="p-5 md:p-8"><Outlet /></main>
    </div>
  </div>;
}
