import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogProps,
} from './dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MobileDialogProps extends DialogProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  fullScreen?: boolean;
}

export const MobileDialog: React.FC<MobileDialogProps> = ({
  children,
  title,
  className,
  fullScreen = false,
  onOpenChange,
  ...props
}) => {
  const isMobile = useIsMobile();

  const mobileContentClasses = isMobile
    ? fullScreen 
      ? "h-screen w-screen max-w-none m-0 rounded-none" // Полноэкранный режим
      : "max-h-[90vh] w-[95vw] max-w-none mx-auto mb-4 mt-auto rounded-t-xl rounded-b-none" // Снизу вверх
    : "";

  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      <DialogContent
        className={cn(
          mobileContentClasses,
          isMobile && "p-0", // Убираем padding для мобильной версии
          className
        )}
        style={
          isMobile && !fullScreen
            ? {
                position: 'fixed',
                bottom: 0,
                top: 'auto',
                transform: 'translateX(-50%)',
                left: '50%',
              }
            : undefined
        }
      >
        {/* Мобильная шапка */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-slate-600 bg-slate-800">
            {/* Индикатор перетаскивания */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-slate-500 rounded-full" />
            
            {title && (
              <DialogTitle className="text-lg font-semibold text-white pr-8">
                {title}
              </DialogTitle>
            )}
            
            <button
              onClick={() => onOpenChange?.(false)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}

        {/* Контент */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          isMobile ? "p-4" : "p-6"
        )}>
          {!isMobile && title && (
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
            </DialogHeader>
          )}
          {children}
        </div>

        {/* Безопасная зона для iPhone */}
        {isMobile && (
          <div className="h-safe-area-inset-bottom bg-slate-800" />
        )}
      </DialogContent>
    </Dialog>
  );
};