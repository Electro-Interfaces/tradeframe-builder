/**
 * Компонент карточки цены топлива
 * Отображает информацию о цене с возможностью inline редактирования
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
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

  if (isMobile) {
    // Компактная мобильная карточка
    return (
      <div className="bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors p-2.5">
        <div className="flex items-center justify-between gap-1.5">
          {/* Левая часть: название + статус */}
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-semibold text-sm truncate leading-tight">
              {price.fuelType || 'Неизвестно'}
            </p>
            <span className={`text-[10px] ${getStatusColor(price.status)} opacity-80`}>
              {getStatusText(price.status)}
            </span>
          </div>
          {/* Правая часть: цена */}
          <div className="text-right flex-shrink-0">
            {isEditing ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingValue}
                    onChange={(e) => onEditingValueChange(e.target.value)}
                    className="w-20 h-8 text-right bg-secondary border-border text-foreground font-bold text-sm px-1.5"
                    disabled={isSavingInline}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveInlinePrice();
                      else if (e.key === 'Escape') onCancelInlineEdit();
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSaveInlinePrice}
                    disabled={!hasChanges || isSavingInline}
                    className="h-7 px-2 text-green-600 dark:text-green-400 hover:bg-emerald-500/10"
                  >
                    {isSavingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelInlineEdit}
                    disabled={isSavingInline}
                    className="h-7 px-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onInlineEdit(price.id, price.priceGross)}
                className="text-foreground font-bold hover:text-blue-400 transition-colors cursor-pointer text-lg leading-tight"
                title="Нажмите для редактирования"
              >
                {formatPrice(price.priceGross, price.source !== 'sts-api')}
                <span className="text-muted-foreground font-normal text-[10px] block">₽/{price.unit}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Десктопная карточка
  return (
    <div className="bg-card border border-border rounded-lg hover:shadow-lg transition-all duration-300 hover:bg-secondary p-4">
      <div className="space-y-3">
        {/* Название топлива и статус */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-foreground font-semibold truncate text-base">
                {price.fuelType || 'Неизвестно'}
              </p>
            </div>
            <Badge variant="secondary" className={`text-xs ${getStatusColor(price.status)}`}>
              <div className="flex items-center gap-1">
                {getStatusIcon(price.status)}
                {getStatusText(price.status)}
              </div>
            </Badge>
          </div>
        </div>

        {/* Цена */}
        <div className="border-t border-border pt-3">
          {isEditing ? (
            <div className="flex items-center gap-2 justify-between">
              <span className="text-muted-foreground text-sm">Цена:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  className="w-28 h-9 text-right bg-secondary border-border text-foreground font-bold text-sm"
                  disabled={isSavingInline}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSaveInlinePrice();
                    } else if (e.key === 'Escape') {
                      onCancelInlineEdit();
                    }
                  }}
                  autoFocus
                />
                <span className="text-muted-foreground text-sm">₽/{price.unit}</span>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <button
                onClick={() => onInlineEdit(price.id, price.priceGross)}
                className="text-foreground font-semibold hover:text-blue-400 transition-colors cursor-pointer text-2xl"
                title="Нажмите для редактирования цены"
              >
                {formatPrice(price.priceGross, price.source !== 'sts-api')}
              </button>
              <div className="text-muted-foreground text-sm mt-1">₽/{price.unit}</div>
            </div>
          )}
        </div>

        {/* Кнопки редактирования */}
        {isEditing && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveInlinePrice}
              disabled={!hasChanges || isSavingInline}
              className="flex-1 text-green-600 dark:text-green-400 hover:text-green-300 hover:bg-emerald-500/10 disabled:text-muted-foreground disabled:hover:text-muted-foreground"
            >
              {isSavingInline ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {isSavingInline ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelInlineEdit}
              disabled={isSavingInline}
              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
