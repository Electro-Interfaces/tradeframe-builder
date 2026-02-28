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
    <Card className="bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4">
            <MapPin className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-100">
                Торговая точка не выбрана
              </h3>
            </div>
            <p className="text-blue-700 dark:text-blue-200/80 max-w-md">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
