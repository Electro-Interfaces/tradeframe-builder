/**
 * Компонент сообщения о необходимости выбора торговой точки
 */

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, MapPin } from 'lucide-react';

interface SelectTradingPointMessageProps {
  message?: string;
}

export function SelectTradingPointMessage({
  message = 'Выберите торговую точку в селекторе для отображения информации'
}: SelectTradingPointMessageProps) {
  return (
    <Card className="bg-primary/10 dark:bg-blue-900/20 border-primary/30 dark:border-blue-700">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="rounded-full bg-primary/10 dark:bg-blue-900/30 p-4">
            <MapPin className="h-12 w-12 text-primary dark:text-primary/70" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary dark:text-primary/70" />
              <h3 className="text-lg font-semibold text-primary-foreground">
                Торговая точка не выбрана
              </h3>
            </div>
            <p className="text-primary dark:text-blue-200/80 max-w-md">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
