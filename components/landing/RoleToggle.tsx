import React from 'react';

export type Role = 'farmer' | 'buyer';

interface RoleToggleProps {
  role: Role;
  onChange: (role: Role) => void;
}

export const RoleToggle: React.FC<RoleToggleProps> = ({ role, onChange }) => {
  return (
    <div className="flex rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 p-1.5 w-fit shadow-lg shadow-black/5">
      <button
        type="button"
        onClick={() => onChange('farmer')}
        aria-pressed={role === 'farmer'}
        className={`relative px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          role === 'farmer'
            ? 'bg-gradient-to-r from-primary to-emerald-500 text-white shadow-lg shadow-primary/30'
            : 'text-text-main dark:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        {role === 'farmer' && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-emerald-500 blur-md opacity-50 -z-10" />
        )}
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">agriculture</span>
          I'm a Farmer
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange('buyer')}
        aria-pressed={role === 'buyer'}
        className={`relative px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${
          role === 'buyer'
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
            : 'text-text-main dark:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        {role === 'buyer' && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 blur-md opacity-50 -z-10" />
        )}
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">shopping_cart</span>
          I'm a Buyer
        </span>
      </button>
    </div>
  );
};
