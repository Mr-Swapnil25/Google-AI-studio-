import React from 'react';

const TRUST_ITEMS = [
  { icon: 'verified_user', label: 'KYC Verified' },
  { icon: 'lock', label: 'Secure Payments' },
  { icon: 'local_shipping', label: 'Logistics Partner' },
  { icon: 'support_agent', label: '24/7 Support' },
];

export const TrustRow: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/30">
      {TRUST_ITEMS.map((item, index) => (
        <div key={index} className="flex items-center gap-2 text-text-muted dark:text-gray-400">
          <span className="material-symbols-outlined text-lg text-primary/70">{item.icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
          {index < TRUST_ITEMS.length - 1 && (
            <span className="hidden sm:block w-px h-4 bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent ml-4" />
          )}
        </div>
      ))}
    </div>
  );
};
