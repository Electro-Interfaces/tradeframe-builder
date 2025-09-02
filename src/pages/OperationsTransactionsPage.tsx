import React, { useState, useMemo, useEffect } from "react";
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
import { Activity, Download, Filter, Clock, CheckCircle, XCircle, PlayCircle, PauseCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { operationsService, Operation } from "@/services/operationsService";

// Получение правильных типов операций из сервиса
const operationTypeMap = {
  'sale': 'Заправка',
  'refund': 'Возврат',
  'correction': 'Коррекция',
  'maintenance': 'Обслуживание',
  'fuel_loading': 'Заправка',
  'cash_collection': 'Инкассация',
  'tank_loading': 'Загрузка резервуара',
  'diagnostics': 'Диагностика',
  'sensor_calibration': 'Калибровка датчиков'
};

const operationTypes = ["Все", "Заправка", "Инкассация", "Загрузка резервуара", "Диагностика", "Калибровка датчиков"];
const statusTypes = ["Все", "completed", "in_progress", "failed", "pending", "cancelled"];

export default function OperationsTransactionsPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояние данных операций
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Фильтры
  const [selectedOperationType, setSelectedOperationType] = useState("Все");
  const [selectedStatus, setSelectedStatus] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Загрузка операций при монтировании компонента
  useEffect(() => {
    const loadOperations = async () => {
      try {
        setLoading(true);
        const data = await operationsService.getAll();
        setOperations(data);
      } catch (error) {
        console.error('Ошибка загрузки операций:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOperations();
  }, []);

  // Автообновление данных каждые 5 секунд
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await operationsService.getAll();
        setOperations(data);
      } catch (error) {
        console.error('Ошибка обновления операций:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Фильтрация данных
  const filteredOperations = useMemo(() => {
    return operations.filter(record => {
      // Получаем отображаемый тип операции
      const displayType = operationTypeMap[record.operationType] || record.operationType;
      
      // Фильтр по типу операции
      if (selectedOperationType !== "Все" && displayType !== selectedOperationType) return false;
      
      // Фильтр по статусу
      if (selectedStatus !== "Все" && record.status !== selectedStatus) return false;
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.id.toLowerCase().includes(query) ||
          displayType.toLowerCase().includes(query) ||
          record.details.toLowerCase().includes(query) ||
          (record.deviceId && record.deviceId.toLowerCase().includes(query)) ||
          (record.transactionId && record.transactionId.toLowerCase().includes(query)) ||
          (record.tradingPointName && record.tradingPointName.toLowerCase().includes(query)) ||
          (record.operatorName && record.operatorName.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [operations, selectedOperationType, selectedStatus, searchQuery]);

  // KPI данные - подсчет по статусам
  const statusKpis = useMemo(() => {
    const counts = {
      completed: filteredOperations.filter(op => op.status === 'completed').length,
      in_progress: filteredOperations.filter(op => op.status === 'in_progress').length,
      failed: filteredOperations.filter(op => op.status === 'failed').length,
      pending: filteredOperations.filter(op => op.status === 'pending').length,
    };
    return counts;
  }, [filteredOperations]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-slate-600 text-slate-200">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-slate-600 text-slate-200">Выполняется</Badge>;
      case 'failed':
        return <Badge className="bg-slate-700 text-slate-300">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-slate-600 text-slate-200">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-600 text-slate-200">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-slate-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      case 'pending':
        return <PauseCircle className="w-4 h-4 text-slate-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };


  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1) {
      return `${Math.round(duration * 60)} сек`;
    }
    return `${duration.toFixed(1)} мин`;
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Операции</h1>
              <p className="text-slate-400 mt-2">
                {isNetworkOnly && "Real-time состояние операций торговой сети"}
                {isTradingPointSelected && "Real-time состояние операций торговой точки"}
                {!selectedNetwork && "Выберите сеть для просмотра операций"}
              </p>
            </div>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Автообновление' : 'Включить автообновление'}
            </Button>
          </div>
        </div>

        {selectedNetwork && (
          <>
            {/* Фильтры */}
            <div className="mx-4 md:mx-6 lg:mx-8">
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
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                  <div>
                    <Label className="text-slate-300">Тип операции</Label>
                    <Select value={selectedOperationType} onValueChange={setSelectedOperationType}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operationTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Статус</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Все">Все</SelectItem>
                        <SelectItem value="completed">Завершено</SelectItem>
                        <SelectItem value="in_progress">Выполняется</SelectItem>
                        <SelectItem value="failed">Ошибка</SelectItem>
                        <SelectItem value="pending">Ожидание</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Поиск</Label>
                    <Input
                      placeholder="Поиск по операции, устройству, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* KPI - Статусы операций */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Завершено</CardTitle>
                  <CheckCircle className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{statusKpis.completed}</div>
                  <p className="text-xs text-slate-400">Успешных операций</p>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">В процессе</CardTitle>
                  <PlayCircle className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{statusKpis.in_progress}</div>
                  <p className="text-xs text-slate-400">Активных операций</p>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Ошибки</CardTitle>
                  <XCircle className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{statusKpis.failed}</div>
                  <p className="text-xs text-slate-400">Операций с ошибками</p>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Ожидание</CardTitle>
                  <PauseCircle className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{statusKpis.pending}</div>
                  <p className="text-xs text-slate-400">В очереди</p>
                </CardContent>
              </Card>
            </div>
            </div>

            {/* Таблица операций */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700 w-full max-w-none">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Текущие операции
                  <Badge variant="secondary" className="ml-auto">
                    {filteredOperations.length} операций
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isMobile ? (
                  // Mobile card layout
                  <div className="space-y-4 p-4">
                    {filteredOperations.map((record) => (
                      <Card key={record.id} className="bg-slate-700 border-slate-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              <span className="font-medium text-white">{operationTypeMap[record.operationType] || record.operationType}</span>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                          {record.transactionId && (
                            <div className="text-xs text-slate-400 mt-1">{record.transactionId}</div>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {record.deviceId || 'N/A'}
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">{record.lastUpdated}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Дата:</span>
                              <span className="text-white font-mono ml-1">{new Date(record.startTime).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Начало:</span>
                              <span className="text-white font-mono ml-1">{new Date(record.startTime).toLocaleTimeString('ru-RU')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Завершение:</span>
                              <span className="text-white font-mono ml-1">{record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Тип записи:</span>
                              <Badge className="ml-1 bg-slate-600 text-slate-200">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-slate-400">Топливо:</span>
                              <span className="text-white ml-1">{record.fuelType || '—'}</span>
                            </div>
                          </div>
                          
                          {(record.quantity || record.price || record.totalCost) && (
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-slate-400">Кол-во:</span>
                                <div className="text-white font-mono">
                                  {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">Цена:</span>
                                <div className="text-white font-mono">
                                  {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">Сумма:</span>
                                <div className="text-white font-mono">
                                  {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                                </div>
                              </div>
                            </div>
                          )}

                          {record.paymentMethod && (
                            <div className="text-sm">
                              <span className="text-slate-400">Вид оплаты:</span>
                              <span className="text-white ml-1">
                                {record.paymentMethod === 'bank_card' ? 'Банковская карта' :
                                 record.paymentMethod === 'cash' ? 'Наличные' :
                                 record.paymentMethod === 'fuel_card' ? 'Топливная карта' :
                                 record.paymentMethod === 'corporate_card' ? 'Корпоративная карта' :
                                 record.paymentMethod}
                              </span>
                            </div>
                          )}

                          {record.status === 'in_progress' && record.progress !== undefined && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Прогресс:</span>
                                <span className="text-sm text-blue-400">{Math.round(record.progress)}%</span>
                              </div>
                              <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500"
                                  style={{ width: `${record.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {record.duration && record.status !== 'in_progress' && (
                            <div className="text-sm">
                              <span className="text-slate-400">Длительность:</span>
                              <span className="text-white font-mono ml-1">{formatDuration(record.duration)}</span>
                            </div>
                          )}
                          
                          <div className="text-sm border-t border-slate-600 pt-2">
                            <div className="flex items-start gap-1">
                              <span className="text-slate-400">Детали:</span>
                              <span className="text-slate-300 flex-1">
                                {record.details}
                                {record.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400 inline ml-1" />}
                              </span>
                            </div>
                          </div>
                          
                          {isNetworkOnly && record.tradingPointName && (
                            <div className="text-sm border-t border-slate-600 pt-2">
                              <span className="text-slate-400">Торговая точка:</span>
                              <div className="text-slate-300 font-medium">{record.tradingPointName}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {filteredOperations.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет операций по выбранным фильтрам
                      </div>
                    )}
                  </div>
                ) : (
                  // Desktop table layout
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                          <TableHead className="text-slate-300">Тип записи</TableHead>
                          <TableHead className="text-slate-300">Дата</TableHead>
                          <TableHead className="text-slate-300">Время начала</TableHead>
                          <TableHead className="text-slate-300">Время завершения</TableHead>
                          <TableHead className="text-slate-300">Вид топлива</TableHead>
                          <TableHead className="text-slate-300">Количество</TableHead>
                          <TableHead className="text-slate-300">Цена</TableHead>
                          <TableHead className="text-slate-300">Стоимость</TableHead>
                          <TableHead className="text-slate-300">Вид оплаты</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOperations.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            {isNetworkOnly && (
                              <TableCell className="text-slate-300 max-w-xs">
                                <div className="truncate" title={record.tradingPointName}>
                                  {record.tradingPointName}
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(record.status)}
                                {getStatusBadge(record.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              <Badge className="bg-slate-600 text-slate-200">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {new Date(record.startTime).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {new Date(record.startTime).toLocaleTimeString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.fuelType || '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.paymentMethod ? 
                                (record.paymentMethod === 'bank_card' ? 'Банковская карта' :
                                 record.paymentMethod === 'cash' ? 'Наличные' :
                                 record.paymentMethod === 'fuel_card' ? 'Топливная карта' :
                                 record.paymentMethod === 'corporate_card' ? 'Корпоративная карта' :
                                 record.paymentMethod) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {filteredOperations.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет операций по выбранным фильтрам
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </>
        )}

        {/* Сообщение о выборе сети */}
        {!selectedNetwork && (
          <div className="mx-4 md:mx-6 lg:mx-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра операций</h3>
              <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}