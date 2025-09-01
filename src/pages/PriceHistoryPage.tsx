import React, { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Download, Filter, Calendar } from "lucide-react";

interface PriceHistoryRecord {
  id: string;
  date: string;
  time: string;
  fuelType: string;
  oldPrice: number;
  newPrice: number;
  changeReason: string;
  changedBy: string;
  tradingPoint?: string;
  status: 'applied' | 'pending' | 'cancelled';
}

// Mock данные истории цен
const mockPriceHistory: PriceHistoryRecord[] = [
  {
    id: "1",
    date: "2024-12-07",
    time: "09:15",
    fuelType: "АИ-95",
    oldPrice: 52.50,
    newPrice: 53.20,
    changeReason: "Изменение оптовых цен",
    changedBy: "Администратор сети",
    status: 'applied'
  },
  {
    id: "2", 
    date: "2024-12-07",
    time: "09:15",
    fuelType: "АИ-92",
    oldPrice: 49.80,
    newPrice: 50.45,
    changeReason: "Изменение оптовых цен",
    changedBy: "Администратор сети",
    status: 'applied'
  },
  {
    id: "3",
    date: "2024-12-06",
    time: "14:30",
    fuelType: "ДТ",
    oldPrice: 51.20,
    newPrice: 51.95,
    changeReason: "Корректировка маржи",
    changedBy: "Менеджер АЗС №001",
    tradingPoint: "АЗС №001 - Московское шоссе",
    status: 'applied'
  },
  {
    id: "4",
    date: "2024-12-05", 
    time: "16:45",
    fuelType: "АИ-95",
    oldPrice: 52.80,
    newPrice: 52.50,
    changeReason: "Снижение для повышения конкурентоспособности",
    changedBy: "Директор сети",
    status: 'applied'
  },
  {
    id: "5",
    date: "2024-12-04",
    time: "11:20",
    fuelType: "АИ-92",
    oldPrice: 50.10,
    newPrice: 49.80,
    changeReason: "Снижение для повышения конкурентоспособности", 
    changedBy: "Директор сети",
    status: 'applied'
  },
  {
    id: "6",
    date: "2024-12-08",
    time: "08:00",
    fuelType: "АИ-95", 
    oldPrice: 53.20,
    newPrice: 53.80,
    changeReason: "Плановое повышение",
    changedBy: "Система",
    status: 'pending'
  }
];

const fuelTypes = ["Все", "АИ-95", "АИ-92", "ДТ"];
const changeReasons = ["Все", "Изменение оптовых цен", "Корректировка маржи", "Снижение для повышения конкурентоспособности", "Плановое повышение"];

export default function PriceHistoryPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Фильтры
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-08");
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedReason, setSelectedReason] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Фильтрация данных
  const filteredHistory = useMemo(() => {
    return mockPriceHistory.filter(record => {
      // Фильтр по дате
      if (dateFrom && record.date < dateFrom) return false;
      if (dateTo && record.date > dateTo) return false;
      
      // Фильтр по типу топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Фильтр по причине
      if (selectedReason !== "Все" && record.changeReason !== selectedReason) return false;
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.fuelType.toLowerCase().includes(query) ||
          record.changeReason.toLowerCase().includes(query) ||
          record.changedBy.toLowerCase().includes(query) ||
          (record.tradingPoint && record.tradingPoint.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [dateFrom, dateTo, selectedFuelType, selectedReason, searchQuery]);

  const getPriceChangeIcon = (oldPrice: number, newPrice: number) => {
    if (newPrice > oldPrice) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (newPrice < oldPrice) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getPriceChangeColor = (oldPrice: number, newPrice: number) => {
    if (newPrice > oldPrice) return "text-red-500";
    if (newPrice < oldPrice) return "text-green-500";
    return "text-gray-500";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-green-600 text-white">Применено</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Ожидает</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-600 text-white">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => price.toFixed(2) + " ₽";

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        {/* Заголовок страницы */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">История цен</h1>
          <p className="text-slate-400 mt-2">
            {isNetworkOnly && "История изменений цен по торговой сети"}
            {isTradingPointSelected && "История изменений цен торговой точки"}
            {!selectedNetwork && "Выберите сеть для просмотра истории цен"}
          </p>
        </div>

        {selectedNetwork && (
          <>
            {/* Фильтры */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Фильтры
                  <Button variant="outline" className="ml-auto flex-shrink-0">
                    <Download className="w-4 h-4 mr-2" />
                    Экспорт
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-4 gap-4'}`}>
                  <div>
                    <Label className="text-slate-300">Дата с</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Дата по</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Тип топлива</Label>
                    <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Причина изменения</Label>
                    <Select value={selectedReason} onValueChange={setSelectedReason}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {changeReasons.map(reason => (
                          <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <Input
                    placeholder="Поиск по топливу, причине, пользователю..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Таблица истории */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  История изменений цен
                  <Badge variant="secondary" className="ml-auto">
                    {filteredHistory.length} записей
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isMobile ? (
                  // Mobile card layout
                  <div className="space-y-4 p-4">
                    {filteredHistory.map((record) => (
                      <Card key={record.id} className="bg-slate-700 border-slate-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                {record.fuelType}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {new Date(record.date).toLocaleDateString('ru-RU')} {record.time}
                              </span>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-sm text-slate-400">Старая цена:</span>
                              <div className="text-white font-mono">{formatPrice(record.oldPrice)}</div>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400">Новая цена:</span>
                              <div className="text-white font-mono">{formatPrice(record.newPrice)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center py-2">
                            <div className={`flex items-center gap-2 ${getPriceChangeColor(record.oldPrice, record.newPrice)}`}>
                              {getPriceChangeIcon(record.oldPrice, record.newPrice)}
                              <span className="font-mono text-lg font-medium">
                                {record.newPrice > record.oldPrice ? '+' : ''}
                                {formatPrice(record.newPrice - record.oldPrice)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 border-t border-slate-600 pt-2">
                            <div>
                              <span className="text-sm text-slate-400">Причина изменения:</span>
                              <div className="text-slate-300">{record.changeReason}</div>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400">Кто изменил:</span>
                              <div className="text-slate-300 font-medium">{record.changedBy}</div>
                            </div>
                          </div>
                          
                          {isNetworkOnly && record.tradingPoint && (
                            <div className="text-sm border-t border-slate-600 pt-2">
                              <span className="text-slate-400">Торговая точка:</span>
                              <div className="text-slate-300 font-medium">{record.tradingPoint}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {filteredHistory.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет записей за выбранный период
                      </div>
                    )}
                  </div>
                ) : (
                  // Desktop table layout
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Дата/Время</TableHead>
                          <TableHead className="text-slate-300">Топливо</TableHead>
                          <TableHead className="text-slate-300">Старая цена</TableHead>
                          <TableHead className="text-slate-300">Новая цена</TableHead>
                          <TableHead className="text-slate-300">Изменение</TableHead>
                          <TableHead className="text-slate-300">Причина</TableHead>
                          <TableHead className="text-slate-300">Кто изменил</TableHead>
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            <TableCell className="text-white">
                              <div>{new Date(record.date).toLocaleDateString('ru-RU')}</div>
                              <div className="text-sm text-slate-400">{record.time}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                {record.fuelType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {formatPrice(record.oldPrice)}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {formatPrice(record.newPrice)}
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-2 ${getPriceChangeColor(record.oldPrice, record.newPrice)}`}>
                                {getPriceChangeIcon(record.oldPrice, record.newPrice)}
                                <span className="font-mono">
                                  {record.newPrice > record.oldPrice ? '+' : ''}
                                  {formatPrice(record.newPrice - record.oldPrice)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300 max-w-xs">
                              <div className="truncate" title={record.changeReason}>
                                {record.changeReason}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.changedBy}
                            </TableCell>
                            {isNetworkOnly && (
                              <TableCell className="text-slate-300">
                                {record.tradingPoint || "Вся сеть"}
                              </TableCell>
                            )}
                            <TableCell>
                              {getStatusBadge(record.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {filteredHistory.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет записей за выбранный период
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Сообщение о выборе сети */}
        {!selectedNetwork && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра истории цен</h3>
              <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}