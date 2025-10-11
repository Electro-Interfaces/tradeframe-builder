import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TradingPointsTable } from "./TradingPointsTable";
import { TradingPointsCards } from "./TradingPointsCards";
import { MapPin, Plus } from "lucide-react";
import { TradingPoint } from "@/types/tradingpoint";
import { Network } from "@/types/network";

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
    <div className="bg-slate-800 w-full rounded-lg">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Торговые точки сети: {selectedNetwork?.name || 'Выберите сеть'}
            </h2>
          </div>
          {selectedNetwork && (
            <Button
              onClick={onCreateClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить ТТ
            </Button>
          )}
        </div>

        {/* Поиск торговых точек */}
        {selectedNetwork && tradingPoints.length > 0 && (
          <div className="mb-4">
            <Input
              placeholder="Поиск торговых точек..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
}
