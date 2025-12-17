import React from 'react';
import { Role } from './RoleToggle';

interface Benefit {
  icon: string;
  label: string;
}

const FARMER_BENEFITS: Benefit[] = [
  { icon: 'trending_up', label: 'MSP-aware pricing' },
  { icon: 'bolt', label: 'Instant payments' },
  { icon: 'local_shipping', label: 'Free pickup' },
];

const BUYER_BENEFITS: Benefit[] = [
  { icon: 'verified', label: 'Verified supply' },
  { icon: 'home', label: 'Doorstep delivery' },
  { icon: 'savings', label: 'Wholesale prices' },
];

interface BenefitChipsProps {
  role: Role;
}

export const BenefitChips: React.FC<BenefitChipsProps> = ({ role }) => {
  const benefits = role === 'farmer' ? FARMER_BENEFITS : BUYER_BENEFITS;
  const accentColor = role === 'farmer' ? 'primary' : 'cyan-500';

  return (
    <div className="flex flex-wrap gap-3">
      {benefits.map((benefit, index) => (
        <div
          key={index}
          className={`group flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/50 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
            role === 'farmer' 
              ? 'hover:border-primary/50 hover:shadow-primary/10' 
              : 'hover:border-cyan-500/50 hover:shadow-cyan-500/10'
          }`}
        >
          <span className={`material-symbols-outlined text-lg ${
            role === 'farmer' ? 'text-primary' : 'text-cyan-500'
          }`}>
            {benefit.icon}
          </span>
          <span className="text-sm font-semibold text-text-main dark:text-white">
            {benefit.label}
          </span>
        </div>
      ))}
    </div>
  );
};
