import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, XCircle } from 'lucide-react';
import type { InventoryAdjustment } from '@/types/inventoryAdjustment';
import {
  formatDateRu,
  formatDateTimeRu,
  formatStatus,
  getStatusBadgeClass,
} from '../utils/formatters';

interface Props {
  items: InventoryAdjustment[];
  onView: (item: InventoryAdjustment) => void;
  onDelete: (item: InventoryAdjustment) => void;
  onCancel: (item: InventoryAdjustment) => void;
}

export function InventoryAdjustmentsTable({ items, onView, onDelete, onCancel }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Документы корректировки не найдены
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">№ приказа</th>
            <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Дата приказа</th>
            <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Инвентаризация</th>
            <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Время начала</th>
            <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Автор</th>
            <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Статус</th>
            <th className="px-4 py-3 text-right text-foreground font-medium text-xs uppercase">Действия</th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {items.map((item) => {
            return (
              <tr
                key={item.id}
                className="border-b border-border hover:bg-secondary transition-colors cursor-pointer"
                onClick={() => onView(item)}
              >
                <td className="px-4 py-3 font-medium text-foreground">{item.orderNumber}</td>
                <td className="px-4 py-3 text-foreground/80">{formatDateRu(item.orderDate)}</td>
                <td className="px-4 py-3 text-foreground/80">{formatDateRu(item.inventoryDate)}</td>
                <td className="px-4 py-3 text-foreground/80">{formatDateTimeRu(item.effectiveAt)}</td>
                <td className="px-4 py-3 text-foreground/80 text-xs">
                  {item.createdByName || item.createdByEmail || '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(item.status)}`}>
                    {formatStatus(item.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onView(item)}
                      title="Открыть"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {item.status === 'draft' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-amber-500"
                          onClick={() => onCancel(item)}
                          title="Отменить документ"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-red-400"
                          onClick={() => onDelete(item)}
                          title="Удалить черновик"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
