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
  audienceText?: string;
  linkHref?: string;
  linkText?: string;
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
  audienceText,
  linkHref,
  linkText,
}) => {
  const gradientClass = role === 'farmer'
    ? 'from-primary to-emerald-500'
    : 'from-buyer-primary to-amber-300';

  const ringDefaultColor = role === 'farmer'
    ? 'ring-primary/50'
    : 'ring-buyer-primary/50';

  const resolvedAudienceText = audienceText ?? (role === 'farmer'
    ? 'farmers across India'
    : 'buyers across India');

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-6 bg-transparent py-4 px-4',
        className
      )}
    >
      {/* Avatars */}
      <div className="flex -space-x-4">
        {avatars.map((src, i) => (
          <div
            key={i}
            className={cn(
              'w-10 h-10 rounded-full overflow-hidden ring-1 ring-offset-2 ring-offset-black',
              ringColors[i] || ringDefaultColor
            )}
          >
            <img
              src={src}
              alt={`Avatar ${i + 1}`}
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
        <span className="text-xs md:text-sm font-medium text-current">
          {caption}
          <CountUp
            value={totalUsersText}
            duration={2}
            separator=","
            className={cn('ml-1 text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent', gradientClass)}
            suffix="+"
            colorScheme="gradient"
          />
          <span className="ml-1">{resolvedAudienceText}</span>
          {linkHref && linkText ? (
            <a
              className="ml-2 underline text-primary"
              href={linkHref}
            >
              {linkText}
            </a>
          ) : null}
        </span>
      </div>
    </div>
  );
};
