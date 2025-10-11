import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { TradingPoint } from "@/types/tradingpoint";

interface TradingPointsCardsProps {
  tradingPoints: TradingPoint[];
  loading: boolean;
  actionLoading: string | null;
  onEdit: (point: TradingPoint) => void;
  onDelete: (point: TradingPoint) => void;
}

export function TradingPointsCards({
  tradingPoints,
  loading,
  actionLoading,
  onEdit,
  onDelete
}: TradingPointsCardsProps) {
  if (loading) {
    return (
      <div className="text-center text-slate-400 py-8">
        Загрузка торговых точек...
      </div>
    );
  }

  if (tradingPoints.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        Нет торговых точек в этой сети
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-6">
      {tradingPoints.map((point) => (
        <div
          key={point.id}
          className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-base mb-1">{point.name}</div>
              <div className="text-sm text-slate-400 mb-1">
                {point.geolocation?.address || point.geolocation?.city || point.address}
              </div>
              {point.phone && (
                <div className="text-sm text-slate-400 mb-2">{point.phone}</div>
              )}
              <div className="flex items-center gap-3 text-xs mb-2">
                <Badge className={point.isBlocked ? "bg-red-600 text-white" : point.isActive ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}>
                  {point.isBlocked ? "Заблокирован" : point.isActive ? "Активный" : "Неактивный"}
                </Badge>
                <span className="text-slate-400">
                  {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') :
                   point.createdAt ? new Date(point.createdAt).toLocaleDateString('ru-RU') : '—'}
                </span>
              </div>
              {point.external_id && (
                <div className="text-xs text-slate-500">
                  API ID: <span className="bg-blue-900/50 text-blue-300 px-1 py-0.5 rounded font-mono">{point.external_id}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                onClick={() => onEdit(point)}
                disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                onClick={() => onDelete(point)}
                disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
