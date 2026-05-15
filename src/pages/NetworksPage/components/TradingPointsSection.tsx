import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { TradingPointsTable } from "./TradingPointsTable";
import { TradingPointsCards } from "./TradingPointsCards";
import { MapPin, Plus } from "lucide-react";
import { TradingPoint } from "@/types/tradingpoint";
import { Network } from "@/types/network";
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

interface TradingPointsSectionProps {
  selectedNetwork: Network | undefined;
  tradingPoints: TradingPoint[];
  filteredTradingPoints: TradingPoint[];
  loading: boolean;
  actionLoading: string | null;
  isMobile: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (point: TradingPoint) => void;
  onDelete: (point: TradingPoint) => void;
  onCreateClick: () => void;
}

export function TradingPointsSection({
  selectedNetwork,
  tradingPoints,
  filteredTradingPoints,
  loading,
  actionLoading,
  isMobile,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onCreateClick
}: TradingPointsSectionProps) {
  return (
    <Card className="w-full border-border bg-card">
      <CardContent className="p-0">
      <div className="px-4 py-4 md:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-muted-foreground">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Торговые точки сети: {selectedNetwork?.name || 'Выберите сеть'}
            </h2>
          </div>
          {selectedNetwork && (
            <Button
              onClick={onCreateClick}
              variant="outline"
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить ТТ
            </Button>
          )}
        </div>

        {/* Поиск торговых точек */}
        {selectedNetwork && tradingPoints.length > 0 && (
          <div className={FILTER_PANEL_CLASS}>
            <div className={FILTER_PANEL_HEADER_CLASS}>
              <div className={FILTER_PANEL_TITLE_CLASS}>
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Фильтры</span>
                <span className="text-sm text-muted-foreground">
                  Найдено: {filteredTradingPoints.length.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className={FILTER_PANEL_FIELDS_CLASS}>
              <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
                <Label htmlFor="trading-points-search" className="text-xs text-muted-foreground">Поиск</Label>
                <Input
                  id="trading-points-search"
                  placeholder="Поиск торговых точек..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={FILTER_PANEL_CONTROL_CLASS}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedNetwork ? (
        <div className="px-4 md:px-6 pb-6">
          <EmptyState
            title="Выберите сеть"
            description="Выберите торговую сеть для просмотра её точек"
            className="py-16"
          />
        </div>
      ) : filteredTradingPoints.length === 0 && tradingPoints.length > 0 ? (
        <div className="px-4 md:px-6 pb-6">
          <EmptyState
            title="Ничего не найдено"
            description={`По запросу "${searchTerm}" ничего не найдено`}
            className="py-16"
          />
        </div>
      ) : tradingPoints.length === 0 ? (
        <div className="px-4 md:px-6 pb-6">
          <EmptyState
            title="В этой сети пока нет торговых точек"
            description="Добавьте первую торговую точку"
            cta={
              <Button
                onClick={onCreateClick}
                className="bg-primary hover:bg-primary/80 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить ТТ
              </Button>
            }
            className="py-16"
          />
        </div>
      ) : (
        <div>
          {/* Desktop таблица */}
          <div className="hidden md:block w-full">
            <TradingPointsTable
              tradingPoints={filteredTradingPoints}
              loading={loading}
              actionLoading={actionLoading}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>

          {/* Mobile карточки */}
          <div className="md:hidden">
            <TradingPointsCards
              tradingPoints={filteredTradingPoints}
              loading={loading}
              actionLoading={actionLoading}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}
