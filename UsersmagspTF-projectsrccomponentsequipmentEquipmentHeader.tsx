/**
 * Заголовок страницы оборудования
 * Выделен в отдельный компонент для переиспользования
 */

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Power, Loader2, AlertTriangle } from 'lucide-react';
import type { TerminalInfo } from '@/types/equipment';

interface EquipmentHeaderProps {
  terminalInfo: TerminalInfo | null;
  isMobile: boolean;
  loading: boolean;
  restartingTerminal: boolean;
  networkName?: string;
  tradingPointId?: string;
  onRefresh: () => void;
  onRestartTerminal: () => Promise<boolean>;
}

export function EquipmentHeader({
  terminalInfo,
  isMobile,
  loading,
  restartingTerminal,
  networkName,
  tradingPointId,
  onRefresh,
  onRestartTerminal
}: EquipmentHeaderProps) {
  return (
    <div className="mb-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
          {terminalInfo?.pos?.lastUpdate && (
            <p className="text-sm text-slate-400 mt-1">
              Последняя передача данных: {new Date(terminalInfo.pos.lastUpdate).toLocaleString('ru-RU')}
              {(() => {
                const now = new Date();
                const lastUpdate = new Date(terminalInfo.pos.lastUpdate);
                const diffMs = now.getTime() - lastUpdate.getTime();
                const diffMinutes = Math.floor(diffMs / 60000);

                if (diffMinutes < 11) {
                  return <span className="text-green-400 ml-2">(✓ актуально)</span>;
                } else {
                  return <span className="text-red-400 ml-2">(⚠️ {diffMinutes} мин назад)</span>;
                }
              })()}
            </p>
          )}
        </div>
        {!isMobile && (
          <div className="flex gap-3">
            {/* Кнопка обновления данных */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <RefreshCw className={} />
            </Button>

            {/* Кнопка перезагрузки терминала */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restartingTerminal || !networkName || !tradingPointId}
                  className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                >
                  {restartingTerminal ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4 mr-2" />
                  )}
                  {restartingTerminal ? 'Перезагрузка...' : 'Перезагрузить'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border border-slate-600">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Подтверждение перезагрузки терминала
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-300">
                    Вы уверены, что хотите перезагрузить терминал?
                    <br />
                    <br />
                    <strong className="text-yellow-400">⚠️ ВНИМАНИЕ:</strong>
                    <br />
                    • Терминал будет недоступен во время перезагрузки
                    <br />
                    • Все активные операции будут прерваны
                    <br />
                    • Процесс может занять до 2-3 минут
                    <br />
                    <br />
                    <span className="text-white">
                      Сеть: <strong>{networkName}</strong>
                      <br />
                      Торговая точка: <strong>{tradingPointId}</strong>
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onRestartTerminal}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Да, перезагрузить терминал
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}
