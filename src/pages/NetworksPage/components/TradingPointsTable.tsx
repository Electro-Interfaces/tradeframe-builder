import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { TradingPoint } from "@/types/tradingpoint";

interface TradingPointsTableProps {
  tradingPoints: TradingPoint[];
  loading: boolean;
  actionLoading: string | null;
  onEdit: (point: TradingPoint) => void;
  onDelete: (point: TradingPoint) => void;
}

export function TradingPointsTable({
  tradingPoints,
  loading,
  actionLoading,
  onEdit,
  onDelete
}: TradingPointsTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
        <table className="w-full text-sm min-w-full">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[8%]">API ID</th>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[34%]">НАЗВАНИЕ</th>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[20%]">АДРЕС</th>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[13%]">ТЕЛЕФОН</th>
              <th className="px-6 py-4 text-right text-slate-200 font-medium w-[10%]">ОБНОВЛЕНО</th>
              <th className="px-6 py-4 text-right text-slate-200 font-medium w-[15%]">ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800">
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                Загрузка торговых точек...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (tradingPoints.length === 0) {
    return (
      <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
        <table className="w-full text-sm min-w-full">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[8%]">API ID</th>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[34%]">НАЗВАНИЕ</th>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[20%]">АДРЕС</th>
              <th className="px-6 py-4 text-left text-slate-200 font-medium w-[13%]">ТЕЛЕФОН</th>
              <th className="px-6 py-4 text-right text-slate-200 font-medium w-[10%]">ОБНОВЛЕНО</th>
              <th className="px-6 py-4 text-right text-slate-200 font-medium w-[15%]">ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800">
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                Нет торговых точек в этой сети
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
      <table className="w-full text-sm min-w-full table-fixed">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[8%]">API ID</th>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[34%]">НАЗВАНИЕ</th>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[20%]">АДРЕС</th>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[13%]">ТЕЛЕФОН</th>
            <th className="px-6 py-4 text-right text-slate-200 font-medium w-[10%]">ОБНОВЛЕНО</th>
            <th className="px-6 py-4 text-right text-slate-200 font-medium w-[15%]">ДЕЙСТВИЯ</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800">
          {tradingPoints.map((point) => (
            <tr key={point.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
              <td className="px-4 md:px-6 py-4">
                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded font-mono">
                  {point.external_id || 'не задан'}
                </span>
              </td>
              <td className="px-4 md:px-6 py-4">
                <div>
                  <div className="text-white font-medium text-base">{point.name}</div>
                  {point.description && (
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">{point.description}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-slate-400">
                {point.geolocation?.address || point.geolocation?.city || point.address || '—'}
              </td>
              <td className="px-6 py-4 text-slate-400">{point.phone || '—'}</td>
              <td className="px-6 py-4 text-right text-slate-400">
                {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') :
                 point.createdAt ? new Date(point.createdAt).toLocaleDateString('ru-RU') : '—'}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    onClick={() => onEdit(point)}
                    disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                    onClick={() => onDelete(point)}
                    disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
