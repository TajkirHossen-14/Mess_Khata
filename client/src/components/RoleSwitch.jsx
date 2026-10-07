import { useNavigate } from 'react-router-dom';

export default function RoleSwitch({ activeRole, onSwitch }) {
  const navigate = useNavigate();

  const handleSwitch = (role) => {
    onSwitch(role);
    const path = role === 'manager' ? '/manager/dashboard' : '/resident/dashboard';
    navigate(path, { replace: true });
  };

  return (
    <div className="flex items-center rounded-control border border-sky300 bg-white p-0.5">
      <button
        type="button"
        onClick={() => handleSwitch('resident')}
        className={`rounded-compact px-3 py-1.5 text-xs font-medium transition-colors ${
          activeRole === 'resident'
            ? 'bg-blue700 text-white'
            : 'text-secondaryText hover:text-navy900'
        }`}
      >
        Resident
      </button>
      <button
        type="button"
        onClick={() => handleSwitch('manager')}
        className={`rounded-compact px-3 py-1.5 text-xs font-medium transition-colors ${
          activeRole === 'manager'
            ? 'bg-blue700 text-white'
            : 'text-secondaryText hover:text-navy900'
        }`}
      >
        Manager
      </button>
    </div>
  );
}
