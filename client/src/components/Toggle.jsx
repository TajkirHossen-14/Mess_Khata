import React from 'react';

const Toggle = ({ checked, onChange, disabled, label }) => {
  return (
    <label className={`flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          role="switch"
          aria-checked={checked}
        />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue700' : 'bg-ice100'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
      {label && <span className="ml-3 text-sm font-medium text-darkText">{label}</span>}
    </label>
  );
};

export default Toggle;

