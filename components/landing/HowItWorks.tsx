import React from 'react';
import { Role } from './RoleToggle';
import { InteractiveCard } from '../ui/InteractiveCard';

interface Step {
  icon: string;
  title: string;
  description: string;
}

const FARMER_STEPS: Step[] = [
  {
    icon: 'photo_camera',
    title: 'List Your Produce',
    description: 'Take a photo, set your price, and list your harvest in seconds.',
  },
  {
    icon: 'handshake',
    title: 'Get Verified Buyers',
    description: 'Connect with verified buyers who pay fair, MSP-aware prices.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Get Paid Instantly',
    description: 'Receive payment directly to your bank within 24 hours.',
  },
];

const BUYER_STEPS: Step[] = [
  {
    icon: 'search',
    title: 'Browse Fresh Produce',
    description: 'Explore quality-verified products directly from farmers.',
  },
  {
    icon: 'chat',
    title: 'Negotiate & Order',
    description: 'Chat with farmers, negotiate bulk prices, and place orders.',
  },
  {
    icon: 'local_shipping',
    title: 'Doorstep Delivery',
    description: 'Get fresh produce delivered with our logistics partners.',
  },
];

interface HowItWorksProps {
  role: Role;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ role }) => {
  const steps = role === 'farmer' ? FARMER_STEPS : BUYER_STEPS;
  const accentGradient = role === 'farmer' 
    ? 'from-primary to-emerald-500' 
    : 'from-cyan-500 to-teal-500';

  return (
    <section id="how-it-works" className="w-full py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${accentGradient} text-white mb-4`}>
            How it works
          </span>
          <h3 className="text-3xl lg:text-4xl font-black text-text-main dark:text-white">
            {role === 'farmer' ? 'Start Selling in 3 Simple Steps' : 'Start Buying in 3 Simple Steps'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <InteractiveCard
              key={index}
              InteractiveColor={role === 'farmer' ? '#22c55e' : '#06b6d4'}
              tailwindBgClass="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl"
              borderRadius="24px"
              className="border border-white/30 dark:border-gray-700/50"
            >
              <div className="relative p-8 h-full">
                {/* Step number */}
                <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-r ${accentGradient} flex items-center justify-center text-white font-black text-lg shadow-lg z-20`}>
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${accentGradient} flex items-center justify-center mb-6 shadow-lg ${
                  role === 'farmer' ? 'shadow-primary/20' : 'shadow-cyan-500/20'
                }`}>
                  <span className="material-symbols-outlined text-3xl text-white">{step.icon}</span>
                </div>

                {/* Content */}
                <h4 className="text-xl font-bold text-text-main dark:text-white mb-3">{step.title}</h4>
                <p className="text-text-muted dark:text-gray-400 leading-relaxed">{step.description}</p>

                {/* Connector line (not on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-600" />
                )}
              </div>
            </InteractiveCard>
          ))}
        </div>
      </div>
    </section>
  );
};
