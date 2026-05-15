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

function getSignificantCodes(codes: TradingPointExternalCode[]): TradingPointExternalCode[] {
  return codes.filter((code) => code.isActive && !code.id.startsWith('default-') && code.system !== 'sts');
}

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
  onDelete,
}: TradingPointsCardsProps) {
  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Загрузка торговых точек...</div>;
  }

  if (tradingPoints.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Нет торговых точек в этой сети</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Торговая точка</TableHead>
          <TableHead className="w-[88px] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tradingPoints.map((point) => {
          const significantCodes = getSignificantCodes(point.externalCodes || []);

          return (
            <TableRow key={point.id} className="align-top">
              <TableCell className="align-top">
                <div className="space-y-2">
                  <div className="text-base font-medium text-foreground">{point.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {point.geolocation?.address || point.geolocation?.city || '—'}
                  </div>
                  {point.phone && <div className="text-sm text-muted-foreground">{point.phone}</div>}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge
                      variant="outline"
                      className={point.isBlocked
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                        : 'border-border bg-secondary text-foreground'}
                    >
                      {point.isBlocked ? 'Заблокирован' : 'Активный'}
                    </Badge>
                    <span className="text-muted-foreground">
                      {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') : point.createdAt ? new Date(point.createdAt).toLocaleDateString('ru-RU') : '—'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {point.external_id && (
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-foreground">
                        API: {point.external_id}
                      </span>
                    )}
                    {significantCodes.map((code) => (
                      <Badge key={code.id} variant="outline" className="border-border bg-secondary text-foreground font-mono text-xs">
                        {code.system.toUpperCase()}: {code.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TableCell>
              <TableCell className="align-top text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(point)}
                    disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                    onClick={() => onDelete(point)}
                    disabled={actionLoading === `edit-${point.id}` || actionLoading === `delete-${point.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
