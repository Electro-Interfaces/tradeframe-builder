import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { TradingPoint, TradingPointExternalCode } from "@/types/tradingpoint";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Форматирует external codes для отображения в таблице
 * Показывает только значимые коды (не дефолтные STS)
 */
function formatExternalCodes(codes: TradingPointExternalCode[]): { display: string; tooltip: string } {
  // Фильтруем только активные и не-дефолтные коды
  const significantCodes = codes.filter(c => 
    c.isActive && 
    !c.id.startsWith('default-') && 
    c.system !== 'sts'
  );
  
  if (significantCodes.length === 0) {
    return { display: '—', tooltip: '' };
  }
  
  // Группируем по системам
  const bySystem: Record<string, string[]> = {};
  significantCodes.forEach(c => {
    if (!bySystem[c.system]) bySystem[c.system] = [];
    bySystem[c.system].push(c.code);
  });
  
  // Формируем отображение
  const parts = Object.entries(bySystem).map(([system, codes]) => {
    const systemLabel = system.toUpperCase();
    return `${systemLabel}: ${codes.join(', ')}`;
  });
  
  return {
    display: parts.join(' | '),
    tooltip: significantCodes.map(c => `${c.system.toUpperCase()}: ${c.code}${c.description ? ` (${c.description})` : ''}`).join('\n')
  };
}

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
      <div className="overflow-x-auto w-full rounded-lg border border-border">
        <table className="w-full text-sm min-w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[6%]">API ID</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[24%]">НАЗВАНИЕ</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[14%]">ВНЕШНИЕ КОДЫ</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[20%]">АДРЕС</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[10%]">ТЕЛЕФОН</th>
              <th className="px-4 py-4 text-right text-foreground font-medium w-[10%]">ОБНОВЛЕНО</th>
              <th className="px-4 py-4 text-right text-foreground font-medium w-[16%]">ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
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
      <div className="overflow-x-auto w-full rounded-lg border border-border">
        <table className="w-full text-sm min-w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[6%]">API ID</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[24%]">НАЗВАНИЕ</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[14%]">ВНЕШНИЕ КОДЫ</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[20%]">АДРЕС</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[10%]">ТЕЛЕФОН</th>
              <th className="px-4 py-4 text-right text-foreground font-medium w-[10%]">ОБНОВЛЕНО</th>
              <th className="px-4 py-4 text-right text-foreground font-medium w-[16%]">ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                Нет торговых точек в этой сети
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto w-full rounded-lg border border-border">
        <table className="w-full text-sm min-w-full table-fixed">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[6%]">API ID</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[24%]">НАЗВАНИЕ</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[14%]">ВНЕШНИЕ КОДЫ</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[20%]">АДРЕС</th>
              <th className="px-4 py-4 text-left text-foreground font-medium w-[10%]">ТЕЛЕФОН</th>
              <th className="px-4 py-4 text-right text-foreground font-medium w-[10%]">ОБНОВЛЕНО</th>
              <th className="px-4 py-4 text-right text-foreground font-medium w-[16%]">ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {tradingPoints.map((point) => {
              const externalCodesInfo = formatExternalCodes(point.externalCodes || []);
              return (
                <tr key={point.id} className="border-b border-border hover:bg-secondary transition-colors">
                  <td className="px-4 py-4">
                    <span className="text-xs bg-primary/10 dark:bg-blue-900/50 text-primary dark:text-blue-300 px-2 py-1 rounded font-mono">
                      {point.external_id || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-foreground font-medium text-base">{point.name}</div>
                      {point.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{point.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {externalCodesInfo.display !== '—' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-wrap gap-1 cursor-help">
                            {(point.externalCodes || [])
                              .filter(c => c.isActive && !c.id.startsWith('default-') && c.system !== 'sts')
                              .map(code => (
                                <span 
                                  key={code.id} 
                                  className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-mono"
                                >
                                  {code.system.toUpperCase()}: {code.code}
                                </span>
                              ))
                            }
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <pre className="text-xs whitespace-pre-wrap">{externalCodesInfo.tooltip}</pre>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {point.geolocation?.address || point.geolocation?.city || '—'}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{point.phone || '—'}</td>
                  <td className="px-4 py-4 text-right text-muted-foreground">
                    {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') :
                     point.createdAt ? new Date(point.createdAt).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(point)}
                        disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => onDelete(point)}
                        disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
