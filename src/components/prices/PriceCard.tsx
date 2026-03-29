/**
 * Карточка цены топлива — Deep Intel стиль
 * Компактная карточка: иконка + название + статус dot + крупная цена
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fuel, Loader2, Save, X } from "lucide-react";
import { FuelPrice } from "@/types/price";

interface PriceCardProps {
  price: FuelPrice;
  isMobile: boolean;
  editingPriceId: string | null;
  editingValue: string;
  hasChanges: boolean;
  isSavingInline: boolean;
  onInlineEdit: (priceId: string, currentPrice: number) => void;
  onSaveInlinePrice: () => void;
  onCancelInlineEdit: () => void;
  onEditingValueChange: (value: string) => void;
  formatPrice: (value: number, isInKopecks: boolean) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
}

export function PriceCard({
  price,
  isMobile,
  editingPriceId,
  editingValue,
  hasChanges,
  isSavingInline,
  onInlineEdit,
  onSaveInlinePrice,
  onCancelInlineEdit,
  onEditingValueChange,
  formatPrice,
  getStatusColor,
  getStatusText,
  getStatusIcon
}: PriceCardProps) {
  const isEditing = editingPriceId === price.id;
  const isActive = price.status === 'active';

  // Status dot color
  const dotColor = isActive ? 'bg-green-500 dark:bg-[#4ade80]' : 'bg-amber-500 dark:bg-[#fbbf24]';
  const statusLabel = getStatusText(price.status);
  const statusLabelColor = isActive ? 'text-green-600 dark:text-[#4ade80]' : 'text-amber-600 dark:text-[#fbbf24]';

  if (isMobile) {
    return (
      <div className="bg-di-surface-mid rounded-xl border border-di-outline-variant/20 transition-all duration-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Fuel className="w-3.5 h-3.5 text-di-primary-light shrink-0" />
              <p className="font-headline font-bold text-foreground text-sm truncate">{price.fuelType || '—'}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className={`text-[9px] font-bold uppercase ${statusLabelColor}`}>{statusLabel}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            {isEditing ? (
              <div className="flex flex-col gap-1">
                <Input type="number" step="0.01" min="0" value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  className="w-20 h-7 text-right bg-di-surface-lowest border-di-outline-variant/20 text-foreground font-bold text-sm px-1.5"
                  disabled={isSavingInline} autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') onSaveInlinePrice(); else if (e.key === 'Escape') onCancelInlineEdit(); }}
                />
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={onSaveInlinePrice} disabled={!hasChanges || isSavingInline}
                    className="h-6 px-1.5 text-green-600 dark:text-green-400 hover:bg-green-500/10">
                    {isSavingInline ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onCancelInlineEdit} disabled={isSavingInline}
                    className="h-6 px-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <button onClick={() => onInlineEdit(price.id, price.priceGross)}
                className="text-foreground font-headline font-extrabold hover:text-blue-500 transition-colors cursor-pointer text-lg leading-none">
                {formatPrice(price.priceGross, price.source !== 'sts-api')}
                <span className="text-muted-foreground font-normal text-[9px] block mt-0.5">₽/{price.unit}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="bg-di-surface-mid rounded-xl border border-di-outline-variant/20 hover:border-di-outline-variant/40 transition-all duration-200 p-5">
      {/* Header: Icon + Name + Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-di-primary/10 flex items-center justify-center">
            <Fuel className="w-4 h-4 text-blue-600 dark:text-di-primary-light" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-foreground text-base">{price.fuelType || '—'}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span className={`text-[10px] font-bold uppercase ${statusLabelColor}`}>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price — large number */}
      <div className="border-t border-di-outline-variant/10 pt-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 justify-between">
              <span className="text-[10px] font-bold text-di-outline uppercase tracking-widest">Новая цена</span>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.01" min="0" value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  className="w-28 h-8 text-right bg-di-surface-lowest border-di-outline-variant/20 text-foreground font-headline font-bold text-lg"
                  disabled={isSavingInline} autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') onSaveInlinePrice(); else if (e.key === 'Escape') onCancelInlineEdit(); }}
                />
                <span className="text-muted-foreground text-sm">₽/{price.unit}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveInlinePrice} disabled={!hasChanges || isSavingInline}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs">
                {isSavingInline ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                {isSavingInline ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button variant="outline" size="sm" onClick={onCancelInlineEdit} disabled={isSavingInline}
                className="border-di-outline-variant/20 text-muted-foreground hover:bg-di-surface-high text-xs">
                <X className="w-3.5 h-3.5 mr-1" /> Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-right">
            <button onClick={() => onInlineEdit(price.id, price.priceGross)}
              className="text-foreground font-headline font-extrabold hover:text-blue-500 transition-colors duration-200 cursor-pointer text-3xl tracking-tight">
              {formatPrice(price.priceGross, price.source !== 'sts-api')} <span className="text-base font-bold text-muted-foreground">₽</span>
            </button>
            <p className="text-[10px] text-di-outline uppercase tracking-widest mt-1">₽/{price.unit}</p>
          </div>
        )}
      </div>
    </div>
  );
}
