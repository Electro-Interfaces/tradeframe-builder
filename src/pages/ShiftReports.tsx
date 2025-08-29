import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  FileText, 
  Eye, 
  Printer, 
  StopCircle, 
  Clock,
  DollarSign,
  User,
  Calendar
} from "lucide-react";

// Mock data for shift reports
const mockShiftReports = [
  {
    id: 1,
    shiftNumber: 156,
    startDate: "07.12.2024 08:00",
    endDate: "07.12.2024 20:00", 
    operator: "Иванова М.А.",
    totalRevenue: 125670,
    status: "Синхронизирован с 1С",
    fuelSummary: [
      { fuelType: "АИ-95", startAmount: 45000, received: 20000, sold: 15000, endAmount: 50000 },
      { fuelType: "АИ-92", startAmount: 38000, received: 25000, sold: 12000, endAmount: 51000 },
      { fuelType: "ДТ", startAmount: 42000, received: 0, sold: 8000, endAmount: 34000 }
    ],
    paymentSummary: {
      cash: 37701,
      cards: 87969
    },
    transactions: [
      { id: 1, time: "08:15", fuelType: "АИ-95", amount: 2500, volume: 50, payment: "Карта" },
      { id: 2, time: "08:32", fuelType: "АИ-92", amount: 2100, volume: 45, payment: "Наличные" },
      { id: 3, time: "09:10", fuelType: "ДТ", amount: 3200, volume: 55, payment: "Карта" }
    ]
  },
  {
    id: 2,
    shiftNumber: 155,
    startDate: "06.12.2024 08:00",
    endDate: "06.12.2024 20:00",
    operator: "Петров С.И.",
    totalRevenue: 98450,
    status: "Закрыт",
    fuelSummary: [
      { fuelType: "АИ-95", startAmount: 50000, received: 0, sold: 5000, endAmount: 45000 },
      { fuelType: "АИ-92", startAmount: 48000, received: 15000, sold: 10000, endAmount: 38000 },
      { fuelType: "ДТ", startAmount: 40000, received: 10000, sold: 8000, endAmount: 42000 }
    ],
    paymentSummary: {
      cash: 29535,
      cards: 68915
    },
    transactions: [
      { id: 1, time: "08:25", fuelType: "АИ-92", amount: 2000, volume: 42, payment: "Наличные" },
      { id: 2, time: "09:15", fuelType: "АИ-95", amount: 2750, volume: 52, payment: "Карта" }
    ]
  },
  {
    id: 3,
    shiftNumber: 154,
    startDate: "05.12.2024 08:00",
    endDate: "05.12.2024 20:00",
    operator: "Сидорова Е.В.",
    totalRevenue: 142300,
    status: "Синхронизирован с 1С",
    fuelSummary: [
      { fuelType: "АИ-95", startAmount: 42000, received: 25000, sold: 17000, endAmount: 50000 },
      { fuelType: "АИ-92", startAmount: 35000, received: 20000, sold: 15000, endAmount: 40000 },
      { fuelType: "ДТ", startAmount: 38000, received: 15000, sold: 13000, endAmount: 40000 }
    ],
    paymentSummary: {
      cash: 42690,
      cards: 99610
    },
    transactions: []
  }
];

export default function ShiftReports() {
  const [selectedTradingPoint] = useState("АЗС-5 на Ленина"); // Mock selected point
  const [shiftReports, setShiftReports] = useState(mockShiftReports);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const isMobile = useIsMobile();

  // Format price from kopecks to rubles
  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toFixed(2) + " ₽";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Синхронизирован с 1С": return "bg-green-100 text-green-800 border-green-200";
      case "Закрыт": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const handleCloseShift = () => {
    const newShift = {
      id: shiftReports.length + 1,
      shiftNumber: Math.max(...shiftReports.map(r => r.shiftNumber)) + 1,
      startDate: "07.12.2024 20:00",
      endDate: new Date().toLocaleString("ru-RU"),
      operator: "Текущий пользователь",
      totalRevenue: 87500,
      status: "Закрыт",
      fuelSummary: [
        { fuelType: "АИ-95", startAmount: 50000, received: 0, sold: 8000, endAmount: 42000 },
        { fuelType: "АИ-92", startAmount: 51000, received: 0, sold: 6000, endAmount: 45000 },
        { fuelType: "ДТ", startAmount: 34000, received: 0, sold: 4000, endAmount: 30000 }
      ],
      paymentSummary: {
        cash: 26250,
        cards: 61250
      },
      transactions: []
    };

    setShiftReports([newShift, ...shiftReports]);
    setCloseShiftDialogOpen(false);
    
    toast({
      title: "Смена успешно закрыта",
      description: `Смена №${newShift.shiftNumber} закрыта. Выручка: ${formatPrice(newShift.totalRevenue)}`,
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Empty state if no trading point selected
  if (!selectedTradingPoint) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-100 mb-2">
              Торговая точка не выбрана
            </h2>
            <p className="text-gray-400">
              Пожалуйста, выберите торговую точку для просмотра сменных отчетов
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-100`}>
              Сменные отчеты на ТТ "{selectedTradingPoint}"
            </h1>
            <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
              История сменных отчетов и управление сменами
            </p>
          </div>
          
          <Dialog open={closeShiftDialogOpen} onOpenChange={setCloseShiftDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className={`bg-red-600 hover:bg-red-700 ${isMobile ? 'w-full' : ''}`}
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Закрыть текущую смену
              </Button>
            </DialogTrigger>
            <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-md'}`}>
              <DialogHeader>
                <DialogTitle>Подтверждение закрытия смены</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Вы уверены, что хотите закрыть текущую смену? Это действие необратимо.
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setCloseShiftDialogOpen(false)}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleCloseShift}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Закрыть смену
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Shift Reports */}
        {shiftReports.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Сменные отчеты не найдены
                </h3>
                <p className="text-gray-400">
                  Для этой торговой точки еще нет закрытых смен
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className={isMobile ? 'pb-3' : ''}>
              <CardTitle className={`text-gray-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                История сменных отчетов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                // Mobile: Card layout
                <div className="space-y-4">
                  {shiftReports.map((report) => (
                    <Card key={report.id} className="bg-gray-700 border-gray-600">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-blue-400">
                              Смена №{report.shiftNumber}
                            </h3>
                            <p className="text-2xl font-bold text-gray-100">
                              {formatPrice(report.totalRevenue)}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(report.status)} text-xs`}>
                            {report.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-400 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>Начало: {report.startDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Окончание: {report.endDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>Оператор: {report.operator}</span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => handleViewReport(report)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Подробнее
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // Desktop: Table layout
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номер смены</TableHead>
                      <TableHead>Дата и время начала</TableHead>
                      <TableHead>Дата и время окончания</TableHead>
                      <TableHead>Оператор</TableHead>
                      <TableHead>Итоговая выручка</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium text-blue-400">
                          №{report.shiftNumber}
                        </TableCell>
                        <TableCell>{report.startDate}</TableCell>
                        <TableCell>{report.endDate}</TableCell>
                        <TableCell>{report.operator}</TableCell>
                        <TableCell className="font-bold text-lg">
                          {formatPrice(report.totalRevenue)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            onClick={() => handleViewReport(report)}
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detailed Report Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-2 max-h-[90vh] overflow-y-auto' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}`}>
            <DialogHeader className="print:hidden">
              <div className="flex justify-between items-center">
                <DialogTitle>Детальный отчет по смене</DialogTitle>
                <Button onClick={handlePrintReport} size="sm" variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Печать
                </Button>
              </div>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-6 print:text-black">
                {/* Report Header */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold">Сменный отчет №{selectedReport.shiftNumber}</h2>
                  <p className="text-gray-600">ТТ "{selectedTradingPoint}"</p>
                  <p className="text-sm text-gray-500">
                    {selectedReport.startDate} - {selectedReport.endDate}
                  </p>
                  <p className="text-sm text-gray-500">Оператор: {selectedReport.operator}</p>
                </div>

                {/* Revenue Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Сводка по выручке</h3>
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-sm text-gray-500">Общая выручка</p>
                            <p className="text-xl font-bold">{formatPrice(selectedReport.totalRevenue)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-4">
                        <div>
                          <p className="text-sm text-gray-500">Наличные</p>
                          <p className="text-lg font-semibold">{formatPrice(selectedReport.paymentSummary.cash)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-4">
                        <div>
                          <p className="text-sm text-gray-500">Безналичные</p>
                          <p className="text-lg font-semibold">{formatPrice(selectedReport.paymentSummary.cards)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Fuel Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Сводка по топливу</h3>
                  <div className={isMobile ? 'overflow-x-auto' : ''}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={isMobile ? 'text-xs' : ''}>Топливо</TableHead>
                          <TableHead className={isMobile ? 'text-xs' : ''}>Начало (л)</TableHead>
                          <TableHead className={isMobile ? 'text-xs' : ''}>Приход (л)</TableHead>
                          <TableHead className={isMobile ? 'text-xs' : ''}>Расход (л)</TableHead>
                          <TableHead className={isMobile ? 'text-xs' : ''}>Остаток (л)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReport.fuelSummary.map((fuel: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className={`font-medium ${isMobile ? 'text-xs' : ''}`}>
                              {fuel.fuelType}
                            </TableCell>
                            <TableCell className={isMobile ? 'text-xs' : ''}>
                              {fuel.startAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className={isMobile ? 'text-xs' : ''}>
                              {fuel.received.toLocaleString()}
                            </TableCell>
                            <TableCell className={isMobile ? 'text-xs' : ''}>
                              {fuel.sold.toLocaleString()}
                            </TableCell>
                            <TableCell className={isMobile ? 'text-xs' : ''}>
                              {fuel.endAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Transactions */}
                {selectedReport.transactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Транзакции смены</h3>
                    <div className={isMobile ? 'overflow-x-auto' : ''}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Время</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Топливо</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Объем (л)</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Сумма</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Оплата</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedReport.transactions.map((transaction: any) => (
                            <TableRow key={transaction.id}>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{transaction.time}</TableCell>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{transaction.fuelType}</TableCell>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{transaction.volume}</TableCell>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{formatPrice(transaction.amount)}</TableCell>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{transaction.payment}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          @page {
            margin: 2cm;
            size: A4;
          }
          
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
        }
      `}</style>
    </MainLayout>
  );
}