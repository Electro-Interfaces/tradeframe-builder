import React, { useRef, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';

interface MobileTableProps {
  children: React.ReactNode;
  className?: string;
  showScrollHint?: boolean;
}

export const MobileTable: React.FC<MobileTableProps> = ({ 
  children, 
  className,
  showScrollHint = true 
}) => {
  const isMobile = useIsMobile();
  const tableRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const checkScrollability = () => {
    if (tableRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    if (isMobile && tableRef.current) {
      checkScrollability();
      
      // Показать подсказку о прокрутке для мобильных
      if (showScrollHint) {
        setShowHint(true);
        const timer = setTimeout(() => setShowHint(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isMobile, showScrollHint]);

  const scrollLeft = () => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (!isMobile) {
    return (
      <div className={cn("overflow-x-auto", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Подсказка о прокрутке */}
      {showHint && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-blue-600 text-white text-xs px-3 py-2 flex items-center gap-2 animate-in slide-in-from-top-2">
          <Smartphone className="w-4 h-4" />
          <span>Проведите пальцем для прокрутки таблицы влево/вправо</span>
        </div>
      )}

      {/* Контейнер таблицы с улучшенной прокруткой */}
      <div className="relative">
        <div
          ref={tableRef}
          className={cn(
            "overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800",
            "touch-pan-x", // Разрешить горизонтальную прокрутку касанием
            className
          )}
          onScroll={checkScrollability}
          style={{
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch', // Плавная прокрутка на iOS
          }}
        >
          {children}
        </div>

        {/* Кнопки прокрутки для мобильных */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Прокрутить влево"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Прокрутить вправо"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Индикатор прокрутки */}
      <div className="flex justify-center mt-2 gap-1">
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          canScrollLeft ? "bg-slate-600" : "bg-blue-400"
        )} />
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          canScrollRight ? "bg-slate-600" : "bg-blue-400"
        )} />
      </div>
    </div>
  );
};