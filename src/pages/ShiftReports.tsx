import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/context/SelectionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Eye, 
  Printer, 
  StopCircle, 
  Clock,
  DollarSign,
  User,
  Calendar,
  CalendarIcon,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Fuel,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Gauge,
  Search,
  Filter,
  ChevronRight,
  FileX,
  CheckCircle
} from "lucide-react";

// Типы данных для сменных отчётов по форме 25-НП
interface ShiftReport {
  id: string;
  shiftNumber: number;
  closedAt: string;
  operator: string;
  tradingPointId: string;
  status: 'draft' | 'closed' | 'synchronized' | 'archived';
  
  // Итоги смены
  totalRevenue: number; // общая выручка в копейках
  totalVolume: number; // общий отпуск в литрах
  receiptCount: number; // количество чеков
  
  // Способы оплаты
  payments: {
    cash: number;      // наличные
    cards: number;     // банковские карты
    sbp: number;       // СБП
    fuelCards: number; // топливные карты
    other: number;     // прочие способы
  };
  
  // Позиции по видам топлива
  fuelPositions: FuelPosition[];
  
  // Документы смены
  documents: ShiftDocument[];
}

interface FuelPosition {
  id: string;
  fuelType: string;
  fuelCode: string;
  tankNumber: string;
  
  // Остатки в литрах
  startBalance: number;        // остаток на начало
  received: number;           // поступило за смену
  dispensed: number;          // отпуск по ТРК
  calculatedBalance: number;  // расчётный остаток (начало + приход - отпуск)
  actualBalance: number;      // фактический остаток (по замеру)
  difference: number;         // разница (факт - расчёт)
  
  // Показания ТРК
  meterStart: number;         // показания ТРК на начало
  meterEnd: number;          // показания ТРК на конец
  
  // Замеры резервуара
  levelMm: number;           // уровень в мм
  waterMm: number;           // вода в мм
  temperature: number;       // температура
  
  // Допустимая погрешность ТРК
  allowedErrorPercent: number;
  hasExcessError: boolean;    // превышение допустимой погрешности
  
  // Кассовые итоги по виду топлива
  revenue: number;           // выручка в копейках
  receiptCount: number;      // количество чеков
}

interface ShiftDocument {
  id: string;
  type: 'z-report' | 'acceptance-act' | 'transfer-act' | 'correction' | 'invoice';
  name: string;
  createdAt: string;
  fileSize?: number;
  status: 'draft' | 'ready' | 'error';
}

// Mock данные по форме 25-НП
const mockShiftReports: ShiftReport[] = [
  {
    id: "sr_001",
    shiftNumber: 156,
    closedAt: "2024-12-07T20:00:00",
    operator: "Иванова М.А.",
    tradingPointId: "tp_001",
    status: "synchronized",
    totalRevenue: 12567000, // 125,670.00 руб
    totalVolume: 2850,      // 2,850 л
    receiptCount: 47,
    payments: {
      cash: 3770100,    // 37,701.00 руб
      cards: 8796900,   // 87,969.00 руб
      sbp: 0,
      fuelCards: 0,
      other: 0
    },
    fuelPositions: [
      {
        id: "fp_001",
        fuelType: "АИ-95",
        fuelCode: "AI95",
        tankNumber: "Резервуар №1",
        startBalance: 45000,
        received: 20000,
        dispensed: 15000,
        calculatedBalance: 50000,
        actualBalance: 49950,
        difference: -50, // недостача 50л
        meterStart: 125670,
        meterEnd: 140670,
        levelMm: 1850,
        waterMm: 5,
        temperature: -2,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 7850000, // 78,500.00 руб
        receiptCount: 23
      },
      {
        id: "fp_002", 
        fuelType: "АИ-92",
        fuelCode: "AI92",
        tankNumber: "Резервуар №2",
        startBalance: 38000,
        received: 25000,
        dispensed: 12000,
        calculatedBalance: 51000,
        actualBalance: 51020,
        difference: 20, // излишек 20л
        meterStart: 89450,
        meterEnd: 101450,
        levelMm: 2100,
        waterMm: 3,
        temperature: -1,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 4717000, // 47,170.00 руб
        receiptCount: 24
      }
    ],
    documents: [
      {
        id: "doc_001",
        type: "z-report",
        name: "Z-отчёт смена 156",
        createdAt: "2024-12-07T20:05:00",
        fileSize: 245600,
        status: "ready"
      },
      {
        id: "doc_002",
        type: "acceptance-act",
        name: "Акт приёмки-передачи",
        createdAt: "2024-12-07T20:10:00",
        status: "ready"
      }
    ]
  }
];

export default function ShiftReports() {
  const { selectedTradingPoint } = useSelection();
  const isMobile = useIsMobile();
  
  // Состояния
  const [shiftReports] = useState<ShiftReport[]>(mockShiftReports);
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Форматирование
  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('ru-RU', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + " ₽";
  };
  
  const formatVolume = (liters: number) => {
    return liters.toLocaleString('ru-RU') + " л";
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy HH:mm", { locale: ru });
  };

  const getStatusInfo = (status: ShiftReport['status']) => {
    switch (status) {
      case "synchronized": 
        return { 
          label: "Синхронизирован", 
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle
        };
      case "closed": 
        return { 
          label: "Закрыт", 
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: StopCircle
        };
      case "draft": 
        return { 
          label: "Черновик", 
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: Clock
        };
      case "archived": 
        return { 
          label: "Архив", 
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: FileX
        };
      default: 
        return { 
          label: "Неизвестно", 
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: FileText
        };
    }
  };

  // Фильтрация отчётов
  const filteredReports = useMemo(() => {
    return shiftReports.filter(report => {
      const matchesSearch = searchTerm === "" || 
        report.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.shiftNumber.toString().includes(searchTerm);
      
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [shiftReports, searchTerm, statusFilter]);

  const handleViewReport = (report: ShiftReport) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const handleExportReport = (report: ShiftReport) => {
    toast({
      title: "Экспорт отчёта",
      description: `Отчёт смены №${report.shiftNumber} экспортирован в PDF`,
    });
  };

  // Проверка выбора торговой точки
  if (!selectedTradingPoint) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Сменные отчёты</h1>
          </div>
          <div className="bg-slate-800 mb-6 w-full rounded-lg">
            <div className="px-4 md:px-6 py-4">
              <EmptyState 
                title="Выберите торговую точку" 
                description="Для просмотра сменных отчётов необходимо выбрать торговую точку из выпадающего списка выше"
                className="py-16"
              />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Сменные отчёты АЗС</h1>
          <p className="text-slate-400 mt-2">
            Отчёты по форме 25-НП для торговой точки: {selectedTradingPoint?.name}
          </p>
        </div>

        {/* Панель фильтров */}
        <div className="bg-slate-800 mb-6 w-full rounded-lg">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">История смен</h2>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              </div>
            </div>
            
            {/* Фильтры */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="search" className="text-sm text-slate-300">Поиск</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Номер смены, оператор..."
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status" className="text-sm text-slate-300">Статус</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="synchronized">Синхронизирован</SelectItem>
                    <SelectItem value="closed">Закрыт</SelectItem>
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="archived">Архив</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date" className="text-sm text-slate-300">Дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white",
                        !selectedDate && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full border-slate-600 text-white hover:bg-slate-700"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setFuelFilter("all");
                    setPaymentFilter("all");
                    setSelectedDate(undefined);
                  }}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Сброс
                </Button>
              </div>
            </div>

            {/* Итоговые карточки */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Общая выручка</p>
                      <p className="text-lg font-semibold text-white">
                        {formatPrice(filteredReports.reduce((sum, r) => sum + r.totalRevenue, 0))}
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Общий отпуск</p>
                      <p className="text-lg font-semibold text-white">
                        {formatVolume(filteredReports.reduce((sum, r) => sum + r.totalVolume, 0))}
                      </p>
                    </div>
                    <Fuel className="w-6 h-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Количество чеков</p>
                      <p className="text-lg font-semibold text-white">
                        {filteredReports.reduce((sum, r) => sum + r.receiptCount, 0)}
                      </p>
                    </div>
                    <Receipt className="w-6 h-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Количество смен</p>
                      <p className="text-lg font-semibold text-white">{filteredReports.length}</p>
                    </div>
                    <Clock className="w-6 h-6 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Таблица отчётов */}
          {filteredReports.length === 0 ? (
            <div className="px-4 md:px-6 pb-6">
              <EmptyState 
                title="Отчёты не найдены" 
                description="По заданным фильтрам не найдено ни одного сменного отчёта"
                className="py-16"
              />
            </div>
          ) : (
            <>
              {/* Десктоп: таблица */}
              <div className="hidden md:block w-full">
                <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-200 font-medium">СМЕНА</th>
                        <th className="px-4 py-3 text-left text-slate-200 font-medium">ЗАКРЫТА</th>
                        <th className="px-4 py-3 text-left text-slate-200 font-medium">ОПЕРАТОР</th>
                        <th className="px-4 py-3 text-left text-slate-200 font-medium">ВЫРУЧКА</th>
                        <th className="px-4 py-3 text-left text-slate-200 font-medium">ОТПУСК</th>
                        <th className="px-4 py-3 text-left text-slate-200 font-medium">СТАТУС</th>
                        <th className="px-4 py-3 text-right text-slate-200 font-medium">ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {filteredReports.map((report) => {
                        const statusInfo = getStatusInfo(report.status);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                          <tr key={report.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
                            <td className="px-4 py-4">
                              <div className="font-medium text-white">№{report.shiftNumber}</div>
                              <div className="text-xs text-slate-400">{report.receiptCount} чеков</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-white">{formatDate(report.closedAt)}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-white">{report.operator}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-white">{formatPrice(report.totalRevenue)}</div>
                              <div className="text-xs text-slate-400">
                                Нал: {formatPrice(report.payments.cash)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-white">{formatVolume(report.totalVolume)}</div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={`${statusInfo.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                  onClick={() => handleViewReport(report)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                  onClick={() => handleExportReport(report)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Мобайл: карточки */}
              <div className="md:hidden space-y-3 px-4 pb-6">
                {filteredReports.map((report) => {
                  const statusInfo = getStatusInfo(report.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={report.id}
                      className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-white text-base mb-1">Смена №{report.shiftNumber}</div>
                          <div className="text-sm text-slate-400 mb-1">{report.operator}</div>
                          <div className="text-sm text-slate-400">{formatDate(report.closedAt)}</div>
                        </div>
                        <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-slate-400">Выручка:</span>
                          <div className="text-white font-medium">{formatPrice(report.totalRevenue)}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Отпуск:</span>
                          <div className="text-white">{formatVolume(report.totalVolume)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 h-8 text-slate-400 hover:text-white"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          Просмотр
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleExportReport(report)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Детальный просмотр отчёта */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Сменный отчёт №{selectedReport?.shiftNumber} (форма 25-НП)
              </DialogTitle>
              <div className="text-sm text-slate-400">
                Оператор: {selectedReport?.operator} • Закрыта: {selectedReport && formatDate(selectedReport.closedAt)}
              </div>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-6">
                {/* Итоги смены */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-green-400" />
                        <div>
                          <p className="text-xs text-slate-400">Общая выручка</p>
                          <p className="text-lg font-semibold text-white">
                            {formatPrice(selectedReport.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Fuel className="w-8 h-8 text-blue-400" />
                        <div>
                          <p className="text-xs text-slate-400">Общий отпуск</p>
                          <p className="text-lg font-semibold text-white">
                            {formatVolume(selectedReport.totalVolume)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Receipt className="w-8 h-8 text-purple-400" />
                        <div>
                          <p className="text-xs text-slate-400">Количество чеков</p>
                          <p className="text-lg font-semibold text-white">
                            {selectedReport.receiptCount}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-orange-400" />
                        <div>
                          <p className="text-xs text-slate-400">Разности</p>
                          <p className="text-lg font-semibold text-white">
                            {selectedReport.fuelPositions.some(fp => fp.hasExcessError) ? "Есть" : "Нет"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Способы оплаты */}
                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Способы оплаты</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="flex items-center gap-3">
                        <Banknote className="w-6 h-6 text-green-400" />
                        <div>
                          <p className="text-xs text-slate-400">Наличные</p>
                          <p className="text-sm font-medium text-white">
                            {formatPrice(selectedReport.payments.cash)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-blue-400" />
                        <div>
                          <p className="text-xs text-slate-400">Банковские карты</p>
                          <p className="text-sm font-medium text-white">
                            {formatPrice(selectedReport.payments.cards)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-purple-400" />
                        <div>
                          <p className="text-xs text-slate-400">СБП</p>
                          <p className="text-sm font-medium text-white">
                            {formatPrice(selectedReport.payments.sbp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Fuel className="w-6 h-6 text-orange-400" />
                        <div>
                          <p className="text-xs text-slate-400">Топливные карты</p>
                          <p className="text-sm font-medium text-white">
                            {formatPrice(selectedReport.payments.fuelCards)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Receipt className="w-6 h-6 text-gray-400" />
                        <div>
                          <p className="text-xs text-slate-400">Прочие</p>
                          <p className="text-sm font-medium text-white">
                            {formatPrice(selectedReport.payments.other)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Журнал позиций по топливу */}
                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Gauge className="w-5 h-5" />
                      Журнал позиций по видам топлива (форма 25-НП)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-600">
                            <th className="px-3 py-2 text-left text-slate-300">Вид топлива</th>
                            <th className="px-3 py-2 text-left text-slate-300">Резервуар</th>
                            <th className="px-3 py-2 text-right text-slate-300">Остаток на начало (л)</th>
                            <th className="px-3 py-2 text-right text-slate-300">Поступило (л)</th>
                            <th className="px-3 py-2 text-right text-slate-300">Отпуск по ТРК (л)</th>
                            <th className="px-3 py-2 text-right text-slate-300">Расчётный остаток (л)</th>
                            <th className="px-3 py-2 text-right text-slate-300">Фактический остаток (л)</th>
                            <th className="px-3 py-2 text-right text-slate-300">Разница (л)</th>
                            <th className="px-3 py-2 text-right text-slate-300">Выручка</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.fuelPositions.map((position) => (
                            <tr 
                              key={position.id} 
                              className="border-b border-slate-600 hover:bg-slate-600 cursor-pointer"
                              onClick={() => {
                                toast({
                                  title: "Детали позиции",
                                  description: `${position.fuelType} - ${position.tankNumber}. Уровень: ${position.levelMm}мм, Температура: ${position.temperature}°C`
                                });
                              }}
                            >
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-white">{position.fuelType}</div>
                                  <Badge variant="outline" className="text-xs">
                                    {position.fuelCode}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-slate-300">{position.tankNumber}</td>
                              <td className="px-3 py-3 text-right text-slate-300">
                                {position.startBalance.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-300">
                                {position.received.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-300">
                                {position.dispensed.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-300">
                                {position.calculatedBalance.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-300">
                                {position.actualBalance.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className={`flex items-center gap-1 justify-end ${
                                  position.difference > 0 ? 'text-green-400' : 
                                  position.difference < 0 ? 'text-red-400' : 'text-slate-300'
                                }`}>
                                  {position.difference > 0 && <TrendingUp className="w-3 h-3" />}
                                  {position.difference < 0 && <TrendingDown className="w-3 h-3" />}
                                  {position.difference > 0 ? '+' : ''}{position.difference}
                                  {position.hasExcessError && <AlertTriangle className="w-3 h-3 text-orange-400" />}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-medium text-white">
                                {formatPrice(position.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Документы смены */}
                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Документы смены</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedReport.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-600 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <div>
                              <div className="text-white font-medium">{doc.name}</div>
                              <div className="text-xs text-slate-400">
                                {formatDate(doc.createdAt)}
                                {doc.fileSize && ` • ${(doc.fileSize / 1024).toFixed(0)} КБ`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={
                                doc.status === 'ready' ? 'bg-green-100 text-green-800' :
                                doc.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {doc.status === 'ready' ? 'Готов' : 
                               doc.status === 'error' ? 'Ошибка' : 'Черновик'}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Кнопки действий */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-600">
                  <Button 
                    variant="outline" 
                    onClick={() => setDetailDialogOpen(false)}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    Закрыть
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleExportReport(selectedReport)}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Экспорт PDF
                  </Button>
                  <Button 
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Печать
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}