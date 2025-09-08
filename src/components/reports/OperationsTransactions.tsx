import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { operationsSupabaseService } from "@/services/operationsSupabaseService";
import { Operation } from "@/services/operationsService";

// Типы операций для отображения
const operationTypeMap = {
  'sale': 'Продажа',
  'refund': 'Возврат',
  'correction': 'Коррекция',
  'maintenance': 'Обслуживание',
  'fuel_loading': 'Заправка',
  'cash_collection': 'Инкассация',
  'tank_loading': 'Загрузка резервуара',
  'diagnostics': 'Диагностика',
  'sensor_calibration': 'Калибровка датчиков'
};

interface OperationsTransactionsProps {
  isNetworkOnly: boolean;
  isTradingPointSelected: boolean;
  selectedNetwork: string | null;
  selectedTradingPoint: string | null;
}

export function OperationsTransactions({ isNetworkOnly, isTradingPointSelected }: OperationsTransactionsProps) {
  // Устанавливаем даты на период с данными (август 2025)
  const [dateFrom, setDateFrom] = useState("2025-08-01");
  const [dateTo, setDateTo] = useState("2025-08-31");
  const [operationType, setOperationType] = useState("all");
  const [operationStatus, setOperationStatus] = useState("all");
  const [fuelType, setFuelType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  // Загрузка операций при монтировании
  useEffect(() => {
    const loadOperations = async () => {
      try {
        setLoading(true);
        const data = await operationsSupabaseService.getOperations({});
        setOperations(data);
      } catch (error) {
        console.error('Ошибка загрузки операций:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOperations();
  }, []);

  const getTypeLabel = (type: string) => {
    return operationTypeMap[type as keyof typeof operationTypeMap] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Завершено", color: "bg-green-100 text-green-800 border-green-200" },
      pending: { label: "Ожидает", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      failed: { label: "Ошибка", color: "bg-red-100 text-red-800 border-red-200" },
      cancelled: { label: "Отменено", color: "bg-gray-100 text-gray-800 border-gray-200" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const filteredOperations = operations.filter(operation => {
    if (operationType !== "all" && operation.operationType !== operationType) return false;
    if (operationStatus !== "all" && operation.status !== operationStatus) return false;
    if (fuelType !== "all" && operation.fuelType !== fuelType) return false;
    if (searchQuery && !operation.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Если выбрана конкретная торговая точка, фильтруем только её операции
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
      description: "Экспорт операций и транзакций в CSV файл инициирован",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
            Операции и Транзакции
          </CardTitle>
          <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>
            {isTradingPointSelected 
              ? "Все операции выбранной торговой точки" 
              : "Агрегированные операции по всей сети"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`space-y-4`}>
            {/* Date Range */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-6'}`}>
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
                <Label className={isMobile ? 'text-sm' : ''}>Тип операции</Label>
                <Select value={operationType} onValueChange={setOperationType}>
                  <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="sale">Продажи</SelectItem>
                    <SelectItem value="refund">Возвраты</SelectItem>
                    <SelectItem value="correction">Коррекции</SelectItem>
                    <SelectItem value="maintenance">Обслуживание</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm' : ''}>Статус</Label>
                <Select value={operationStatus} onValueChange={setOperationStatus}>
                  <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="completed">Завершено</SelectItem>
                    <SelectItem value="pending">Ожидает</SelectItem>
                    <SelectItem value="failed">Ошибка</SelectItem>
                    <SelectItem value="cancelled">Отменено</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm' : ''}>Вид топлива</Label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все виды</SelectItem>
                    <SelectItem value="АИ-92">АИ-92</SelectItem>
                    <SelectItem value="АИ-95">АИ-95</SelectItem>
                    <SelectItem value="АИ-98">АИ-98</SelectItem>
                    <SelectItem value="ДТ">Дизельное топливо</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm' : ''}>Действия</Label>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleApplyFilters}
                    size="sm"
                    className="flex-1"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Применить
                  </Button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Поиск по ID операции..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {!isMobile && "Экспорт"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Список операций</span>
            <Badge variant="secondary">{filteredOperations.length} записей</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата и время</TableHead>
                  {isNetworkOnly && <TableHead>Торговая точка</TableHead>}
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Вид топлива</TableHead>
                  <TableHead className="text-right">Объем (л)</TableHead>
                  <TableHead>Способ оплаты</TableHead>
                  <TableHead>Оператор</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="font-mono text-sm">{operation.id}</TableCell>
                    <TableCell>{formatDateTime(operation.startTime)}</TableCell>
                    {isNetworkOnly && <TableCell>{operation.tradingPointName || '—'}</TableCell>}
                    <TableCell>{getTypeLabel(operation.operationType)}</TableCell>
                    <TableCell>{getStatusBadge(operation.status)}</TableCell>
                    <TableCell className={`text-right ${operation.totalCost && operation.totalCost < 0 ? 'text-red-600' : ''}`}>
                      {operation.totalCost ? formatCurrency(operation.totalCost) : '—'}
                    </TableCell>
                    <TableCell>{operation.fuelType || '—'}</TableCell>
                    <TableCell className={`text-right ${operation.quantity && operation.quantity < 0 ? 'text-red-600' : ''}`}>
                      {operation.quantity ? operation.quantity.toFixed(1) : '—'}
                    </TableCell>
                    <TableCell>{operation.paymentMethod || '—'}</TableCell>
                    <TableCell>{operation.operatorName || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredOperations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Операции по заданным фильтрам не найдены
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}