/**
 * Кнопка "Связь" для проверки подключения станций
 * Адаптивный компонент для использования на всех страницах раздела ТОРГОВЫЕ СЕТИ
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wifi } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import StationsConnectionDialog from '@/components/operations/StationsConnectionDialog';

interface ConnectionButtonProps {
  className?: string;
}

export function ConnectionButton({ className = '' }: ConnectionButtonProps) {
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsConnectionDialogOpen(true)}
        className={`border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white ${
          isMobile ? 'h-8 px-2' : ''
        } ${className}`}
        title="Проверить связь со станциями"
      >
        <Wifi className={isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
        {!isMobile && <span>Связь</span>}
      </Button>

      <StationsConnectionDialog
        open={isConnectionDialogOpen}
        onOpenChange={setIsConnectionDialogOpen}
      />
    </>
  );
}

export default ConnectionButton;
