import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Проверяем при монтировании
    checkIsMobile();

    // Добавляем слушатель изменения размера окна
    window.addEventListener('resize', checkIsMobile);

    // Очистка при размонтировании
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [breakpoint]);

  return isMobile;
}