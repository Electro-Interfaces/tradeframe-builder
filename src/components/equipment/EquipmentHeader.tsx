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
import type { Tank } from '@/types/tanks';

interface EquipmentHeaderProps {
  terminalInfo: TerminalInfo | null;
  tanks?: Tank[];
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
  tanks,
  isMobile,
  loading,
  restartingTerminal,
  networkName,
  tradingPointId,
  onRefresh,
  onRestartTerminal
}: EquipmentHeaderProps) {
  // Находим самое свежее dt среди резервуаров
  const latestTankDt = tanks?.reduce<string | null>((latest, tank) => {
    const dt = tank.apiData?.dt;
    if (!dt) return latest;
    if (!latest) return dt;
    return new Date(dt) > new Date(latest) ? dt : latest;
  }, null);
  return (
    <div className={`${isMobile ? 'mb-3' : 'mb-6 pt-4'}`}>
      {/* Баннер предупреждения о состоянии терминала */}
      {terminalInfo?.terminalState && terminalInfo.terminalState.code !== 0 && (
        <div className={`flex items-center gap-2 bg-red-900/50 border border-red-600 rounded-lg mb-3 ${
          isMobile ? 'px-3 py-2' : 'px-4 py-3'
        }`}>
          <AlertTriangle className={`flex-shrink-0 text-red-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`text-red-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {terminalInfo.terminalState.description}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className={`font-semibold text-white ${isMobile ? 'text-lg' : 'text-2xl'}`}>
            Оборудование
          </h1>
          {terminalInfo?.pos?.lastUpdate && (
            <p className={`text-slate-400 ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
              {isMobile ? (
                <>
                  {new Date(terminalInfo.pos.lastUpdate).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {(() => {
                    const now = new Date();
                    const lastUpdate = new Date(terminalInfo.pos.lastUpdate);
                    const diffMs = now.getTime() - lastUpdate.getTime();
                    const diffMinutes = Math.floor(diffMs / 60000);

                    if (diffMinutes < 11) {
                      return <span className="text-green-400 ml-1.5">✓</span>;
                    } else {
                      return <span className="text-red-400 ml-1.5">⚠ {diffMinutes}м</span>;
                    }
                  })()}
                </>
              ) : (
                <>
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
                </>
              )}
            </p>
          )}
          {latestTankDt && (
            <p className={`text-slate-400 ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-0.5'}`}>
              {isMobile ? (
                <>
                  Резервуары: {new Date(latestTankDt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  {(() => {
                    const diffMinutes = Math.floor((Date.now() - new Date(latestTankDt).getTime()) / 60000);
                    return diffMinutes < 11
                      ? <span className="text-green-400 ml-1.5">✓</span>
                      : <span className="text-red-400 ml-1.5">⚠ {diffMinutes}м</span>;
                  })()}
                </>
              ) : (
                <>
                  Факт. данные резервуаров: {new Date(latestTankDt).toLocaleString('ru-RU')}
                  {(() => {
                    const diffMinutes = Math.floor((Date.now() - new Date(latestTankDt).getTime()) / 60000);
                    return diffMinutes < 11
                      ? <span className="text-green-400 ml-2">(✓ актуально)</span>
                      : <span className="text-red-400 ml-2">(⚠️ {diffMinutes} мин назад)</span>;
                  })()}
                </>
              )}
            </p>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={restartingTerminal || !networkName || !tradingPointId}
                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              >
                {restartingTerminal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                {!isMobile && (
                  <span className="ml-2">{restartingTerminal ? 'Перезагрузка...' : 'Перезагрузить'}</span>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={`bg-slate-800 border border-slate-600 ${isMobile ? 'max-w-[95vw]' : ''}`}>
              <AlertDialogHeader>
                <AlertDialogTitle className={`text-white flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                  <AlertTriangle className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-red-400`} />
                  Подтверждение перезагрузки
                </AlertDialogTitle>
                <AlertDialogDescription className={`text-slate-300 ${isMobile ? 'text-sm' : ''}`}>
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
              <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white">
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRestartTerminal}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Да, перезагрузить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
