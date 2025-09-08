import React, { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Activity, ChevronDown, Save, Mail, Send } from "lucide-react";
import { operationsSupabaseService } from "@/services/operationsSupabaseService";
import { telegramService } from "@/services/telegramService";
import { isGlobalTelegramConfigured } from "@/config/system";
import { isUserTelegramEnabled } from "@/config/userSettings";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';

export default function OperationsTransactionsPageSimple() {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Фильтры
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Все");
  const [selectedStatus, setSelectedStatus] = useState("Все");
  // Устанавливаем даты на период с данными (август 2025)
  const [dateFrom, setDateFrom] = useState("2025-08-01");
  const [dateTo, setDateTo] = useState("2025-08-31");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const loadData = async () => {
    console.log('🔄 loadData() начинает выполнение...');
    setLoading(true);
    setError('');
    try {
      
      console.log('🔄 Вызываем operationsSupabaseService.getOperations() для прямой загрузки из Supabase...');
      const data = await operationsSupabaseService.getOperations({});
      
      console.log('✅ Получены данные:', {
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: data?.length || 'undefined',
        firstItem: data?.[0] || 'none'
      });
      
      console.log('🔄 Устанавливаем operations в состояние...');
      setOperations(data || []);
      
      console.log('✅ loadData() завершён успешно');
    } catch (error) {
      console.error('❌ Ошибка в loadData():', error);
      console.error('Стек ошибки:', error.stack);
      
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(errorMessage);
      setOperations([]);
    } finally {
      console.log('🔄 Устанавливаем loading = false');
      setLoading(false);
    }
  };

  // Автоматическая загрузка данных при монтировании компонента
  useEffect(() => {
    console.log('🔄 OperationsTransactionsPageSimple useEffect запущен');
    loadData();
  }, []);

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

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFuelType, selectedPaymentMethod, selectedStatus, dateFrom, dateTo, searchQuery]);

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

  // Функция создания Excel файла
  const createExcelFile = (operations) => {
    try {
      console.log('🔄 Начинаем экспорт операций:', operations.length);
      
      if (operations.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }

      // Подготовка данных для экспорта
      const exportData = operations.map((operation, index) => ({
        '№': index + 1,
        'ID операции': operation.id,
        'ID транзакции': operation.transactionId || '',
        'Номер ТО': operation.toNumber || '',
        'Дата': new Date(operation.startTime).toLocaleDateString('ru-RU'),
        'Время начала': new Date(operation.startTime).toLocaleTimeString('ru-RU'),
        'Время завершения': operation.endTime ? new Date(operation.endTime).toLocaleTimeString('ru-RU') : '',
        'Статус': operation.status === 'completed' ? 'Завершено' :
                  operation.status === 'in_progress' ? 'Выполняется' :
                  operation.status === 'failed' ? 'Ошибка' :
                  operation.status === 'pending' ? 'Ожидание' :
                  operation.status === 'cancelled' ? 'Отменено' : operation.status,
        'Торговая точка': operation.tradingPointName || '',
        'Устройство': operation.deviceId || '',
        'Вид топлива': operation.fuelType || '',
        'Фактич. отпуск (л)': operation.actualQuantity?.toFixed(2) || operation.quantity?.toFixed(2) || '',
        'Цена (₽/л)': operation.price?.toFixed(2) || '',
        'Фактич. отпуск (₽)': operation.actualAmount?.toFixed(2) || operation.totalCost?.toFixed(2) || '',
        'Вид оплаты': operation.paymentMethod ? ({
          'cash': 'Наличные',
          'bank_card': 'Банковские карты',
          'fuel_card': 'Топливные карты',
          'online_order': 'Онлайн заказы'
        }[operation.paymentMethod] || operation.paymentMethod) : '',
        'Номер POS': operation.posNumber || '',
        'Смена': operation.shiftNumber || '',
        'Номер карты': operation.cardNumber || '',
        'Заказ (л)': operation.orderedQuantity?.toFixed(2) || '',
        'Заказ (₽)': operation.orderedAmount?.toFixed(2) || '',
        'Оператор': operation.operatorName || '',
        'Детали': operation.details || ''
      }));

      console.log('📊 Подготовлено данных для экспорта:', exportData.length);

      // Создание книги Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      // Настройка ширины колонок
      const colWidths = [
        { wch: 5 },   // №
        { wch: 15 },  // ID операции
        { wch: 15 },  // ID транзакции
        { wch: 10 },  // Номер ТО
        { wch: 12 },  // Дата
        { wch: 12 },  // Время начала
        { wch: 12 },  // Время завершения
        { wch: 12 },  // Статус
        { wch: 20 },  // Торговая точка
        { wch: 12 },  // Устройство
        { wch: 12 },  // Вид топлива
        { wch: 15 },  // Фактич. отпуск (л)
        { wch: 12 },  // Цена
        { wch: 15 },  // Фактич. отпуск (₽)
        { wch: 15 },  // Вид оплаты
        { wch: 10 },  // Номер POS
        { wch: 8 },   // Смена
        { wch: 15 },  // Номер карты
        { wch: 12 },  // Заказ (л)
        { wch: 12 },  // Заказ (₽)
        { wch: 15 },  // Оператор
        { wch: 30 }   // Детали
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Операции');

      // Генерация имени файла с текущей датой
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filename = `operations_${dateStr}_${timeStr}.xlsx`;

      console.log('💾 Сохраняем файл:', filename);

      // Возвращаем данные для дальнейшего использования
      return { workbook, filename };
    } catch (error) {
      console.error('❌ Ошибка при создании файла:', error);
      alert('Ошибка при создании файла. Проверьте консоль для деталей.');
      return null;
    }
  };

  // Функция сохранения файла локально
  const saveFileLocally = (operations) => {
    const result = createExcelFile(operations);
    if (result) {
      XLSX.writeFile(result.workbook, result.filename);
      console.log('✅ Файл сохранен локально:', result.filename);
    }
  };

  // Функция отправки в Telegram
  const sendToTelegram = async (operations) => {
    try {
      // Проверяем глобальные настройки
      if (!isGlobalTelegramConfigured()) {
        alert('Telegram бот не настроен администратором.\n\nОбратитесь к администратору для настройки корпоративного бота.');
        return;
      }

      // Проверяем настройки пользователя
      if (!isUserTelegramEnabled()) {
        alert('Telegram уведомления отключены.\n\nДля включения:\n1. Откройте Профиль → Интеграции\n2. Включите Telegram уведомления\n3. Укажите ваш Chat ID');
        return;
      }

      const result = createExcelFile(operations);
      if (!result) return;

      // Конвертируем в blob для отправки
      const wbout = XLSX.write(result.workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Создаем описание для файла
      const caption = `📊 <b>Отчет по операциям</b>\n\n` +
                     `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n` +
                     `📈 Операций: ${operations.length}\n` +
                     `📄 Файл: ${result.filename}\n\n` +
                     `🤖 Автоматически сгенерировано системой TradeFrame`;

      console.log('📱 Отправляем файл в Telegram...');
      
      await telegramService.sendDocument(blob, {
        filename: result.filename,
        caption: caption
      });

      console.log('✅ Файл успешно отправлен в Telegram');
      alert('✅ Файл успешно отправлен в Telegram!');
      
    } catch (error) {
      console.error('❌ Ошибка отправки в Telegram:', error);
      
      // Если ошибка связана с настройками, предлагаем настроить
      const errorMessage = error.message || 'Неизвестная ошибка';
      if (errorMessage.includes('настроен') || errorMessage.includes('токен') || errorMessage.includes('chat_id')) {
        alert(`❌ ${errorMessage}\n\nОткройте настройки профиля для настройки Telegram бота.`);
      } else {
        alert(`❌ Ошибка отправки в Telegram:\n${errorMessage}`);
      }
    }
  };

  // Функция отправки по email
  const sendToEmail = (operations) => {
    const userEmail = user?.email;
    
    if (!userEmail) {
      alert('Для отправки по email необходимо указать email в профиле.');
      return;
    }

    const result = createExcelFile(operations);
    if (result) {
      // Создаем сообщение для email
      const subject = `Отчет по операциям - ${new Date().toLocaleDateString('ru-RU')}`;
      const body = `📊 Отчет по операциям\n\n` +
                  `Период: ${new Date().toLocaleDateString('ru-RU')}\n` +
                  `Операций: ${operations.length}\n` +
                  `Файл: ${result.filename}\n\n` +
                  `Пожалуйста, загрузите файл отдельно и прикрепите к письму.`;
      
      // Также сохраняем файл локально для отправки
      XLSX.writeFile(result.workbook, result.filename);
      
      // Создаем mailto ссылку
      const mailtoUrl = `mailto:${userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl);
      
      console.log('📧 Подготовлено письмо для отправки');
      alert(`Email клиент открыт с подготовленным письмом на адрес ${userEmail}. Файл сохранен для прикрепления.`);
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-shrink-0">
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => saveFileLocally(filteredOperations)}>
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить файл
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sendToTelegram(filteredOperations)}>
                      <Send className="w-4 h-4 mr-2" />
                      Отправить в Telegram
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sendToEmail(filteredOperations)}>
                      <Mail className="w-4 h-4 mr-2" />
                      Отправить по email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              {error ? (
                <div className="bg-red-900/50 border border-red-700 rounded p-4 mb-4">
                  <p className="text-red-200 font-semibold">❌ Ошибка загрузки операций:</p>
                  <p className="text-red-300 mt-2">{error}</p>
                </div>
              ) : (
                <p>Операций загружено: {operations.length} | Отфильтровано: {filteredOperations.length}</p>
              )}
              {console.log('🔍 Render debug:', {
                operationsLength: operations.length,
                filteredLength: filteredOperations.length,
                loading,
                error,
                operationsType: typeof operations,
                isOperationsArray: Array.isArray(operations)
              })}
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
                  {filteredOperations
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((record) => (
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
              
              {filteredOperations.length > itemsPerPage && (
                <div className="flex items-center justify-between py-4 px-4 bg-slate-800 border-t border-slate-700">
                  <div className="text-slate-400 text-sm">
                    Показаны {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredOperations.length)} из {filteredOperations.length} операций
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="text-slate-300 border-slate-600 hover:bg-slate-700"
                    >
                      ← Предыдущая
                    </Button>
                    <span className="text-slate-300 text-sm px-3">
                      Страница {currentPage} из {Math.ceil(filteredOperations.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOperations.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredOperations.length / itemsPerPage)}
                      className="text-slate-300 border-slate-600 hover:bg-slate-700"
                    >
                      Следующая →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}