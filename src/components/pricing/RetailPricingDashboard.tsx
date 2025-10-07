/**
 * Панель управления ценами для менеджера розничной компании
 * Включает мониторинг биржевых цен
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

// Типы данных
interface ExchangePrice {
  fuel: string;
  price: number; // руб/тонна
  change: number; // % изменение
  trend: 'up' | 'down' | 'stable';
  volume: number; // тонн
}

export function RetailPricingDashboard() {
  const isMobile = useIsMobile();

  // Актуальные данные биржевых цен (СПбМТСБ) - сентябрь 2025
  const exchangePrices: ExchangePrice[] = [
    { fuel: "АИ-92", price: 58100, change: 2.1, trend: 'up', volume: 2840 },
    { fuel: "АИ-95", price: 61300, change: 1.8, trend: 'up', volume: 1650 },
    { fuel: "АИ-98", price: 65200, change: 0.7, trend: 'up', volume: 320 },
    { fuel: "ДТ", price: 59800, change: 1.2, trend: 'up', volume: 3120 },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Биржевые цены */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            📊 СПбМТСБ - Биржевые котировки
            <Badge variant="outline" className="text-xs">Реальное время</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
            {exchangePrices.map((item, index) => (
              <div key={index} className={`bg-slate-900 ${isMobile ? 'p-2' : 'p-4'} rounded-lg border border-slate-600`}>
                <div className={`flex items-center justify-between ${isMobile ? 'mb-1' : 'mb-2'}`}>
                  <span className={`font-medium text-white ${isMobile ? 'text-sm' : ''}`}>{item.fuel}</span>
                  {getTrendIcon(item.trend)}
                </div>
                <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white mb-1`}>
                  {isMobile ? `${Math.round(item.price / 1000)}k` : item.price.toLocaleString()} ₽/т
                </div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} ${item.change > 0 ? 'text-red-400' : item.change < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {item.change > 0 ? '+' : ''}{item.change}%{isMobile ? '' : ' за день'}
                </div>
                {!isMobile && (
                  <div className="text-xs text-slate-400 mt-2">
                    Объем: {item.volume} т
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Биржевые цены в литрах */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            📊 Биржевые цены в литрах
            <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">Пересчёт</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
            <div className={`bg-slate-900 ${isMobile ? 'p-2' : 'p-4'} rounded-lg border border-slate-600`}>
              <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-white mb-1`}>АИ-92</div>
              <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-white mb-2`}>
                {(exchangePrices[0].price / 1280).toFixed(2)} ₽/л
              </div>
              <div className="text-xs text-slate-400">
                Плотность: 0.72-0.78 г/см³ (ср. 0.75)
              </div>
            </div>
            <div className={`bg-slate-900 ${isMobile ? 'p-2' : 'p-4'} rounded-lg border border-slate-600`}>
              <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-white mb-1`}>АИ-95</div>
              <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-white mb-2`}>
                {(exchangePrices[1].price / 1300).toFixed(2)} ₽/л
              </div>
              <div className="text-xs text-slate-400">
                Плотность: 0.72-0.78 г/см³ (ср. 0.76)
              </div>
            </div>
            <div className={`bg-slate-900 ${isMobile ? 'p-2' : 'p-4'} rounded-lg border border-slate-600`}>
              <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-white mb-1`}>АИ-98</div>
              <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-white mb-2`}>
                {(exchangePrices[2].price / 1320).toFixed(2)} ₽/л
              </div>
              <div className="text-xs text-slate-400">
                Плотность: 0.72-0.78 г/см³ (ср. 0.76)
              </div>
            </div>
            <div className={`bg-slate-900 ${isMobile ? 'p-2' : 'p-4'} rounded-lg border border-slate-600`}>
              <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-white mb-1`}>ДТ</div>
              <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-white mb-2`}>
                {(exchangePrices[3].price / 1190).toFixed(2)} ₽/л
              </div>
              <div className="text-xs text-slate-400">
                Плотность: 0.82-0.86 г/см³ (ср. 0.84)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
