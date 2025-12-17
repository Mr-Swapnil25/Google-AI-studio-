import React from 'react';
import { cn } from '../../lib/utils';
import { CountUp } from './CountUp';

// Star icon component (avoiding lucide-react dependency)
const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

interface TrustedUsersProps {
  avatars: string[];
  rating?: number;
  totalUsersText?: number;
  caption?: string;
  className?: string;
  starColorClass?: string;
  ringColors?: string[];
  role?: 'farmer' | 'buyer';
}

export const TrustedUsers: React.FC<TrustedUsersProps> = ({
  avatars,
  rating = 5,
  totalUsersText = 1000,
  caption = 'Trusted by',
  className = '',
  starColorClass = 'text-yellow-400',
  ringColors = [],
  role = 'farmer',
}) => {
  const gradientClass = role === 'farmer' 
    ? 'from-primary to-emerald-500' 
    : 'from-cyan-500 to-teal-500';
  
  const ringDefaultColor = role === 'farmer' 
    ? 'ring-primary/50' 
    : 'ring-cyan-500/50';

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl py-3 px-5 border border-white/30 dark:border-gray-700/50',
        className
      )}
    >
      {/* Avatars */}
      <div className="flex -space-x-3">
        {avatars.map((src, i) => (
          <div
            key={i}
            className={cn(
              'w-10 h-10 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-transform hover:scale-110 hover:z-10',
              ringColors[i] || ringDefaultColor
            )}
          >
            <img
              src={src}
              alt={`User ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // Fallback to placeholder on error
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=User+${i + 1}&background=random`;
              }}
            />
          </div>
        ))}
      </div>

      {/* Rating & Count */}
      <div className="flex flex-col items-start gap-1">
        <div className={cn('flex gap-0.5', starColorClass)}>
          {Array.from({ length: rating }).map((_, i) => (
            <StarIcon key={i} className="w-4 h-4" />
          ))}
        </div>
        <span className="text-text-main dark:text-white text-sm font-medium">
          {caption}{' '}
          <CountUp
            value={totalUsersText}
            duration={2}
            separator=","
            className={cn('text-base font-bold bg-gradient-to-r bg-clip-text text-transparent', gradientClass)}
            suffix="+"
          />
          <span className={cn(
            'ml-1 font-semibold',
            role === 'farmer' ? 'text-primary' : 'text-cyan-600 dark:text-cyan-400'
          )}>
            {role === 'farmer' ? 'Farmers' : 'Buyers'}
          </span>
        </span>
      </div>
    </div>
  );
};
