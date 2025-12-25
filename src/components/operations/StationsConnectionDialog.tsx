import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wifi, WifiOff, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { useSelection } from "@/contexts/SelectionContext";
import { tradingPointsService } from "@/services/tradingPointsService";
import { stsApiService } from "@/services/stsApi";
import { TradingPoint } from "@/types/tradingpoint";

interface StationConnectionInfo {
  id: string;
  name: string;
  externalId: string | null;
  lastConnection: Date | null;
  status: 'online' | 'offline' | 'unknown';
  shiftNumber?: number;
  shiftState?: string;
}

interface StationsConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StationsConnectionDialog({ open, onOpenChange }: StationsConnectionDialogProps) {
  const { selectedNetwork } = useSelection();
  const [stations, setStations] = useState<StationConnectionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStationsConnection = async () => {
    if (!selectedNetwork?.id) {
      setError("Выберите сеть");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);

      const activePoints = tradingPoints.filter(
        (tp: TradingPoint) => !tp.isBlocked && tp.external_id
      );

      if (activePoints.length === 0) {
        const allActive = tradingPoints.filter((tp: TradingPoint) => !tp.isBlocked);
        if (allActive.length === 0) {
          setStations([]);
          setError("Нет активных торговых точек");
          setLoading(false);
          return;
        }
        setStations(allActive.map((tp: TradingPoint) => ({
          id: tp.id,
          name: tp.name,
          externalId: tp.external_id || null,
          lastConnection: null,
          status: 'unknown' as const
        })));
        setLoading(false);
        return;
      }

      const stationPromises = activePoints.map(async (tp: TradingPoint) => {
        try {
          const terminalInfo = await stsApiService.getTerminalInfo({
            networkId: selectedNetwork.external_id,
            tradingPointId: tp.external_id
          });

          const lastConnectionStr = (terminalInfo.pos as any)?.lastUpdate ||
                                     terminalInfo.terminal?.lastHeartbeat;

          const lastConnection = lastConnectionStr ? new Date(lastConnectionStr) : null;

          let status: 'online' | 'offline' | 'unknown' = 'unknown';
          if (lastConnection) {
            const now = new Date();
            const diffMinutes = (now.getTime() - lastConnection.getTime()) / (1000 * 60);
            status = diffMinutes < 15 ? 'online' : 'offline';
          }

          return {
            id: tp.id,
            name: tp.name,
            externalId: tp.external_id,
            lastConnection,
            status,
            shiftNumber: terminalInfo.shift?.number,
            shiftState: terminalInfo.shift?.state
          };
        } catch (err) {
          return {
            id: tp.id,
            name: tp.name,
            externalId: tp.external_id,
            lastConnection: null,
            status: 'unknown' as const
          };
        }
      });

      const results = await Promise.all(stationPromises);

      results.sort((a, b) => {
        const numA = parseInt(a.externalId || '0', 10);
        const numB = parseInt(b.externalId || '0', 10);
        return numA - numB;
      });

      setStations(results);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки данных о связи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadStationsConnection();
    }
  }, [open, selectedNetwork?.id]);

  const formatLastConnection = (date: Date | null, short = false) => {
    if (!date) return "Нет данных";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Сейчас";
    if (minutes < 60) return short ? `${minutes} мин` : `${minutes} мин. назад`;
    if (hours < 24) return short ? `${hours} ч` : `${hours} ч. назад`;
    if (days === 1) return "Вчера";
    if (days < 7) return `${days} дн.`;

    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgoColor = (date: Date | null) => {
    if (!date) return 'text-slate-500';
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    if (diffMinutes < 5) return 'text-green-400';
    if (diffMinutes < 15) return 'text-yellow-400';
    if (diffMinutes < 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status: 'online' | 'offline' | 'unknown') => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: 'online' | 'offline' | 'unknown', compact = false) => {
    const baseClass = compact ? "text-xs px-1.5 py-0.5" : "px-2 py-1";
    switch (status) {
      case 'online':
        return (
          <Badge className={`bg-green-600 text-white flex items-center gap-1 ${baseClass}`}>
            <Wifi className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
            {!compact && "Онлайн"}
          </Badge>
        );
      case 'offline':
        return (
          <Badge className={`bg-red-600 text-white flex items-center gap-1 ${baseClass}`}>
            <WifiOff className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
            {!compact && "Офлайн"}
          </Badge>
        );
      default:
        return (
          <Badge className={`bg-slate-600 text-white flex items-center gap-1 ${baseClass}`}>
            <AlertTriangle className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
            {!compact && "?"}
          </Badge>
        );
    }
  };

  const onlineCount = stations.filter(s => s.status === 'online').length;
  const offlineCount = stations.filter(s => s.status === 'offline').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[80vh] bg-slate-800 border-slate-600 text-white overflow-hidden flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
            Связь со станциями
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs sm:text-sm">
            {selectedNetwork?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Статистика и кнопка обновления */}
        <div className="flex items-center justify-between py-2 border-b border-slate-700 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
            <span className="text-green-400 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {onlineCount}
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              {offlineCount}
            </span>
            <span className="text-slate-400">
              Всего: {stations.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStationsConnection}
            disabled={loading}
            className="border-slate-600 text-white hover:bg-slate-700 h-8 px-2 sm:px-3"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-1">Обновить</span>
          </Button>
        </div>

        {/* Легенда цветов времени */}
        <div className="flex items-center gap-3 py-1.5 text-[10px] sm:text-xs text-slate-500 border-b border-slate-700/50">
          <span className="text-slate-400">Последняя связь:</span>
          <span className="text-green-400">&lt;5 мин</span>
          <span className="text-yellow-400">5-15 мин</span>
          <span className="text-orange-400">15-60 мин</span>
          <span className="text-red-400">&gt;1 ч</span>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto -mx-3 px-3 sm:-mx-6 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-400 text-sm">Загрузка...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-slate-400">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-yellow-500" />
              <p className="text-sm text-center">{error}</p>
            </div>
          ) : stations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-slate-400">
              <WifiOff className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
              <p className="text-sm">Нет данных</p>
            </div>
          ) : (
            <>
              {/* Мобильный вид - карточки */}
              <div className="sm:hidden space-y-2 py-2">
                {stations.map((station) => (
                  <div
                    key={station.id}
                    className={`p-3 rounded-lg border ${
                      station.status === 'online'
                        ? 'border-green-600/30 bg-green-900/10'
                        : station.status === 'offline'
                        ? 'border-red-600/30 bg-red-900/10'
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(station.status)}
                          <span className="text-white font-medium text-sm truncate">
                            {station.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          ID: {station.externalId}
                        </div>
                      </div>
                      {station.shiftNumber && (
                        <div className="text-right shrink-0">
                          <div className="text-xs text-slate-400">Смена</div>
                          <div className="text-white text-sm font-medium">#{station.shiftNumber}</div>
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-2 text-xs ${getTimeAgoColor(station.lastConnection)}`}>
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">{formatLastConnection(station.lastConnection)}</span>
                      {station.lastConnection && (
                        <span className="text-slate-500 ml-1">
                          ({station.lastConnection.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Десктопный вид - таблица */}
              <table className="hidden sm:table w-full text-sm">
                <thead className="bg-slate-700 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-slate-300 font-medium">Станция</th>
                    <th className="text-center px-3 py-2 text-slate-300 font-medium">Статус</th>
                    <th className="text-left px-3 py-2 text-slate-300 font-medium">Последняя связь</th>
                    <th className="text-center px-3 py-2 text-slate-300 font-medium">Смена</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station, index) => (
                    <tr
                      key={station.id}
                      className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                        index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{station.name}</span>
                          <span className="text-slate-500 text-xs">ID: {station.externalId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {getStatusBadge(station.status)}
                      </td>
                      <td className="px-3 py-3">
                        <div className={`flex items-center gap-1.5 ${getTimeAgoColor(station.lastConnection)}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium">{formatLastConnection(station.lastConnection)}</span>
                        </div>
                        {station.lastConnection && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {station.lastConnection.toLocaleString('ru-RU')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {station.shiftNumber ? (
                          <div className="flex flex-col items-center">
                            <span className="text-white">#{station.shiftNumber}</span>
                            <span className="text-xs text-slate-400">{station.shiftState}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StationsConnectionDialog;
