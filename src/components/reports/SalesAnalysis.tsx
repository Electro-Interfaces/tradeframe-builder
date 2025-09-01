import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Download, TrendingUp, CreditCard, Fuel, Users, DollarSign, Network, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock data
const mockKpiData = {
  totalRevenue: 2847635,
  totalTransactions: 1247,
  totalFuelLiters: 45832,
  averageTicket: 2284,
  cashlessPercentage: 78.5
};

const mockFuelData = [
  { name: "АИ-95", value: 45, amount: 1281234, color: "#60a5fa" },
  { name: "АИ-92", value: 35, amount: 996223, color: "#4ade80" },
  { name: "ДТ", value: 20, amount: 570178, color: "#9ca3af" }
];

const mockPaymentData = [
  { name: "Банк. карты", value: 65, amount: 1850763, color: "#3b82f6" },
  { name: "Наличные", value: 25, amount: 711909, color: "#10b981" },
  { name: "Корп. карты", value: 10, amount: 284963, color: "#6b7280" }
];

const mockTrendData = [
  { period: "01.12", revenue: 245000, transactions: 87 },
  { period: "02.12", revenue: 267000, transactions: 92 },
  { period: "03.12", revenue: 298000, transactions: 105 },
  { period: "04.12", revenue: 276000, transactions: 98 },
  { period: "05.12", revenue: 312000, transactions: 112 },
  { period: "06.12", revenue: 289000, transactions: 101 },
  { period: "07.12", revenue: 334000, transactions: 118 }
];

const mockStationData = [
  { id: 1, name: "АЗС-001 (Московское шоссе)", revenue: 567890, transactions: 234, averageTicket: 2427 },
  { id: 2, name: "АЗС-002 (Центральная)", revenue: 489123, transactions: 198, averageTicket: 2470 },
  { id: 3, name: "АЗС-003 (Промзона)", revenue: 654321, transactions: 287, averageTicket: 2279 },
  { id: 4, name: "АЗС-004 (Окружная)", revenue: 432567, transactions: 176, averageTicket: 2458 },
  { id: 5, name: "АЗС-005 (Заводская)", revenue: 703734, transactions: 352, averageTicket: 1999 }
];

const mockTransactionData = [
  { id: "TXN-001234", date: "07.12.2024 14:23", station: "АЗС-001", fuel: "АИ-95", volume: 45.2, amount: 2716, payment: "Банк. карта" },
  { id: "TXN-001235", date: "07.12.2024 14:19", station: "АЗС-002", fuel: "ДТ", volume: 67.8, amount: 3458, payment: "Наличные" },
  { id: "TXN-001236", date: "07.12.2024 14:15", station: "АЗС-001", fuel: "АИ-92", volume: 38.5, amount: 2002, payment: "Корп. карта" },
  { id: "TXN-001237", date: "07.12.2024 14:12", station: "АЗС-003", fuel: "АИ-95", volume: 52.1, amount: 3126, payment: "Банк. карта" },
  { id: "TXN-001238", date: "07.12.2024 14:08", station: "АЗС-004", fuel: "АИ-92", volume: 41.3, amount: 2148, payment: "Банк. карта" }
];

interface SalesAnalysisProps {
  selectedNetwork: string | null;
  selectedTradingPoint: string | null;
}

export function SalesAnalysis({ selectedNetwork, selectedTradingPoint }: SalesAnalysisProps) {
  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-07");
  const [groupBy, setGroupBy] = useState("days");
  const [searchTransaction, setSearchTransaction] = useState("");
  const isMobile = useIsMobile();

  const handleApplyFilters = () => {
    toast({
      title: "Фильтры применены",
      description: `Период: ${dateFrom} - ${dateTo}, группировка: ${groupBy}`,
    });
  };

  const handleExport = (type: string) => {
    toast({
      title: "Экспорт данных",
      description: `Экспорт данных "${type}" в CSV файл инициирован`,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const filteredTransactions = mockTransactionData.filter(transaction =>
    transaction.id.toLowerCase().includes(searchTransaction.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <div className="bg-slate-800 border border-slate-600 rounded-lg">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">⚙️</span>
            </div>
            <h2 className="text-lg font-semibold text-white">Фильтры анализа</h2>
            <div className="text-sm text-slate-400">
              {isTradingPointSelected ? 'Для торговой точки' : 'Для сети'}
            </div>
          </div>
          
          {/* Фильтры */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
            {/* Дата начала */}
            <div>
              <Label htmlFor="dateFrom" className="text-sm text-slate-400 mb-2 block">Дата начала</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            {/* Дата окончания */}
            <div>
              <Label htmlFor="dateTo" className="text-sm text-slate-400 mb-2 block">Дата окончания</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            {/* Группировка */}
            <div>
              <Label className="text-sm text-slate-400 mb-2 block">Группировка</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите группировку" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">По дням</SelectItem>
                  <SelectItem value="weeks">По неделям</SelectItem>
                  <SelectItem value="months">По месяцам</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Применить */}
            <div>
              <Label className="text-sm text-slate-400 mb-2 block">Применить</Label>
              <Button 
                onClick={handleApplyFilters}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Применить
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards as Individual Tiles */}
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-5'}`}>
        {/* Общая выручка */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{isTradingPointSelected ? 'Выручка точки' : 'Общая выручка'}</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(isTradingPointSelected ? mockKpiData.totalRevenue / 5 : mockKpiData.totalRevenue)}
            </p>
            <p className="text-xs text-green-400">
              +12.5% к предыдущему периоду
            </p>
          </div>
        </div>

        {/* Транзакции */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Транзакции</p>
            <p className="text-3xl font-bold text-white">
              {(isTradingPointSelected ? Math.floor(mockKpiData.totalTransactions / 5) : mockKpiData.totalTransactions).toLocaleString()}
            </p>
            <p className="text-xs text-blue-400">
              +8.1% к предыдущему периоду
            </p>
          </div>
        </div>

        {/* Топлива отпущено */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Fuel className="h-8 w-8 text-orange-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Топлива отпущено</p>
            <p className="text-3xl font-bold text-white">
              {(isTradingPointSelected ? Math.floor(mockKpiData.totalFuelLiters / 5) : mockKpiData.totalFuelLiters).toLocaleString()} л
            </p>
            <p className="text-xs text-orange-400">
              +5.3% к предыдущему периоду
            </p>
          </div>
        </div>

        {/* Средний чек */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Средний чек</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(mockKpiData.averageTicket)}
            </p>
            <p className="text-xs text-purple-400">
              +3.7% к предыдущему периоду
            </p>
          </div>
        </div>

        {/* Доля безналичных */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="h-8 w-8 text-cyan-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Доля безналичных</p>
            <p className="text-3xl font-bold text-white">
              {mockKpiData.cashlessPercentage}%
            </p>
            <p className="text-xs text-cyan-400">
              +2.1% к предыдущему периоду
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="structure" className="space-y-4">
        {isMobile ? (
          <TabsList className="grid w-full grid-cols-2 h-auto gap-2 bg-slate-700 border border-slate-600 p-1">
            <TabsTrigger 
              value="structure" 
              className="text-white text-sm py-3 px-2 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
            >
              📊 Структура
            </TabsTrigger>
            <TabsTrigger 
              value="trends"
              className="text-white text-sm py-3 px-2 font-medium data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
            >
              📈 Тренды
            </TabsTrigger>
            {isNetworkOnly && (
              <>
                <TabsTrigger 
                  value="stations"
                  className="text-white text-sm py-3 px-2 font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
                >
                  🏪 Сравнение ТТ
                </TabsTrigger>
                <TabsTrigger 
                  value="transactions"
                  className="text-white text-sm py-3 px-2 font-medium data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
                >
                  🧾 Транзакции
                </TabsTrigger>
              </>
            )}
          </TabsList>
        ) : (
          <TabsList className="bg-slate-700 border border-slate-600 h-auto p-1">
            <TabsTrigger 
              value="structure" 
              className="text-white font-medium px-6 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
            >
              📊 Структура продаж
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="text-white font-medium px-6 py-3 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
            >
              📈 Динамика (Тренды)
            </TabsTrigger>
            {isNetworkOnly && (
              <TabsTrigger 
                value="stations" 
                className="text-white font-medium px-6 py-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
              >
                🏪 Сравнение торговых точек
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="transactions" 
              className="text-white font-medium px-6 py-3 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-600"
            >
              🧾 Детализация транзакций
            </TabsTrigger>
          </TabsList>
        )}
        
        <TabsContent value="structure" className="space-y-4">
          <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'}`}>
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Структура продаж</h3>
            <Button 
              variant="outline" 
              onClick={() => handleExport("структуры продаж")}
              className={`transition-colors duration-200 flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
            >
              <Download className="w-4 h-4" />
              Экспорт в CSV
            </Button>
          </div>
          
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {/* Разрез по видам топлива */}
            <Card className="bg-slate-800 border border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Fuel className="h-5 w-5 text-orange-400" />
                  Разрез по видам топлива
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={mockFuelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => isMobile ? `${value}%` : `${name}: ${value}%`}
                      outerRadius={isMobile ? 60 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockFuelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Разрез по способам оплаты */}
            <Card className="bg-slate-800 border border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  Разрез по способам оплаты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={mockPaymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => isMobile ? `${value}%` : `${name}: ${value}%`}
                      outerRadius={isMobile ? 60 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockPaymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'}`}>
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
              Динамика продаж {isTradingPointSelected ? 'торговой точки' : 'по сети'}
            </h3>
            <Button 
              variant="outline" 
              onClick={() => handleExport("динамики продаж")}
              className={`transition-colors duration-200 flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
            >
              <Download className="w-4 h-4" />
              Экспорт в CSV
            </Button>
          </div>
          
          <Card className="bg-slate-800 border border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-green-400" />
                График продаж
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Выручка (руб)" />
                  <Line type="monotone" dataKey="transactions" stroke="#10b981" name="Количество транзакций" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {isNetworkOnly && (
          <TabsContent value="stations" className="space-y-4">
            <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'}`}>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Сравнение торговых точек</h3>
              <Button 
                variant="outline" 
                onClick={() => handleExport("сравнения точек")}
                className={`transition-colors duration-200 flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <Download className="w-4 h-4" />
                Экспорт в CSV
              </Button>
            </div>
            
            <Card className="bg-slate-800 border border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Network className="h-5 w-5 text-purple-400" />
                  Сравнение торговых точек
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Торговая точка</TableHead>
                        <TableHead className="text-right">Выручка</TableHead>
                        <TableHead className="text-right">Транзакции</TableHead>
                        <TableHead className="text-right">Средний чек</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockStationData.map((station) => (
                        <TableRow key={station.id}>
                          <TableCell className="font-medium">{station.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(station.revenue)}</TableCell>
                          <TableCell className="text-right">{station.transactions}</TableCell>
                          <TableCell className="text-right">{formatCurrency(station.averageTicket)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="transactions" className="space-y-4">
          <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'}`}>
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
              Детализация транзакций {isTradingPointSelected ? 'торговой точки' : 'по сети'}
            </h3>
            <div className={`${isMobile ? 'w-full' : 'flex gap-2'}`}>
              <Input
                placeholder="Поиск по ID транзакции..."
                value={searchTransaction}
                onChange={(e) => setSearchTransaction(e.target.value)}
                className={isMobile ? 'mb-2' : 'w-64'}
              />
              <Button 
                variant="outline" 
                onClick={() => handleExport("транзакций")}
                className={`transition-colors duration-200 flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <Download className="w-4 h-4" />
                Экспорт
              </Button>
            </div>
          </div>
          
          <Card className="bg-slate-800 border border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-orange-400" />
                Детализация транзакций
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID транзакции</TableHead>
                      <TableHead>Дата и время</TableHead>
                      {isNetworkOnly && <TableHead>Торговая точка</TableHead>}
                      <TableHead>Вид топлива</TableHead>
                      <TableHead className="text-right">Объем (л)</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead>Способ оплаты</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                        <TableCell>{transaction.date}</TableCell>
                        {isNetworkOnly && <TableCell>{transaction.station}</TableCell>}
                        <TableCell>{transaction.fuel}</TableCell>
                        <TableCell className="text-right">{transaction.volume}</TableCell>
                        <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>{transaction.payment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}