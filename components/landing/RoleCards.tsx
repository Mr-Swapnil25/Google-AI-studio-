import React from 'react';
import { Role } from './RoleToggle';
import { InteractiveCard } from '../ui/InteractiveCard';

interface RoleCardsProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  onGetStarted: (role: Role) => void;
}

export const RoleCards: React.FC<RoleCardsProps> = ({ activeRole, onRoleChange, onGetStarted }) => {
  return (
    <section id="trust" className="w-full py-16 lg:py-24 bg-gradient-to-b from-transparent via-white/50 to-transparent dark:via-gray-900/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-3xl lg:text-4xl font-black text-text-main dark:text-white">
            One Platform, Two Experiences
          </h3>
          <p className="mt-4 text-lg text-text-muted dark:text-gray-400 max-w-2xl mx-auto">
            Whether you grow or buy, Anna Bazaar connects you directly—no middlemen, fair prices, instant trust.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Farmer Card */}
          <div onClick={() => onRoleChange('farmer')} className="cursor-pointer">
            <InteractiveCard
              InteractiveColor="#22c55e"
              tailwindBgClass={activeRole === 'farmer' 
                ? 'bg-gradient-to-br from-primary/10 to-emerald-500/10' 
                : 'bg-white/60 dark:bg-gray-800/60'
              }
              borderRadius="24px"
              rotationFactor={0.2}
              className={`backdrop-blur-xl ${
                activeRole === 'farmer'
                  ? 'border-2 border-primary/50 shadow-2xl shadow-primary/10'
                  : 'border border-white/30 dark:border-gray-700/50'
              }`}
            >
              <div className="relative p-8 lg:p-10 h-full">
                {/* Glow */}
                {activeRole === 'farmer' && (
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-emerald-500/20 blur-xl -z-10" />
                )}

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-2xl text-white">agriculture</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-text-main dark:text-white">For Farmers</h4>
                    <p className="text-text-muted dark:text-gray-400">Sell directly, earn more</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {['List produce in seconds', 'Get MSP-aware fair prices', 'Instant bank payments', 'Free pickup from farm'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-main dark:text-gray-300">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => { e.stopPropagation(); onGetStarted('farmer'); }}
                  className={`w-full py-4 rounded-full font-bold text-lg transition-all duration-300 ${
                    activeRole === 'farmer'
                      ? 'bg-gradient-to-r from-primary to-emerald-500 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  Start Selling
                </button>
              </div>
            </InteractiveCard>
          </div>

          {/* Buyer Card */}
          <div onClick={() => onRoleChange('buyer')} className="cursor-pointer">
            <InteractiveCard
              InteractiveColor="#06b6d4"
              tailwindBgClass={activeRole === 'buyer' 
                ? 'bg-gradient-to-br from-cyan-500/10 to-teal-500/10' 
                : 'bg-white/60 dark:bg-gray-800/60'
              }
              borderRadius="24px"
              rotationFactor={0.2}
              className={`backdrop-blur-xl ${
                activeRole === 'buyer'
                  ? 'border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10'
                  : 'border border-white/30 dark:border-gray-700/50'
              }`}
            >
              <div className="relative p-8 lg:p-10 h-full">
                {/* Glow */}
                {activeRole === 'buyer' && (
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 blur-xl -z-10" />
                )}

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <span className="material-symbols-outlined text-2xl text-white">shopping_cart</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-text-main dark:text-white">For Buyers</h4>
                    <p className="text-text-muted dark:text-gray-400">Buy fresh, save more</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {['Verified quality produce', 'Direct farmer pricing', 'Bulk order discounts', 'Doorstep delivery'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-main dark:text-gray-300">
                      <span className="material-symbols-outlined text-cyan-500 text-lg">check_circle</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => { e.stopPropagation(); onGetStarted('buyer'); }}
                  className={`w-full py-4 rounded-full font-bold text-lg transition-all duration-300 ${
                    activeRole === 'buyer'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40'
                      : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20'
                  }`}
                >
                  Start Buying
                </button>
              </div>
            </InteractiveCard>
          </div>
        </div>
      </div>
    </section>
  );
};
