import React, { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Activity } from "lucide-react";
import { operationsService } from "@/services/operationsService";

export default function OperationsTransactionsPageSimple() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Фильтры
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Все");
  const [selectedStatus, setSelectedStatus] = useState("Все");
  const [dateFrom, setDateFrom] = useState("2025-08-01");
  const [dateTo, setDateTo] = useState("2025-08-31");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('tradeframe_operations');
      localStorage.removeItem('operations');
      await operationsService.forceReload();
      const data = await operationsService.getAll();
      setOperations(data);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация операций
  const filteredOperations = useMemo(() => {
    return operations.filter(record => {
      // Исключаем нежелательные способы оплаты
      const excludedPaymentMethods = ['supplier_delivery', 'corporate_card', 'mobile_payment'];
      if (record.paymentMethod && excludedPaymentMethods.includes(record.paymentMethod)) {
        return false;
      }
      
      // Фильтр по виду топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Фильтр по виду оплаты
      if (selectedPaymentMethod !== "Все" && record.paymentMethod !== selectedPaymentMethod) return false;
      
      // Фильтр по статусу
      if (selectedStatus !== "Все" && record.status !== selectedStatus) return false;
      
      // Фильтр по датам
      if (dateFrom || dateTo) {
        const recordDate = new Date(record.startTime);
        const recordDateStr = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (dateFrom && recordDateStr < dateFrom) {
          return false;
        }
        
        if (dateTo && recordDateStr > dateTo) {
          return false;
        }
      }
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.id.toLowerCase().includes(query) ||
          record.details.toLowerCase().includes(query) ||
          (record.tradingPointName && record.tradingPointName.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [operations, selectedFuelType, selectedPaymentMethod, selectedStatus, dateFrom, dateTo, searchQuery]);

  // Списки для селекторов
  const fuelTypes = useMemo(() => {
    const types = new Set(operations.map(op => op.fuelType).filter(Boolean));
    return ["Все", ...Array.from(types).sort()];
  }, [operations]);

  const paymentMethods = useMemo(() => {
    const allowedMethods = ['cash', 'bank_card', 'fuel_card', 'online_order'];
    const methods = new Set(operations.filter(op => op.paymentMethod && allowedMethods.includes(op.paymentMethod)).map(op => op.paymentMethod));
    return ["Все", ...allowedMethods.filter(method => methods.has(method))];
  }, [operations]);

  const statusTypes = useMemo(() => {
    const statuses = new Set(operations.map(op => op.status).filter(Boolean));
    return ["Все", ...Array.from(statuses).sort()];
  }, [operations]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-slate-600 text-slate-200">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-slate-600 text-slate-200">Выполняется</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-600 text-slate-200">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Фильтры */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center justify-between">
              <span>Операции и транзакции</span>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-shrink-0">
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
                <Button onClick={loadData} disabled={loading}>
                  {loading ? 'Загрузка...' : 'Загрузить данные'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
              <div>
                <Label htmlFor="status" className="text-slate-300">Статус</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {statusTypes.map((status) => (
                      <SelectItem key={status} value={status} className="text-slate-200 focus:bg-slate-700">
                        {status === "Все" ? status : ({
                          'completed': 'Завершено',
                          'in_progress': 'Выполняется',
                          'failed': 'Ошибка',
                          'pending': 'Ожидание',
                          'cancelled': 'Отменено'
                        }[status] || status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fuel-type" className="text-slate-300">Вид топлива</Label>
                <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Выберите вид топлива" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {fuelTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-slate-200 focus:bg-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="payment-method" className="text-slate-300">Вид оплаты</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Выберите вид оплаты" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method} className="text-slate-200 focus:bg-slate-700">
                        {method === "Все" ? method : ({
                          'cash': 'Наличные',
                          'bank_card': 'Банковские карты', 
                          'fuel_card': 'Топливные карты',
                          'online_order': 'Онлайн заказы'
                        }[method] || method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-from" className="text-slate-300">Дата с</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              
              <div>
                <Label htmlFor="date-to" className="text-slate-300">Дата по</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="search" className="text-slate-300">Поиск</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Поиск по операции, устройству, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="text-slate-300">
              <p>Операций загружено: {operations.length} | Отфильтровано: {filteredOperations.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI по видам топлива */}
        {operations.length > 0 && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Суммы по видам топлива</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...new Set(filteredOperations.map(op => op.fuelType).filter(Boolean))].map(fuel => {
                  const fuelOps = filteredOperations.filter(op => op.fuelType === fuel && op.status === 'completed');
                  const volume = fuelOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                  const revenue = fuelOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  
                  return (
                    <Card key={fuel} className="bg-slate-800 border-slate-700">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">{fuel}</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">{volume.toFixed(0)} л</div>
                        <p className="text-sm text-slate-400">{revenue.toFixed(0)} ₽</p>
                        <p className="text-xs text-blue-400">{fuelOps.length} операций</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI по видам оплаты */}
        {operations.length > 0 && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Суммы по видам оплаты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {['cash', 'bank_card', 'fuel_card', 'online_order'].map(paymentMethod => {
                  const paymentOps = filteredOperations.filter(op => op.paymentMethod === paymentMethod && op.status === 'completed');
                  const revenue = paymentOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  
                  if (paymentOps.length === 0) return null;
                  
                  const displayName = {
                    'cash': 'Наличные',
                    'bank_card': 'Банковские карты',
                    'fuel_card': 'Топливные карты',
                    'online_order': 'Онлайн заказы'
                  }[paymentMethod];
                  
                  return (
                    <Card key={paymentMethod} className="bg-slate-800 border-slate-700">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">{displayName}</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">{revenue.toFixed(0)} ₽</div>
                        <p className="text-xs text-blue-400">{paymentOps.length} операций</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Таблица операций */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200">Текущие операции</CardTitle>
            <p className="text-slate-400">{filteredOperations.length} операций</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800">
                    <TableHead className="text-slate-300 min-w-[100px]">Статус</TableHead>
                    <TableHead className="text-slate-300 min-w-[150px]">ID</TableHead>
                    <TableHead className="text-slate-300 min-w-[100px]">Номер ТО</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Время начала</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Время окончания</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Вид топлива</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Фактич. отпуск (литры)</TableHead>
                    <TableHead className="text-slate-300 min-w-[100px]">Цена за л</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Фактич. отпуск (сумма)</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Вид оплаты</TableHead>
                    <TableHead className="text-slate-300 min-w-[100px]">Номер POS</TableHead>
                    <TableHead className="text-slate-300 min-w-[80px]">Смена</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Номер карты</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Заказ (литры)</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Заказ (сумма)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperations.slice(0, 50).map((record) => (
                    <TableRow key={record.id} className="border-slate-700 hover:bg-slate-800">
                      <TableCell className="min-w-[100px]">{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-slate-300 font-mono text-xs min-w-[150px]">{record.id}</TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                        {record.toNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px]">
                        {new Date(record.startTime).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px]">
                        {record.endTime ? new Date(record.endTime).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px]">
                        {record.fuelType || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px] text-right">
                        {record.actualQuantity ? `${record.actualQuantity.toFixed(2)} л` : 
                         record.quantity ? `${record.quantity.toFixed(2)} л` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[100px] text-right">
                        {record.price ? `${record.price.toFixed(2)} ₽` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px] text-right">
                        {record.actualAmount ? `${record.actualAmount.toFixed(2)} ₽` : 
                         record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px]">
                        {{
                          'cash': 'Наличные',
                          'bank_card': 'Банк. карты',
                          'fuel_card': 'Топл. карты', 
                          'online_order': 'Онлайн заказы'
                        }[record.paymentMethod] || record.paymentMethod || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                        {record.posNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[80px] text-center">
                        {record.shiftNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px] font-mono">
                        {record.cardNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px] text-right">
                        {record.orderedQuantity ? `${record.orderedQuantity.toFixed(2)} л` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px] text-right">
                        {record.orderedAmount ? `${record.orderedAmount.toFixed(2)} ₽` : '-'}
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
              
              {filteredOperations.length > 50 && (
                <div className="text-center py-4 text-slate-400">
                  Показаны первые 50 из {filteredOperations.length} операций
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}