import React from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ProgressStep {
  number: number;
  label: string;
  icon?: string;
}

export interface NeonProgressBarProps {
  steps: ProgressStep[];
  currentStep: number;
  className?: string;
}

// ============================================================================
// NEON PROGRESS BAR COMPONENT
// ============================================================================

/**
 * A reusable 3-step neon progress bar with glowing effects.
 * Use this component across all multi-step onboarding flows for brand consistency.
 * 
 * @example
 * <NeonProgressBar
 *   steps={[
 *     { number: 1, label: 'Personal Info' },
 *     { number: 2, label: 'ID Upload' },
 *     { number: 3, label: 'Bank Details' },
 *   ]}
 *   currentStep={1}
 * />
 */
export const NeonProgressBar: React.FC<NeonProgressBarProps> = ({
  steps,
  currentStep,
  className = '',
}) => {
  // Calculate progress width based on current step
  const getProgressWidth = () => {
    if (currentStep <= 1) return '15%';
    if (currentStep === 2) return '50%';
    return '85%';
  };

  return (
    <div className={`w-full max-w-4xl mb-6 ${className}`}>
      <div className="relative flex items-center justify-between w-full px-8 md:px-16">
        {/* Background track */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-2.5 bg-stone-200/60 rounded-full -z-20 mx-10 backdrop-blur-sm shadow-inner" />
        
        {/* Neon progress fill with animated shimmer */}
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 bg-gradient-to-r from-primary via-green-400 to-transparent rounded-full -z-10 mx-10 overflow-hidden shadow-[0_0_15px_rgba(19,236,30,0.4)] transition-all duration-700 ease-out"
          style={{ width: getProgressWidth() }}
        >
          {/* Animated shimmer effect */}
          <div 
            className="absolute inset-0 w-full h-full animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
              backgroundSize: '50% 100%',
            }}
          />
        </div>

        {/* Step indicators */}
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isPast = currentStep > step.number;
          const isInactive = currentStep < step.number;

          return (
            <div 
              key={step.number}
              className={`flex flex-col items-center gap-3 relative z-10 transition-all duration-500 ${
                isInactive ? 'opacity-60' : 'opacity-100'
              }`}
            >
              {/* Step circle */}
              <div
                className={`relative flex items-center justify-center rounded-full font-black transition-all duration-500 ${
                  isActive
                    ? 'size-16 md:size-20 bg-gradient-to-br from-primary to-green-600 text-white shadow-[0_0_25px_rgba(19,236,30,0.5)] ring-4 ring-white'
                    : isPast
                      ? 'size-14 md:size-16 bg-gradient-to-br from-primary to-green-600 text-white shadow-lg'
                      : 'size-14 md:size-16 bg-white/70 backdrop-blur-md text-stone-400 border-2 border-white/80 shadow-sm'
                }`}
              >
                {/* Step number or check mark */}
                {isPast ? (
                  <span className="material-symbols-outlined text-2xl md:text-3xl">check</span>
                ) : (
                  <span className="text-xl md:text-2xl font-black drop-shadow-md">{step.number}</span>
                )}

                {/* Inner highlight */}
                {(isActive || isPast) && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                )}

                {/* Active step ping animation */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping opacity-20" />
                )}
              </div>

              {/* Step label */}
              <div className="flex flex-col items-center absolute top-full mt-3 w-32 md:w-40">
                <span
                  className={`text-xs md:text-sm font-extrabold tracking-tight px-2 py-0.5 rounded-md transition-all duration-300 ${
                    isActive
                      ? 'text-stone-800 bg-white/80 shadow-sm backdrop-blur-sm'
                      : isPast
                        ? 'text-stone-700 bg-white/60'
                        : 'text-stone-500 bg-white/50'
                  }`}
                >
                  {step.label}
                </span>
                
                {/* Active indicator bar */}
                {isActive && (
                  <div className="h-1 w-12 bg-primary mt-1 rounded-full shadow-[0_0_10px_rgba(19,236,30,0.5)]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// PRESET STEP CONFIGURATIONS
// ============================================================================

export const KYC_STEPS: ProgressStep[] = [
  { number: 1, label: 'Personal Info' },
  { number: 2, label: 'ID Upload' },
  { number: 3, label: 'Bank Details' },
];

export const PRODUCT_UPLOAD_STEPS: ProgressStep[] = [
  { number: 1, label: 'Product Details' },
  { number: 2, label: 'Pricing' },
  { number: 3, label: 'Review' },
];

export const ONBOARDING_STEPS: ProgressStep[] = [
  { number: 1, label: 'Welcome' },
  { number: 2, label: 'Profile' },
  { number: 3, label: 'Get Started' },
];

export default NeonProgressBar;
