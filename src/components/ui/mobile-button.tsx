import React from 'react';
import { Button, ButtonProps } from './button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileButtonProps extends ButtonProps {
  touchFriendly?: boolean;
}

export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ className, touchFriendly = true, children, ...props }, ref) => {
    const isMobile = useIsMobile();
    
    const mobileClasses = touchFriendly && isMobile 
      ? "min-h-[44px] min-w-[44px] px-6 py-3 text-base" // Apple/Google рекомендуют минимум 44px для тач-таргетов
      : "";

    return (
      <Button
        ref={ref}
        className={cn(mobileClasses, className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

MobileButton.displayName = "MobileButton";