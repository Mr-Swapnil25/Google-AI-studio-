import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface CountUpProps {
  value: number;
  duration?: number;
  separator?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  colorScheme?: 'default' | 'gradient' | 'primary';
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 2,
  separator = ',',
  className = '',
  prefix = '',
  suffix = '',
  colorScheme = 'default',
}) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * value);
      
      setCount(currentCount);

      if (now < endTime) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(updateCount);
  }, [hasStarted, value, duration]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  };

  const colorClasses = {
    default: 'text-text-main dark:text-white',
    gradient: 'bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent',
    primary: 'text-primary',
  };

  return (
    <span
      ref={ref}
      className={cn(
        'font-bold tabular-nums',
        colorClasses[colorScheme],
        className
      )}
    >
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
};
