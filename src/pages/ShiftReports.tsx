import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
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
import { shiftReportsService, ShiftReport, FuelPosition, ShiftDocument } from "@/services/shiftReportsService";
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
import { HelpButton } from "@/components/help/HelpButton";


export default function ShiftReports() {
  const { selectedTradingPoint } = useSelection();
  const isMobile = useIsMobile();
  
  // Состояния
  const [shiftReports, setShiftReports] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Загрузка данных сменных отчетов
  useEffect(() => {
    const loadShiftReports = async () => {
      try {
        setLoading(true);
        const data = selectedTradingPoint?.id 
          ? await shiftReportsService.getShiftReportsByTradingPoint(selectedTradingPoint.id)
          : await shiftReportsService.getAllShiftReports();
        setShiftReports(data);
      } catch (error) {
        console.error('Ошибка загрузки сменных отчетов:', error);
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить сменные отчеты",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (selectedTradingPoint) {
      loadShiftReports();
    }
  }, [selectedTradingPoint]);

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
          color: "bg-green-500/10 text-green-400 border-green-500",
          icon: CheckCircle
        };
      case "closed": 
        return { 
          label: "Закрыт", 
          color: "bg-blue-500/10 text-blue-400 border-blue-500",
          icon: StopCircle
        };
      case "draft": 
        return { 
          label: "Черновик", 
          color: "bg-yellow-500/10 text-yellow-400 border-yellow-500",
          icon: Clock
        };
      case "archived": 
        return { 
          label: "Архив", 
          color: "bg-slate-500/10 text-slate-400 border-slate-500",
          icon: FileX
        };
      default: 
        return { 
          label: "Неизвестно", 
          color: "bg-slate-500/10 text-slate-400 border-slate-500",
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

  const handleExportReport = async (report: ShiftReport) => {
    try {
      // В будущем здесь будет реальный экспорт
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Экспорт отчёта",
        description: `Отчёт смены №${report.shiftNumber} экспортирован в PDF`,
      });
    } catch (error) {
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать отчёт",
        variant: "destructive",
      });
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Сменные отчёты АЗС</h1>
              <p className="text-slate-400 mt-2">
                Отчёты по форме 25-НП для торговой точки: {selectedTradingPoint?.name}
              </p>
              {loading && (
                <p className="text-slate-500 text-sm">Загрузка сменных отчетов...</p>
              )}
            </div>
            <HelpButton route="/point/shift-reports" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Панель фильтров */}
        <div className="bg-slate-800 mb-6 w-full rounded-lg border border-slate-700">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">История смен</h2>
                <div className="text-sm text-slate-400">
                  Всего: {filteredReports.length} из {shiftReports.length}
                </div>
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
                  <table className="w-full text-sm min-w-full table-fixed">
                    <thead className="bg-slate-700/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>СМЕНА</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ЗАКРЫТА</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ОПЕРАТОР</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ВЫРУЧКА</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '10%'}}>ОТПУСК</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>СТАТУС</th>
                        <th className="px-6 py-4 text-right text-slate-100 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {filteredReports.map((report) => {
                        const statusInfo = getStatusInfo(report.status);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                          <tr key={report.id} className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 md:px-6 py-4">
                              <div className="font-medium text-white text-base">№{report.shiftNumber}</div>
                              <div className="text-sm text-slate-400">{report.receiptCount} чеков</div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="text-white">{report.closedAt ? formatDate(report.closedAt) : '—'}</div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-white">{report.operator}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="font-medium text-white">{formatPrice(report.totalRevenue)}</div>
                              <div className="text-sm text-slate-400">
                                Нал: {formatPrice(report.payments.cash)}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="text-white">{formatVolume(report.totalVolume)}</div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <Badge className={`${statusInfo.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
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
              <div className="md:hidden space-y-3 px-6 pb-6">
                {filteredReports.map((report) => {
                  const statusInfo = getStatusInfo(report.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={report.id}
                      className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-base mb-1">Смена №{report.shiftNumber}</div>
                          <div className="text-sm text-slate-400 mb-1">{report.operator}</div>
                          <div className="text-sm text-slate-400">{report.closedAt ? formatDate(report.closedAt) : formatDate(report.openedAt)}</div>
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
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 h-8 text-slate-400 hover:text-white"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            Просмотр
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                            onClick={() => handleExportReport(report)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
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
                Оператор: {selectedReport?.operator} • {selectedReport?.closedAt ? `Закрыта: ${formatDate(selectedReport.closedAt)}` : `Открыта: ${selectedReport && formatDate(selectedReport.openedAt)}`}
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