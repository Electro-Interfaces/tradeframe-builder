import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface PriceChange {
  id: string;
  date: string;
  station?: string;
  fuelType: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  changePercent: number;
  user: string;
  reason?: string;
}

const mockPriceChanges: PriceChange[] = [
  {
    id: "PC-001",
    date: "2024-08-30T09:00:00Z",
    station: "АЗС-001",
    fuelType: "АИ-95",
    oldPrice: 59.50,
    newPrice: 60.20,
    change: 0.70,
    changePercent: 1.18,
    user: "Анна Петрова",
    reason: "Изменение оптовых цен"
  },
  {
    id: "PC-002",
    date: "2024-08-30T09:00:00Z",
    station: "АЗС-002",
    fuelType: "АИ-95",
    oldPrice: 59.50,
    newPrice: 60.20,
    change: 0.70,
    changePercent: 1.18,
    user: "Система",
    reason: "Автоматическое обновление"
  },
  {
    id: "PC-003",
    date: "2024-08-30T09:00:00Z",
    station: "АЗС-003",
    fuelType: "АИ-92",
    oldPrice: 56.80,
    newPrice: 57.40,
    change: 0.60,
    changePercent: 1.06,
    user: "Система",
    reason: "Автоматическое обновление"
  },
  {
    id: "PC-004",
    date: "2024-08-29T15:30:00Z",
    station: "АЗС-004",
    fuelType: "ДТ",
    oldPrice: 58.20,
    newPrice: 57.90,
    change: -0.30,
    changePercent: -0.52,
    user: "Иван Сидоров",
    reason: "Коррекция цены"
  },
  {
    id: "PC-005",
    date: "2024-08-29T12:15:00Z",
    station: "АЗС-005",
    fuelType: "АИ-98",
    oldPrice: 65.30,
    newPrice: 66.10,
    change: 0.80,
    changePercent: 1.23,
    user: "Мария Козлова",
    reason: "Изменение марж"
  },
  {
    id: "PC-006",
    date: "2024-08-28T18:00:00Z",
    station: "АЗС-001",
    fuelType: "АИ-95",
    oldPrice: 59.20,
    newPrice: 59.50,
    change: 0.30,
    changePercent: 0.51,
    user: "Система",
    reason: "Плановое обновление"
  }
];

interface PriceHistoryProps {
  isNetworkOnly: boolean;
  isTradingPointSelected: boolean;
  selectedNetwork: string | null;
  selectedTradingPoint: string | null;
}

export function PriceHistory({ isNetworkOnly, isTradingPointSelected }: PriceHistoryProps) {
  const [dateFrom, setDateFrom] = useState("2024-08-28");
  const [dateTo, setDateTo] = useState("2024-08-30");
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
    return null;
  };

  const getChangeBadge = (change: number, changePercent: number) => {
    if (change > 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          +{formatCurrency(change)} (+{changePercent.toFixed(2)}%)
        </Badge>
      );
    } else if (change < 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          {formatCurrency(change)} ({changePercent.toFixed(2)}%)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Без изменений
      </Badge>
    );
  };

  const filteredChanges = mockPriceChanges.filter(change => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return change.fuelType.toLowerCase().includes(query) ||
             change.user.toLowerCase().includes(query) ||
             change.station?.toLowerCase().includes(query) ||
             change.reason?.toLowerCase().includes(query);
    }
    
    // Если выбрана конкретная торговая точка, фильтруем только её изменения
    if (isTradingPointSelected) {
      // В реальном приложении здесь была бы проверка на selectedTradingPoint
      return true;
    }
    
    return true;
  });

  const handleApplyFilters = () => {
    toast({
      title: "Фильтры применены",
      description: `Период: ${dateFrom} - ${dateTo}`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Экспорт данных",
      description: "Экспорт истории изменений цен в CSV файл инициирован",
    });
  };

  // Статистика изменений
  const stats = {
    totalChanges: filteredChanges.length,
    increases: filteredChanges.filter(c => c.change > 0).length,
    decreases: filteredChanges.filter(c => c.change < 0).length,
    avgChange: filteredChanges.reduce((sum, c) => sum + c.change, 0) / filteredChanges.length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-4'}`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего изменений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChanges}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Повышения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.increases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Снижения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.decreases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ср. изменение</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgChange > 0 ? 'text-red-600' : stats.avgChange < 0 ? 'text-green-600' : ''}`}>
              {stats.avgChange > 0 ? '+' : ''}{formatCurrency(stats.avgChange)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
            История изменений цен
          </CardTitle>
          <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>
            {isTradingPointSelected 
              ? "Изменения цен на выбранной торговой точке" 
              : "Все изменения цен по сети"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`space-y-4`}>
            {/* Date Range and Search */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className={isMobile ? 'text-sm' : ''}>Дата начала</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={isMobile ? 'text-sm' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className={isMobile ? 'text-sm' : ''}>Дата окончания</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={isMobile ? 'text-sm' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm' : ''}>Поиск</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Поиск по топливу, точке..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm' : ''}>Действия</Label>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleApplyFilters}
                    size="sm"
                    className="flex-1"
                  >
                    Применить
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Changes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Изменения цен</span>
            <Badge variant="secondary">{filteredChanges.length} записей</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата и время</TableHead>
                  {isNetworkOnly && <TableHead>Торговая точка</TableHead>}
                  <TableHead>Вид топлива</TableHead>
                  <TableHead className="text-right">Старая цена</TableHead>
                  <TableHead className="text-right">Новая цена</TableHead>
                  <TableHead>Изменение</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Причина</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChanges.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell>{formatDateTime(change.date)}</TableCell>
                    {isNetworkOnly && <TableCell>{change.station}</TableCell>}
                    <TableCell>
                      <Badge variant="outline">{change.fuelType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(change.oldPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(change.newPrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChangeIcon(change.change)}
                        {getChangeBadge(change.change, change.changePercent)}
                      </div>
                    </TableCell>
                    <TableCell>{change.user}</TableCell>
                    <TableCell className="max-w-48 truncate" title={change.reason}>
                      {change.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredChanges.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Изменения цен по заданным фильтрам не найдены
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}