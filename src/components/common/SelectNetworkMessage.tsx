/**
 * Компонент сообщения о необходимости выбрать торговую сеть
 */

import { Network } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SelectNetworkMessageProps {
  message?: string;
}

export function SelectNetworkMessage({ message = "Выберите торговую сеть для просмотра данных" }: SelectNetworkMessageProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Network className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-slate-400 text-center">{message}</p>
        <p className="text-slate-500 text-sm mt-2 text-center">
          Используйте селектор сети в верхней части страницы
        </p>
      </CardContent>
    </Card>
  );
}
