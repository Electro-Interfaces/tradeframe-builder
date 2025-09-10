import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
  className?: string;
  adaptive?: boolean;
}

export const MobileText: React.FC<MobileTextProps> = ({
  children,
  variant = 'body',
  className,
  adaptive = true,
}) => {
  const isMobile = useIsMobile();

  const getResponsiveClasses = () => {
    if (!adaptive) return '';

    const mobileClasses = {
      h1: isMobile ? 'text-2xl leading-tight' : 'text-3xl',
      h2: isMobile ? 'text-xl leading-tight' : 'text-2xl',
      h3: isMobile ? 'text-lg leading-tight' : 'text-xl',
      body: isMobile ? 'text-base leading-relaxed' : 'text-sm',
      small: isMobile ? 'text-sm leading-relaxed' : 'text-xs',
      caption: isMobile ? 'text-xs leading-relaxed' : 'text-xs',
    };

    return mobileClasses[variant];
  };

  const Component = variant.startsWith('h') ? variant : 'p';

  return React.createElement(
    Component,
    {
      className: cn(
        getResponsiveClasses(),
        // Улучшенная читаемость на мобильных
        isMobile && adaptive && 'tracking-normal',
        className
      ),
    },
    children
  );
};