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

export function InventoryAdjustmentsCards({ items, onView, onDelete, onCancel }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Документы корректировки не найдены
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        return (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-3"
            onClick={() => onView(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onView(item);
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">
                  Приказ № {item.orderNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  от {formatDateRu(item.orderDate)} · инв. {formatDateRu(item.inventoryDate)}
                </div>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${getStatusBadgeClass(item.status)}`}>
                {formatStatus(item.status)}
              </Badge>
            </div>

            <div className="text-xs">
              <div className="text-muted-foreground">Время начала</div>
              <div className="text-foreground/80">{formatDateTimeRu(item.effectiveAt)}</div>
            </div>

            <div className="mt-2 text-xs text-muted-foreground truncate">
              Автор: {item.createdByName || item.createdByEmail || '—'}
            </div>

            {item.status === 'draft' && (
              <div className="mt-3 flex gap-2 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onView(item)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Открыть
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 hover:text-amber-500" onClick={() => onCancel(item)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Отменить
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 hover:text-red-400" onClick={() => onDelete(item)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Удалить
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
