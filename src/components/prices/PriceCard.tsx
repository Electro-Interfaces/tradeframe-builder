/**
 * Карточка цены топлива — стиль Equipment (Deep Intel)
 * Единый паттерн: bg-di-surface-mid, border-transparent, dot + text статус
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, X } from "lucide-react";
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

function getStatusStyle(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Активна', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', pulse: true };
    case 'scheduled':
      return { label: 'Ожидает', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', pulse: false };
    default:
      return { label: 'Истекла', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', pulse: false };
  }
}

/** Убирает " ₽" из formatPrice */
function priceNumber(formatted: string) {
  return formatted.replace(/\s*₽\s*$/, '');
}

export function PriceCard({
  price, isMobile, editingPriceId, editingValue, hasChanges, isSavingInline,
  onInlineEdit, onSaveInlinePrice, onCancelInlineEdit, onEditingValueChange,
  formatPrice,
}: PriceCardProps) {
  const isEditing = editingPriceId === price.id;
  const st = getStatusStyle(price.status);
  const displayPrice = priceNumber(formatPrice(price.priceGross, price.source !== 'sts-api'));

  /* ─── Mobile ─── */
  if (isMobile) {
    return (
      <div className="bg-di-surface-mid rounded-xl border border-transparent p-4 transition-all">
        {/* Fuel name + status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-foreground font-headline font-bold text-sm">{price.fuelType || '—'}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${st.dot} ${st.pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-bold uppercase ${st.text}`}>{st.label}</span>
          </div>
        </div>

        {/* Price or Edit */}
        {isEditing ? (
          <div className="space-y-2">
            <Input type="number" step="0.01" min="0" value={editingValue}
              onChange={(e) => onEditingValueChange(e.target.value)}
              className="w-full h-9 text-right bg-di-surface-lowest border-di-outline-variant/20 text-foreground font-headline font-bold text-xl px-3"
              disabled={isSavingInline} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveInlinePrice(); else if (e.key === 'Escape') onCancelInlineEdit(); }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={onSaveInlinePrice} disabled={!hasChanges || isSavingInline}
                className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                {isSavingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                {isSavingInline ? '...' : 'OK'}
              </Button>
              <Button variant="outline" size="sm" onClick={onCancelInlineEdit} disabled={isSavingInline}
                className="h-8 px-3 border-di-outline-variant/20 text-di-on-surface-variant hover:bg-di-surface-high">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={() => onInlineEdit(price.id, price.priceGross)} className="block w-full text-left">
            <span className="text-3xl font-headline font-extrabold text-foreground tracking-tight">
              {displayPrice}
            </span>
            <span className="text-sm text-di-on-surface-variant ml-1">₽/{price.unit}</span>
          </button>
        )}
      </div>
    );
  }

  /* ─── Desktop ─── */
  return (
    <div className="bg-di-surface-mid rounded-xl border border-transparent hover:border-di-primary/20 p-4 transition-all">
      {/* Fuel name + status */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-foreground font-headline font-bold text-base">{price.fuelType || '—'}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${st.dot} ${st.pulse ? 'animate-pulse' : ''}`} />
          <span className={`text-[10px] font-bold uppercase ${st.text}`}>{st.label}</span>
        </div>
      </div>

      {/* Price or Edit */}
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 justify-between">
            <span className="text-[10px] font-bold text-di-on-surface-variant uppercase">Новая цена</span>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.01" min="0" value={editingValue}
                onChange={(e) => onEditingValueChange(e.target.value)}
                className="w-28 h-9 text-right bg-di-surface-lowest border-di-outline-variant/20 text-foreground font-headline font-bold text-xl"
                disabled={isSavingInline} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') onSaveInlinePrice(); else if (e.key === 'Escape') onCancelInlineEdit(); }}
              />
              <span className="text-di-on-surface-variant text-sm">₽/{price.unit}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveInlinePrice} disabled={!hasChanges || isSavingInline}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
              {isSavingInline ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              {isSavingInline ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button variant="outline" size="sm" onClick={onCancelInlineEdit} disabled={isSavingInline}
              className="border-di-outline-variant/20 text-di-on-surface-variant hover:bg-di-surface-high text-xs">
              <X className="w-3.5 h-3.5 mr-1" /> Отмена
            </Button>
          </div>
        </div>
      ) : (
        <button onClick={() => onInlineEdit(price.id, price.priceGross)} className="block group/price text-left">
          <span className="text-4xl font-headline font-extrabold text-foreground group-hover/price:text-blue-500 transition-colors tracking-tight">
            {displayPrice}
          </span>
          <span className="text-lg text-di-on-surface-variant ml-1.5">₽/{price.unit}</span>
        </button>
      )}
    </div>
  );
}
