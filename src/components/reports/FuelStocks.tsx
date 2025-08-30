import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Fuel, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface FuelMovement {
  fuelType: string;
  startBalance: number;
  income: number;
  expense: number;
  endBalance: number;
  capacity: number;
  fillPercentage: number;
  criticalLevel: number;
}

interface StationFuelStock {
  stationId: string;
  stationName: string;
  movements: FuelMovement[];
}

const mockNetworkMovements: FuelMovement[] = [
  {
    fuelType: "АИ-92",
    startBalance: 78450,
    income: 25000,
    expense: 18320,
    endBalance: 85130,
    capacity: 120000,
    fillPercentage: 70.9,
    criticalLevel: 15
  },
  {
    fuelType: "АИ-95",
    startBalance: 95230,
    income: 30000,
    expense: 28450,
    endBalance: 96780,
    capacity: 150000,
    fillPercentage: 64.5,
    criticalLevel: 15
  },
  {
    fuelType: "АИ-98",
    startBalance: 12450,
    income: 8000,
    expense: 5230,
    endBalance: 15220,
    capacity: 25000,
    fillPercentage: 60.9,
    criticalLevel: 15
  },
  {
    fuelType: "ДТ",
    startBalance: 45670,
    income: 20000,
    expense: 22100,
    endBalance: 43570,
    capacity: 80000,
    fillPercentage: 54.5,
    criticalLevel: 15
  }
];

const mockStationMovements: StationFuelStock[] = [
  {
    stationId: "station-1",
    stationName: "АЗС-001 (Московское шоссе)",
    movements: [
      {
        fuelType: "АИ-92",
        startBalance: 15690,
        income: 5000,
        expense: 3664,
        endBalance: 17026,
        capacity: 24000,
        fillPercentage: 70.9,
        criticalLevel: 15
      },
      {
        fuelType: "АИ-95",
        startBalance: 19046,
        income: 6000,
        expense: 5690,
        endBalance: 19356,
        capacity: 30000,
        fillPercentage: 64.5,
        criticalLevel: 15
      },
      {
        fuelType: "ДТ",
        startBalance: 9134,
        income: 4000,
        expense: 4420,
        endBalance: 8714,
        capacity: 16000,
        fillPercentage: 54.5,
        criticalLevel: 15
      }
    ]
  }
];

interface FuelStocksProps {
  isNetworkOnly: boolean;
  isTradingPointSelected: boolean;
  selectedNetwork: string | null;
  selectedTradingPoint: string | null;
}

export function FuelStocks({ isNetworkOnly, isTradingPointSelected }: FuelStocksProps) {
  const [dateFrom, setDateFrom] = useState("2024-08-30");
  const [dateTo, setDateTo] = useState("2024-08-30");
  const isMobile = useIsMobile();

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(volume) + " л";
  };

  const getFillPercentageColor = (percentage: number, criticalLevel: number) => {
    if (percentage <= criticalLevel) return "text-red-600";
    if (percentage <= criticalLevel * 2) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number, criticalLevel: number) => {
    if (percentage <= criticalLevel) return "bg-red-500";
    if (percentage <= criticalLevel * 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusIcon = (percentage: number, criticalLevel: number) => {
    if (percentage <= criticalLevel) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    return <Fuel className="w-4 h-4 text-green-500" />;
  };

  const handleApplyFilters = () => {
    toast({
      title: "Фильтры применены",
      description: `Период: ${dateFrom} - ${dateTo}`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Экспорт данных",
      description: "Экспорт данных об остатках топлива в CSV файл инициирован",
    });
  };

  const currentData = isTradingPointSelected ? mockStationMovements[0].movements : mockNetworkMovements;

  // Статистика
  const stats = {
    totalIncome: currentData.reduce((sum, item) => sum + item.income, 0),
    totalExpense: currentData.reduce((sum, item) => sum + item.expense, 0),
    totalCapacity: currentData.reduce((sum, item) => sum + item.capacity, 0),
    totalCurrent: currentData.reduce((sum, item) => sum + item.endBalance, 0)
  };

  const overallFillPercentage = (stats.totalCurrent / stats.totalCapacity) * 100;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-4'}`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Общий приход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatVolume(stats.totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Общий расход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatVolume(stats.totalExpense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fuel className="w-4 h-4 text-blue-500" />
              Текущий остаток
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatVolume(stats.totalCurrent)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общая заполненность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getFillPercentageColor(overallFillPercentage, 15)}`}>
              {overallFillPercentage.toFixed(1)}%
            </div>
            <Progress 
              value={overallFillPercentage} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
            Остатки топлива
          </CardTitle>
          <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>
            {isTradingPointSelected 
              ? "Движение топлива на выбранной торговой точке" 
              : "Суммарные остатки по всей сети"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`space-y-4`}>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
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

      {/* Fuel Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Движение топлива</span>
            <Badge variant="secondary">{currentData.length} видов топлива</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Вид топлива</TableHead>
                  <TableHead className="text-right">Остаток на начало</TableHead>
                  <TableHead className="text-right">Приход</TableHead>
                  <TableHead className="text-right">Расход</TableHead>
                  <TableHead className="text-right">Остаток на конец</TableHead>
                  <TableHead className="text-center">Заполненность</TableHead>
                  <TableHead className="text-center">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((movement) => (
                  <TableRow key={movement.fuelType}>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold">
                        {movement.fuelType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatVolume(movement.startBalance)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      +{formatVolume(movement.income)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      -{formatVolume(movement.expense)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatVolume(movement.endBalance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-2">
                        <div className={`font-semibold ${getFillPercentageColor(movement.fillPercentage, movement.criticalLevel)}`}>
                          {movement.fillPercentage.toFixed(1)}%
                        </div>
                        <Progress 
                          value={movement.fillPercentage} 
                          className="w-20 mx-auto h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {formatVolume(movement.capacity)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(movement.fillPercentage, movement.criticalLevel)}
                        <span className={`text-xs font-medium ${getFillPercentageColor(movement.fillPercentage, movement.criticalLevel)}`}>
                          {movement.fillPercentage <= movement.criticalLevel ? 'Критический' :
                           movement.fillPercentage <= movement.criticalLevel * 2 ? 'Низкий' : 'Норма'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Critical Levels Alert */}
      {currentData.some(m => m.fillPercentage <= m.criticalLevel) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Внимание: Критические уровни топлива
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentData
                .filter(m => m.fillPercentage <= m.criticalLevel)
                .map(movement => (
                  <div key={movement.fuelType} className="text-red-700">
                    • <strong>{movement.fuelType}</strong>: {movement.fillPercentage.toFixed(1)}% 
                    (осталось {formatVolume(movement.endBalance)})
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}