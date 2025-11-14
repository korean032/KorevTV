'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

interface LiquidGlassContainerProps {
  children: ReactNode;
  className?: string;
  roundedClass?: string; // Tailwind rounded class, e.g. 'rounded-2xl' or 'rounded-[28px]' or 'rounded-full'
  intensity?: 'low' | 'medium' | 'high' | 'strong';
  border?: 'subtle' | 'normal';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animated?: boolean; // 是否启用液态玻璃动效
}

export default function LiquidGlassContainer({
  children,
  className,
  roundedClass = 'rounded-2xl',
  intensity = 'medium',
  border = 'subtle',
  shadow = 'lg',
  animated = true,
}: LiquidGlassContainerProps) {
  const intensityClasses =
    intensity === 'strong'
      ? 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-3xl backdrop-saturate-150'
      : intensity === 'high'
      ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-2xl backdrop-saturate-150'
      : intensity === 'low'
      ? 'bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm backdrop-saturate-150'
      : 'bg-white/35 dark:bg-gray-900/35 backdrop-blur-lg backdrop-saturate-150';

  const borderClasses =
    border === 'subtle'
      ? 'border border-white/20 dark:border-gray-800/30'
      : 'border border-white/30 dark:border-gray-700/40';

  const shadowMap: Record<string, string> = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  };

  const classes = clsx(
    'relative overflow-hidden',
    roundedClass,
    intensityClasses,
    borderClasses,
    shadowMap[shadow],
    className,
  );

  const overlayIntensityClass =
    intensity === 'strong'
      ? 'lgx-overlay--strong'
      : intensity === 'high'
      ? 'lgx-overlay--high'
      : intensity === 'low'
      ? 'lgx-overlay--low'
      : 'lgx-overlay--medium';

  return (
    <div className={classes}>
      {animated && (
        <>
          <span aria-hidden className={clsx('lgx-overlay', overlayIntensityClass)} />
          <span aria-hidden className={clsx('lgx-shimmer', overlayIntensityClass)} />
        </>
      )}
      {children}
    </div>
  );
}