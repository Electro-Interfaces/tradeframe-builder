import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { TradingPoint, TradingPointExternalCode } from "@/types/tradingpoint";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getSignificantCodes(codes: TradingPointExternalCode[]): TradingPointExternalCode[] {
  return codes.filter((code) => code.isActive && !code.id.startsWith('default-') && code.system !== 'sts');
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
  onDelete,
}: TradingPointsTableProps) {
  if (loading) {
    return <div className="px-4 py-8 text-center text-muted-foreground">Загрузка торговых точек...</div>;
  }

  if (tradingPoints.length === 0) {
    return <div className="px-4 py-8 text-center text-muted-foreground">Нет торговых точек в этой сети</div>;
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[8%]">API ID</TableHead>
            <TableHead className="w-[24%]">Название</TableHead>
            <TableHead className="w-[18%]">Внешние коды</TableHead>
            <TableHead className="w-[20%]">Адрес</TableHead>
            <TableHead className="w-[10%]">Телефон</TableHead>
            <TableHead className="w-[10%] text-right">Обновлено</TableHead>
            <TableHead className="w-[10%] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tradingPoints.map((point) => {
            const significantCodes = getSignificantCodes(point.externalCodes || []);

            return (
              <TableRow key={point.id}>
                <TableCell>
                  <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                    {point.external_id || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-base font-medium text-foreground">{point.name}</div>
                    {point.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{point.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {significantCodes.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-wrap gap-1 cursor-help">
                          {significantCodes.map((code) => (
                            <Badge key={code.id} variant="outline" className="border-border bg-secondary text-foreground text-xs font-mono">
                              {code.system.toUpperCase()}: {code.code}
                            </Badge>
                          ))}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <pre className="whitespace-pre-wrap text-xs">
                          {significantCodes.map((code) => `${code.system.toUpperCase()}: ${code.code}${code.description ? ` (${code.description})` : ''}`).join('\n')}
                        </pre>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {point.geolocation?.address || point.geolocation?.city || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{point.phone || '—'}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') : point.createdAt ? new Date(point.createdAt).toLocaleDateString('ru-RU') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      onClick={() => onEdit(point)}
                      disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-secondary hover:text-red-400"
                      onClick={() => onDelete(point)}
                      disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
