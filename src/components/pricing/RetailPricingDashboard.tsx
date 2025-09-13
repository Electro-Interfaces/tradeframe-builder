/**
 * Панель управления ценами для менеджера розничной компании
 * Включает мониторинг биржевых цен, конкурентов и AI-рекомендации
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  Target,
  MapPin,
  Bot,
  BarChart3,
  Fuel,
  Clock,
  Eye,
  Settings
} from "lucide-react";

// Типы данных
interface ExchangePrice {
  fuel: string;
  price: number; // руб/тонна
  change: number; // % изменение
  trend: 'up' | 'down' | 'stable';
  volume: number; // тонн
}

interface CompetitorPrice {
  name: string;
  distance: string;
  fuel: string;
  price: number; // руб/литр
  diff: number; // разница с нашей ценой
  lastUpdate: string;
  status: 'higher' | 'lower' | 'equal';
}

interface AIRecommendation {
  fuel: string;
  action: 'increase' | 'decrease' | 'hold';
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  confidence: number; // %
  impact: string; // прогноз влияния
}

interface FuelStock {
  fuel: string;
  current: number; // литры
  capacity: number; // литры
  daysLeft: number;
  status: 'critical' | 'low' | 'normal' | 'high';
}

export function RetailPricingDashboard() {
  const isMobile = useIsMobile();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedFuelType, setSelectedFuelType] = useState('ai95');
  const [mapMode, setMapMode] = useState<'grid' | 'real'>('grid');

  // Актуальные данные биржевых цен (СПбМТСБ) - сентябрь 2025
  const exchangePrices: ExchangePrice[] = [
    { fuel: "АИ-92", price: 58100, change: 2.1, trend: 'up', volume: 2840 },
    { fuel: "АИ-95", price: 61300, change: 1.8, trend: 'up', volume: 1650 },
    { fuel: "АИ-98", price: 65200, change: 0.7, trend: 'up', volume: 320 },
    { fuel: "ДТ", price: 59800, change: 1.2, trend: 'up', volume: 3120 },
  ];

  // Актуальные данные конкурентов - сентябрь 2025
  const competitors: CompetitorPrice[] = [
    { name: "Лукойл (Трасса)", distance: "1.2км", fuel: "АИ-95", price: 64.20, diff: 0.30, lastUpdate: "09:45", status: 'higher' },
    { name: "Роснефть (Центр)", distance: "1.8км", fuel: "АИ-95", price: 63.70, diff: -0.20, lastUpdate: "09:35", status: 'lower' },
    { name: "Газпром (Въезд)", distance: "3.4км", fuel: "АИ-95", price: 63.95, diff: 0.05, lastUpdate: "09:20", status: 'equal' },
    { name: "Татнефть (ТЦ)", distance: "4.8км", fuel: "АИ-95", price: 64.50, diff: 0.60, lastUpdate: "08:55", status: 'higher' },
  ];

  // AI рекомендации - актуализированные
  const aiRecommendations: AIRecommendation[] = [
    {
      fuel: "АИ-95",
      action: 'decrease',
      currentPrice: 63.90,
      suggestedPrice: 63.75,
      reason: "Роснефть снизила цену до 63.70₽, рекомендуем быть конкурентными",
      confidence: 89,
      impact: "+2.8% продаж"
    },
    {
      fuel: "АИ-92",
      action: 'increase',
      currentPrice: 59.50,
      suggestedPrice: 59.80,
      reason: "Биржевые цены выросли на 2.1%, можно поднять цену",
      confidence: 94,
      impact: "-0.8% продаж, +5.2% маржа"
    },
    {
      fuel: "ДТ",
      action: 'increase',
      currentPrice: 65.30,
      suggestedPrice: 65.60,
      reason: "Биржевые котировки выросли, все конкуренты поднимают цены",
      confidence: 88,
      impact: "+3.4% маржа"
    },
  ];

  // Данные для тепловой карты цен по региону Выборга для разных видов топлива
  const fuelPriceData = {
    ai92: {
      north: [56.85, 56.90, 57.15, 57.20, 57.10, 56.95, 57.05, 57.25, 57.30, 57.15, 57.00, 56.88],
      center: [56.70, 56.75, 56.90, 57.20, 56.70, 57.50, 56.95, 57.15, 57.05, 56.85, 56.95, 57.10],
      south: [56.95, 57.05, 57.25, 57.35, 57.20, 57.15, 57.40, 57.55, 57.30, 57.10, 57.20, 57.45],
      competitors: [
        { name: "Лукойл", price: 57.20, coords: "60.360, 29.748" },
        { name: "Роснефть", price: 56.70, coords: "60.355, 29.742" },
        { name: "Газпром", price: 56.95, coords: "60.365, 29.751" },
        { name: "Татнефть", price: 57.50, coords: "60.370, 29.760" },
      ],
      ranges: [56.50, 56.80, 57.10, 57.40, 57.70],
      avg: 57.08, min: 56.70, max: 57.55
    },
    ai95: {
      north: [63.85, 63.90, 64.15, 64.20, 64.10, 63.95, 64.05, 64.25, 64.30, 64.15, 64.00, 63.88],
      center: [63.70, 63.75, 63.90, 64.20, 63.70, 64.50, 63.95, 64.15, 64.05, 63.85, 63.95, 64.10],
      south: [63.95, 64.05, 64.25, 64.35, 64.20, 64.15, 64.40, 64.55, 64.30, 64.10, 64.20, 64.45],
      competitors: [
        { name: "Лукойл", price: 64.20, coords: "60.360, 29.748" },
        { name: "Роснефть", price: 63.70, coords: "60.355, 29.742" },
        { name: "Газпром", price: 63.95, coords: "60.365, 29.751" },
        { name: "Татнефть", price: 64.50, coords: "60.370, 29.760" },
      ],
      ranges: [63.50, 63.80, 64.10, 64.40, 64.70],
      avg: 64.08, min: 63.70, max: 64.55
    },
    ai98: {
      north: [68.85, 68.90, 69.15, 69.20, 69.10, 68.95, 69.05, 69.25, 69.30, 69.15, 69.00, 68.88],
      center: [68.70, 68.75, 68.90, 69.20, 68.70, 69.50, 68.95, 69.15, 69.05, 68.85, 68.95, 69.10],
      south: [68.95, 69.05, 69.25, 69.35, 69.20, 69.15, 69.40, 69.55, 69.30, 69.10, 69.20, 69.45],
      competitors: [
        { name: "Лукойл", price: 69.20, coords: "60.360, 29.748" },
        { name: "Роснефть", price: 68.70, coords: "60.355, 29.742" },
        { name: "Газпром", price: 68.95, coords: "60.365, 29.751" },
        { name: "Татнефть", price: 69.50, coords: "60.370, 29.760" },
      ],
      ranges: [68.50, 68.80, 69.10, 69.40, 69.70],
      avg: 69.08, min: 68.70, max: 69.55
    },
    dt: {
      north: [62.85, 62.90, 63.15, 63.20, 63.10, 62.95, 63.05, 63.25, 63.30, 63.15, 63.00, 62.88],
      center: [62.70, 62.75, 62.90, 63.20, 62.70, 63.50, 62.95, 63.15, 63.05, 62.85, 62.95, 63.10],
      south: [62.95, 63.05, 63.25, 63.35, 63.20, 63.15, 63.40, 63.55, 63.30, 63.10, 63.20, 63.45],
      competitors: [
        { name: "Лукойл", price: 63.20, coords: "60.360, 29.748" },
        { name: "Роснефть", price: 62.70, coords: "60.355, 29.742" },
        { name: "Газпром", price: 62.95, coords: "60.365, 29.751" },
        { name: "Татнефть", price: 63.50, coords: "60.370, 29.760" },
      ],
      ranges: [62.50, 62.80, 63.10, 63.40, 63.70],
      avg: 63.08, min: 62.70, max: 63.55
    }
  };

  const currentFuelData = fuelPriceData[selectedFuelType as keyof typeof fuelPriceData];

  const getPriceColor = (price: number, ranges: number[]) => {
    if (price < ranges[1]) return 'bg-green-600 text-white';
    if (price < ranges[2]) return 'bg-yellow-600 text-white';
    if (price < ranges[3]) return 'bg-orange-600 text-white';
    if (price < ranges[4]) return 'bg-red-600 text-white';
    return 'bg-red-800 text-white';
  };

  const getCompetitorColor = (price: number, ranges: number[]) => {
    if (price < ranges[1]) return 'bg-green-600';
    if (price < ranges[2]) return 'bg-yellow-600';
    if (price < ranges[3]) return 'bg-orange-600';
    if (price < ranges[4]) return 'bg-red-600';
    return 'bg-red-800';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCompetitorBadge = (status: string) => {
    switch (status) {
      case 'higher': return <Badge variant="destructive" className="text-xs">Выше</Badge>;
      case 'lower': return <Badge variant="secondary" className="text-xs bg-green-700">Ниже</Badge>;
      default: return <Badge variant="outline" className="text-xs">Равно</Badge>;
    }
  };


  const getActionColor = (action: string) => {
    switch (action) {
      case 'increase': return 'text-red-400';
      case 'decrease': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'increase': return '↗️';
      case 'decrease': return '↘️';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок с обновлением */}
      <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
        <div>
          <div className={`${isMobile ? 'flex-col space-y-2' : 'flex items-center gap-3'}`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
              Управление ценами
            </h1>
            <span className="text-blue-400 text-xs font-medium">
              (модуль не подключен - демо режим)
            </span>
          </div>
          <p className={`text-slate-400 ${isMobile ? 'text-xs mt-1' : 'text-sm'}`}>
            АЗС №001 "Центральная" • Выборг, Ленинградская область
          </p>
        </div>
        <div className={`${isMobile ? 'flex justify-between items-center' : 'flex items-center gap-3'}`}>
          <div className="text-xs text-slate-400">
            Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
          </div>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={() => setLastUpdate(new Date())}
            className="border-slate-600"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {isMobile ? '' : 'Обновить'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800">
          <TabsTrigger value="overview" className={`data-[state=active]:bg-slate-700 ${isMobile ? 'text-xs p-2' : ''}`}>
            <BarChart3 className={`w-4 h-4 ${isMobile ? 'mr-1' : 'mr-2'}`} />
            {isMobile ? '' : 'Обзор'}
          </TabsTrigger>
          <TabsTrigger value="competitors" className={`data-[state=active]:bg-slate-700 ${isMobile ? 'text-xs p-2' : ''}`}>
            <Target className={`w-4 h-4 ${isMobile ? 'mr-1' : 'mr-2'}`} />
            {isMobile ? '' : 'Конкуренты'}
          </TabsTrigger>
          <TabsTrigger value="ai-recommendations" className={`data-[state=active]:bg-slate-700 ${isMobile ? 'text-xs p-2' : ''}`}>
            <Bot className={`w-4 h-4 ${isMobile ? 'mr-1' : 'mr-2'}`} />
            {isMobile ? 'AI' : 'AI Советы'}
          </TabsTrigger>
          <TabsTrigger value="stocks" className={`data-[state=active]:bg-slate-700 ${isMobile ? 'text-xs p-2' : ''}`}>
            <MapPin className={`w-4 h-4 ${isMobile ? 'mr-1' : 'mr-2'}`} />
            {isMobile ? '🗺️' : 'Тепловая карта'}
          </TabsTrigger>
        </TabsList>

        {/* Обзор */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Конкуренты */}
        <TabsContent value="competitors" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                🎯 Мониторинг конкурентов
                <Badge variant="outline" className="text-xs">Радиус 5км</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`space-y-${isMobile ? '2' : '4'}`}>
                {competitors.map((competitor, index) => (
                  <div key={index} className={`${isMobile ? 'flex flex-col space-y-2 p-3' : 'flex items-center justify-between p-4'} bg-slate-900 rounded-lg border border-slate-600`}>
                    <div className={`${isMobile ? 'flex justify-between items-start' : 'flex items-center gap-4'}`}>
                      <div>
                        <div className={`font-medium text-white ${isMobile ? 'text-sm' : ''}`}>{competitor.name}</div>
                        <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 flex items-center gap-1`}>
                          <MapPin className="w-3 h-3" />
                          {competitor.distance}
                        </div>
                      </div>
                      {isMobile && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{competitor.price} ₽</div>
                          <div className="text-xs text-slate-400">{competitor.fuel}</div>
                        </div>
                      )}
                    </div>
                    {isMobile ? (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`font-medium text-sm ${competitor.diff > 0 ? 'text-red-400' : competitor.diff < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            {competitor.diff > 0 ? '+' : ''}{competitor.diff} ₽
                          </div>
                          {getCompetitorBadge(competitor.status)}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {competitor.lastUpdate}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">{competitor.price} ₽</div>
                          <div className="text-sm text-slate-400">{competitor.fuel}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${competitor.diff > 0 ? 'text-red-400' : competitor.diff < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            {competitor.diff > 0 ? '+' : ''}{competitor.diff} ₽
                          </div>
                          {getCompetitorBadge(competitor.status)}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {competitor.lastUpdate}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Рекомендации */}
        <TabsContent value="ai-recommendations" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                🤖 AI Рекомендации по ценам
                <Badge variant="outline" className="text-xs bg-blue-900 text-blue-300">Beta</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`space-y-${isMobile ? '3' : '4'}`}>
                {aiRecommendations.map((rec, index) => (
                  <div key={index} className={`${isMobile ? 'p-3' : 'p-4'} bg-slate-900 rounded-lg border border-slate-600`}>
                    <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center justify-between'} mb-3`}>
                      <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>{getActionIcon(rec.action)}</span>
                          <span className={`font-medium text-white ${isMobile ? 'text-sm' : ''}`}>{rec.fuel}</span>
                          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium ${getActionColor(rec.action)}`}>
                            {rec.action === 'increase' ? 'ПОДНЯТЬ' : rec.action === 'decrease' ? 'СНИЗИТЬ' : 'ОСТАВИТЬ'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rec.confidence}%
                        </Badge>
                      </div>
                    </div>
                    <div className={`${isMobile ? 'grid grid-cols-1 gap-2' : 'flex items-center gap-4'} mb-3`}>
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <span className="text-slate-400">Текущая:</span>
                        <span className="text-white ml-1">{rec.currentPrice} ₽</span>
                      </div>
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <span className="text-slate-400">Рекомендуемая:</span>
                        <span className="text-white ml-1">{rec.suggestedPrice} ₽</span>
                      </div>
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <span className="text-slate-400">Прогноз:</span>
                        <span className="text-green-400 ml-1">{rec.impact}</span>
                      </div>
                    </div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-300 mb-3 ${isMobile ? 'line-clamp-2' : ''}`}>
                      {rec.reason}
                    </div>
                    <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                      <Button size="sm" variant="default" className={`bg-blue-600 hover:bg-blue-700 ${isMobile ? 'text-xs' : ''}`}>
                        Применить
                      </Button>
                      <Button size="sm" variant="outline" className={`border-slate-600 ${isMobile ? 'text-xs' : ''}`}>
                        Подробнее
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Тепловая карта цен по региону */}
        <TabsContent value="stocks" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                  <div className={`${isMobile ? 'space-y-1' : 'flex items-center gap-2'}`}>
                    <div className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                      🗺️ Тепловая карта цен {isMobile ? '' : '(Выборг и область)'}
                    </div>
                    {isMobile ? (
                      <div className="text-xs text-slate-400">Выборг и область • В разработке</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Координаты: 60.358813, 29.745338</Badge>
                        <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">В разработке</Badge>
                      </div>
                    )}
                  </div>
                  <div className={`${isMobile ? 'flex justify-between items-center gap-2' : 'flex items-center gap-2'}`}>
                    <select
                      className={`bg-slate-700 text-white ${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} rounded border border-slate-600 ${isMobile ? 'flex-1' : ''}`}
                      value={selectedFuelType}
                      onChange={(e) => setSelectedFuelType(e.target.value)}
                    >
                      <option value="ai92">АИ-92</option>
                      <option value="ai95">АИ-95</option>
                      <option value="ai98">АИ-98</option>
                      <option value="dt">ДТ</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`border-slate-600 text-slate-300 hover:text-white ${isMobile ? 'text-xs px-2' : ''}`}
                      onClick={() => setMapMode(mapMode === 'grid' ? 'real' : 'grid')}
                    >
                      {isMobile ? (mapMode === 'grid' ? '🌍' : '🔢') : (mapMode === 'grid' ? '🌍 Реальная карта' : '🔢 Сетка')}
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Легенда цен */}
              <div className="mb-6 flex items-center justify-between text-xs">
                <span className="text-slate-400">Низкие цены</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 bg-green-600 rounded-sm border border-slate-600" title={`${currentFuelData.ranges[0]}-${currentFuelData.ranges[1]}₽`}></div>
                  <div className="w-4 h-4 bg-yellow-600 rounded-sm border border-slate-600" title={`${currentFuelData.ranges[1]}-${currentFuelData.ranges[2]}₽`}></div>
                  <div className="w-4 h-4 bg-orange-600 rounded-sm border border-slate-600" title={`${currentFuelData.ranges[2]}-${currentFuelData.ranges[3]}₽`}></div>
                  <div className="w-4 h-4 bg-red-600 rounded-sm border border-slate-600" title={`${currentFuelData.ranges[3]}-${currentFuelData.ranges[4]}₽`}></div>
                  <div className="w-4 h-4 bg-red-800 rounded-sm border border-slate-600" title={`${currentFuelData.ranges[4]}+₽`}></div>
                </div>
                <span className="text-slate-400">Высокие цены</span>
              </div>

              {/* Основная карта */}
              {mapMode === 'grid' ? (
                /* Сетка региона (имитация географической карты) */
                <div className="bg-slate-900 p-6 rounded-lg border border-slate-600">
                  <div className="grid grid-cols-12 gap-1 mb-4">
                    {/* Строка 1 - Север (граница с Финляндией) */}
                    {currentFuelData.north.map((price, i) => (
                      <div
                        key={`n-${i}`}
                        className={`h-8 rounded-sm border border-slate-600 flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 hover:z-10 ${getPriceColor(price, currentFuelData.ranges)}`}
                        title={`Цена: ${price}₽/л ${selectedFuelType.toUpperCase()}`}
                      >
                        {price.toFixed(1)}
                      </div>
                    ))}

                    {/* Строка 2 - Центр (Выборг) */}
                    {currentFuelData.center.map((price, i) => (
                      <div
                        key={`c-${i}`}
                        className={`h-8 rounded-sm border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 hover:z-10 ${
                          i === 1 ? 'border-blue-400 shadow-lg shadow-blue-400/30' : 'border-slate-600'
                        } ${getPriceColor(price, currentFuelData.ranges)}`}
                        title={`${i === 1 ? 'Наша АЗС: ' : 'Цена: '}${price}₽/л ${selectedFuelType.toUpperCase()}`}
                      >
                        {i === 1 ? '🏢' : price.toFixed(1)}
                      </div>
                    ))}

                    {/* Строка 3 - Юг */}
                    {currentFuelData.south.map((price, i) => (
                      <div
                        key={`s-${i}`}
                        className={`h-8 rounded-sm border border-slate-600 flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 hover:z-10 ${getPriceColor(price, currentFuelData.ranges)}`}
                        title={`Цена: ${price}₽/л ${selectedFuelType.toUpperCase()}`}
                      >
                        {price.toFixed(1)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Реальная карта с полигонами */
                <div className="bg-slate-900 p-6 rounded-lg border border-slate-600">
                  <div className="relative w-full h-96 bg-gradient-to-br from-blue-900 to-green-900 rounded-lg overflow-hidden">
                    {/* Имитация карты Выборга */}
                    <div className="absolute inset-0 opacity-20">
                      <svg viewBox="0 0 400 300" className="w-full h-full">
                        {/* Береговая линия */}
                        <path d="M20,50 Q100,30 200,60 Q300,40 380,80 L380,280 Q200,270 100,290 L20,280 Z" fill="#1e40af" stroke="#3b82f6" strokeWidth="2"/>
                        {/* Дороги */}
                        <path d="M0,150 L400,140" stroke="#374151" strokeWidth="3"/>
                        <path d="M200,0 L220,300" stroke="#374151" strokeWidth="2"/>
                        {/* Граница с Финляндией */}
                        <path d="M0,0 L400,20" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5"/>
                      </svg>
                    </div>

                    {/* Тепловые полигоны */}
                    <div className="absolute inset-0">
                      {/* Северная зона (высокие цены) */}
                      <div className="absolute top-0 left-0 w-full h-20 bg-red-600 opacity-30 rounded-t-lg"></div>

                      {/* Центральная зона (средние цены) */}
                      <div className="absolute top-16 left-16 w-3/4 h-32 bg-yellow-600 opacity-40 rounded-lg"></div>

                      {/* Южная зона (высокие цены) */}
                      <div className="absolute bottom-0 left-0 w-full h-24 bg-orange-600 opacity-35 rounded-b-lg"></div>

                      {/* Зона нашей АЗС (выгодные цены) */}
                      <div className="absolute top-24 left-20 w-24 h-16 bg-green-600 opacity-50 rounded-lg border-2 border-blue-400"></div>
                    </div>

                    {/* Маркеры АЗС */}
                    <div className="absolute top-28 left-24 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                      🏢
                    </div>

                    {currentFuelData.competitors.map((competitor, index) => (
                      <div
                        key={index}
                        className={`absolute w-4 h-4 rounded-full border border-white flex items-center justify-center text-white text-xs ${getCompetitorColor(competitor.price, currentFuelData.ranges)}`}
                        style={{
                          top: `${30 + (index * 60)}px`,
                          left: `${50 + (index * 80)}px`
                        }}
                        title={`${competitor.name}: ${competitor.price}₽`}
                      >
                        ⛽
                      </div>
                    ))}

                    {/* Легенда на карте */}
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 p-3 rounded text-white text-xs">
                      <div className="mb-1 font-bold">Выборг и область</div>
                      <div>🏢 Наша АЗС</div>
                      <div>⛽ Конкуренты</div>
                      <div className="mt-2 text-xs text-gray-300">
                        Цвета: зеленый = низкие цены<br/>
                        красный = высокие цены
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Маркеры конкурентов */}
              <div className="space-y-3 mt-6">
                <div className="text-sm text-slate-300 font-medium mb-3">Основные конкуренты в радиусе 5км:</div>

                <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
                  {currentFuelData.competitors.map((competitor, index) => (
                    <div key={index} className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-3'} bg-slate-800 rounded-lg border border-slate-600`}>
                      <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                        <div className={`w-3 h-3 ${getCompetitorColor(competitor.price, currentFuelData.ranges)} rounded-full`}></div>
                        <div>
                          <div className={`text-white ${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{competitor.name}</div>
                          {!isMobile && <div className="text-slate-400 text-xs">{competitor.coords}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-white font-bold ${isMobile ? 'text-sm' : ''}`}>{competitor.price}₽</div>
                        <div className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>{['1.2км', '1.8км', '3.4км', '4.8км'][index]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Статистика по региону */}
              <div className={`grid grid-cols-3 ${isMobile ? 'gap-2' : 'gap-4'} mt-6 pt-4 border-t border-slate-600`}>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>{currentFuelData.avg}₽</div>
                  <div className="text-xs text-slate-400">Средняя цена</div>
                </div>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-green-400`}>{currentFuelData.min}₽</div>
                  <div className="text-xs text-slate-400">Минимум</div>
                </div>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-red-400`}>{currentFuelData.max}₽</div>
                  <div className="text-xs text-slate-400">Максимум</div>
                </div>
              </div>

              {/* Прогноз трендов */}
              <div className={`mt-6 ${isMobile ? 'p-3' : 'p-4'} bg-slate-700 rounded-lg`}>
                <div className={`flex items-center gap-2 ${isMobile ? 'mb-1' : 'mb-2'}`}>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className={`text-white ${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Региональные тренды</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>• Цены растут в направлении границы (+2.3% за неделю)</div>
                  <div>• Центр города дешевле окраин на 1.5-2₽</div>
                  <div>• Трассовые АЗС имеют премию +3-5₽ к городским</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}