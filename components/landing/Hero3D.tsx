import React, { Suspense, lazy, useState, useEffect } from 'react';

interface Hero3DProps {
  fallbackImage: string;
}

/**
 * Hero3D component with optional Spline 3D support.
 * 
 * To enable Spline 3D:
 * 1. Run: npm install @splinetool/react-spline
 * 2. Uncomment the Spline import and usage below
 * 3. Replace the scene URL with your own Spline scene
 * 
 * Current implementation uses Hero3DSimple as default for performance.
 */
export const Hero3D: React.FC<Hero3DProps> = ({ fallbackImage }) => {
  // For now, use the simple version. 
  // When Spline is installed, this can be upgraded.
  return <Hero3DSimple fallbackImage={fallbackImage} />;
};

// Simple version with CSS animations for a floating effect
// Works without any additional dependencies
export const Hero3DSimple: React.FC<{ fallbackImage: string; className?: string }> = ({ fallbackImage, className }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const shouldAnimate = !prefersReducedMotion && !isMobile;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={fallbackImage}
        alt="Fresh produce"
        className={`h-full w-full object-cover transition-transform duration-1000 ${
          shouldAnimate ? 'animate-float' : ''
        }`}
        loading="lazy"
        onError={(e) => {
          // Fallback to placeholder on error
          (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1a5f2a/ffffff?text=Anna+Bazaar';
        }}
      />
      {/* Decorative floating elements - only on desktop with motion enabled */}
      {shouldAnimate && (
        <>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-r from-primary/30 to-emerald-500/30 blur-2xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/30 to-teal-500/30 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}
    </div>
  );
};
