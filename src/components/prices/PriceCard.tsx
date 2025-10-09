/**
 * Компонент карточки цены топлива
 * Отображает информацию о цене с возможностью inline редактирования
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fuel, Save, X } from "lucide-react";
import { FuelPrice } from "@/types/price";

interface PriceCardProps {
  price: FuelPrice;
  isMobile: boolean;
  editingPriceId: string | null;
  editingValue: string;
  hasChanges: boolean;
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

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg hover:shadow-lg transition-all duration-300 hover:bg-slate-700 p-4`}>
      {/* Компактный layout */}
      <div className="space-y-3">
        {/* Название топлива и статус */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className={`text-slate-100 font-semibold truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
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
        <div className="border-t border-slate-700 pt-3">
          {isEditing ? (
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-400 text-sm">Цена:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  className="w-24 h-8 text-right bg-slate-700 border-slate-600 text-white font-bold text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSaveInlinePrice();
                    } else if (e.key === 'Escape') {
                      onCancelInlineEdit();
                    }
                  }}
                  autoFocus
                />
                <span className="text-slate-400 text-sm">₽/{price.unit}</span>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <button
                onClick={() => onInlineEdit(price.id, price.priceGross)}
                className="text-slate-100 font-semibold hover:text-blue-400 transition-colors cursor-pointer text-2xl"
                title="Нажмите для редактирования цены"
              >
                {formatPrice(price.priceGross, price.source !== 'sts-api')}
              </button>
              <div className="text-slate-400 text-sm mt-1">₽/{price.unit}</div>
            </div>
          )}
        </div>

        {/* Кнопки редактирования */}
        {isEditing && (
          <div className="flex gap-2 pt-2 border-t border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveInlinePrice}
              disabled={!hasChanges}
              className="flex-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 disabled:text-slate-500 disabled:hover:text-slate-500"
            >
              <Save className="w-4 h-4 mr-1" />
              Сохранить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelInlineEdit}
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
