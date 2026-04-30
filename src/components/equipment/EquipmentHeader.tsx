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
import { RefreshCw, Power, Loader2, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import type { TerminalInfo } from '@/types/equipment';
import type { Tank } from '@/types/tanks';
import { getEquipmentActionButtonClass, getEquipmentIconButtonClass } from './designTokens';

interface EquipmentHeaderProps {
  terminalInfo: TerminalInfo | null;
  tanks?: Tank[];
  isMobile: boolean;
  loading: boolean;
  restartingTerminal: boolean;
  networkName?: string;
  tradingPointId?: string;
  stationName?: string;
  onRefresh: () => void;
  onRestartTerminal: () => Promise<boolean>;
  onInventoryAdjustment?: () => void;
}

export function EquipmentHeader({
  terminalInfo,
  tanks,
  isMobile,
  loading,
  restartingTerminal,
  networkName,
  tradingPointId,
  stationName,
  onRefresh,
  onRestartTerminal,
  onInventoryAdjustment
}: EquipmentHeaderProps) {
  // Самый свежий lastUpdate из всех постов
  const latestPosUpdate = terminalInfo?.pos?.reduce<string | undefined>((latest, p) => {
    if (!p.lastUpdate) return latest;
    if (!latest) return p.lastUpdate;
    return new Date(p.lastUpdate) > new Date(latest) ? p.lastUpdate : latest;
  }, undefined);

  // Предупреждение если статусы постов различаются (multi-pos)
  const posStatuses = terminalInfo?.pos?.map(p => p.status) || [];
  const hasMultiPos = (terminalInfo?.pos?.length || 0) > 1;
  const hasMixedPosStatuses = hasMultiPos && new Set(posStatuses).size > 1;

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
        <div className={`flex items-center gap-2 bg-red-100 dark:bg-red-900/50 border border-red-600 rounded-lg mb-3 ${
          isMobile ? 'px-3 py-2' : 'px-4 py-3'
        }`}>
          <AlertTriangle className={`flex-shrink-0 text-red-600 dark:text-red-600 dark:text-red-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`text-red-700 dark:text-red-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {terminalInfo.terminalState.description}
          </span>
        </div>
      )}

      {/* Предупреждение о разных статусах постов */}
      {hasMixedPosStatuses && (
        <div className={`flex items-center gap-2 bg-secondary/50 border border-amber-400 rounded-lg mb-3 ${
          isMobile ? 'px-3 py-2' : 'px-4 py-3'
        }`}>
          <AlertTriangle className={`flex-shrink-0 text-amber-600 dark:text-amber-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`text-foreground/80 dark:text-amber-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Статусы постов различаются: {terminalInfo!.pos.map(p => `Пост ${p.number} — ${p.status === 'online' ? 'онлайн' : 'офлайн'}`).join(', ')}
          </span>
        </div>
      )}

      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div>
            <h1 className={`font-headline font-bold text-di-on-surface whitespace-nowrap ${isMobile ? 'text-lg' : 'text-xl'}`}>
              Оборудование{!isMobile && stationName ? ` · ${stationName}` : ''}
            </h1>
          {!isMobile && (latestPosUpdate || latestTankDt) && (
            <div className="flex items-center gap-4 text-[11px] text-di-on-surface-variant">
              {latestPosUpdate && (() => {
                const diffMinutes = Math.floor((Date.now() - new Date(latestPosUpdate).getTime()) / 60000);
                const isOk = diffMinutes < 11;
                return (
                  <span>
                    Данные: {new Date(latestPosUpdate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {isOk
                      ? <span className="inline-flex items-center ml-1 align-middle"><CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" /></span>
                      : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 ml-1 align-middle"><AlertTriangle className="w-3 h-3" />{diffMinutes}м</span>}
                  </span>
                );
              })()}
              {latestTankDt && (() => {
                const diffMinutes = Math.floor((Date.now() - new Date(latestTankDt).getTime()) / 60000);
                const isOk = diffMinutes < 11;
                return (
                  <span>
                    Резервуары: {new Date(latestTankDt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {isOk
                      ? <span className="inline-flex items-center ml-1 align-middle"><CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" /></span>
                      : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 ml-1 align-middle"><AlertTriangle className="w-3 h-3" />{diffMinutes}м</span>}
                  </span>
                );
              })()}
            </div>
          )}
          {isMobile && (latestPosUpdate || latestTankDt) && (
              <p className="text-[10px] text-di-on-surface-variant mt-0.5">
                {latestPosUpdate && (<>
                  Данные: {new Date(latestPosUpdate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {(() => { const d = Math.floor((Date.now() - new Date(latestPosUpdate).getTime()) / 60000); return d < 11 ? <span className="inline-flex items-center ml-1 align-middle"><CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" /></span> : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 ml-1 align-middle"><AlertTriangle className="w-3 h-3" />{d}м</span>; })()}
                </>)}
                {latestPosUpdate && latestTankDt && <span className="mx-1.5">·</span>}
                {latestTankDt && (<>
                  Рез: {new Date(latestTankDt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {(() => { const d = Math.floor((Date.now() - new Date(latestTankDt).getTime()) / 60000); return d < 11 ? <span className="inline-flex items-center ml-1 align-middle"><CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" /></span> : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 ml-1 align-middle"><AlertTriangle className="w-3 h-3" />{d}м</span>; })()}
                </>)}
              </p>
            )}
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-2 shrink-0">
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className={getEquipmentIconButtonClass(isMobile)}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}

          {onInventoryAdjustment && (
            <Button
              variant="outline"
              size="sm"
              onClick={onInventoryAdjustment}
              disabled={!networkName || !tradingPointId}
            >
              <ClipboardList className="w-4 h-4" />
              {!isMobile && <span className="ml-2">Инвентаризация</span>}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={restartingTerminal || !networkName || !tradingPointId}
                className={`${getEquipmentActionButtonClass(isMobile)} border-red-600 text-red-600 hover:bg-red-600 hover:text-white ${isMobile ? 'w-11 p-0' : ''}`}
              >
                {restartingTerminal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                {!isMobile && <span>{restartingTerminal ? 'Перезагрузка...' : 'Перезагрузить'}</span>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={`bg-card border border-border ${isMobile ? 'max-w-[95vw]' : ''}`}>
              <AlertDialogHeader>
                <AlertDialogTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                  <AlertTriangle className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-red-600 dark:text-red-600 dark:text-red-400`} />
                  Подтверждение перезагрузки
                </AlertDialogTitle>
                <AlertDialogDescription className={`text-left text-foreground/80 ${isMobile ? 'text-sm' : ''}`}>
                  <p>Вы уверены, что хотите перезагрузить терминал?</p>

                  <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-left">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Внимание</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-amber-600 dark:text-amber-400">-</span>
                        <span>Терминал будет недоступен во время перезагрузки</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-amber-600 dark:text-amber-400">-</span>
                        <span>Все активные операции будут прерваны</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-amber-600 dark:text-amber-400">-</span>
                        <span>Процесс может занять до 2-3 минут</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-foreground">
                    <p>
                      Сеть: <strong>{networkName}</strong>
                    </p>
                    <p>
                      Торговая точка: <strong>{tradingPointId}</strong>
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                <AlertDialogCancel className="bg-secondary border-border text-foreground/80 hover:bg-secondary hover:text-foreground">
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
