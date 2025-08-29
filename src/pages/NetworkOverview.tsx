import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Download, TrendingUp, CreditCard, Fuel, Users, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Mock data
const mockKpiData = {
  totalRevenue: 2847635,
  totalTransactions: 1247,
  totalFuelLiters: 45832,
  averageTicket: 2284,
  cashlessPercentage: 78.5
};

const mockFuelData = [
  { name: "АИ-95", value: 45, amount: 1281234, color: "#0ea5e9" },
  { name: "АИ-92", value: 35, amount: 996223, color: "#10b981" },
  { name: "ДТ", value: 20, amount: 570178, color: "#f59e0b" }
];

const mockPaymentData = [
  { name: "Банк. карты", value: 65, amount: 1850763, color: "#8b5cf6" },
  { name: "Наличные", value: 25, amount: 711909, color: "#ef4444" },
  { name: "Корп. карты", value: 10, amount: 284963, color: "#06b6d4" }
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

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function NetworkOverview() {
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-07");
  const [groupBy, setGroupBy] = useState("days");
  const [searchTransaction, setSearchTransaction] = useState("");

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
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Анализ Сети</h1>
          <p className="text-muted-foreground">
            Аналитика продаж и производительности торговой сети
          </p>
        </div>

        {/* Filters Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>
              Настройте период и параметры анализа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="dateFrom">Дата начала</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="dateTo">Дата окончания</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label>Группировка</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группировку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">По дням</SelectItem>
                    <SelectItem value="weeks">По неделям</SelectItem>
                    <SelectItem value="months">По месяцам</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleApplyFilters}>
                Применить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Общая выручка
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(mockKpiData.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                +12.5% к предыдущему периоду
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Транзакции
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockKpiData.totalTransactions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +8.1% к предыдущему периоду
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Топлива отпущено
              </CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockKpiData.totalFuelLiters.toLocaleString()} л
              </div>
              <p className="text-xs text-muted-foreground">
                +5.3% к предыдущему периоду
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Средний чек
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(mockKpiData.averageTicket)}
              </div>
              <p className="text-xs text-muted-foreground">
                +3.7% к предыдущему периоду
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Доля безналичных
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockKpiData.cashlessPercentage}%
              </div>
              <p className="text-xs text-muted-foreground">
                +2.1% к предыдущему периоду
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis Tabs */}
        <Tabs defaultValue="structure" className="space-y-4">
          <TabsList>
            <TabsTrigger value="structure">Структура продаж</TabsTrigger>
            <TabsTrigger value="trends">Динамика (Тренды)</TabsTrigger>
            <TabsTrigger value="stations">Сравнение торговых точек</TabsTrigger>
            <TabsTrigger value="transactions">Детализация транзакций</TabsTrigger>
          </TabsList>
          
          <TabsContent value="structure" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Структура продаж</h3>
              <Button variant="outline" onClick={() => handleExport("структуры продаж")}>
                <Download className="mr-2 h-4 w-4" />
                Экспорт в CSV
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Разрез по видам топлива</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={mockFuelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
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
              
              <Card>
                <CardHeader>
                  <CardTitle>Разрез по способам оплаты</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={mockPaymentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
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
            
            <Card>
              <CardHeader>
                <CardTitle>Детализация по структуре</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Категория</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Доля (%)</TableHead>
                      <TableHead>Кол-во транзакций</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockFuelData.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{item.value}%</TableCell>
                        <TableCell>{Math.round(mockKpiData.totalTransactions * item.value / 100)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Динамика (Тренды)</h3>
              <Button variant="outline" onClick={() => handleExport("трендов")}>
                <Download className="mr-2 h-4 w-4" />
                Экспорт в CSV
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Изменение выручки и транзакций во времени</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={mockTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      name="Выручка (руб.)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="transactions"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Транзакции (шт.)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Сравнение торговых точек</h3>
              <Button variant="outline" onClick={() => handleExport("сравнения точек")}>
                <Download className="mr-2 h-4 w-4" />
                Экспорт в CSV
              </Button>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Торговая точка</TableHead>
                      <TableHead>Выручка</TableHead>
                      <TableHead>Транзакции</TableHead>
                      <TableHead>Средний чек</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockStationData.map((station) => (
                      <TableRow key={station.id}>
                        <TableCell className="font-medium">{station.name}</TableCell>
                        <TableCell>{formatCurrency(station.revenue)}</TableCell>
                        <TableCell>{station.transactions}</TableCell>
                        <TableCell>{formatCurrency(station.averageTicket)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Детализация транзакций</h3>
              <Button variant="outline" onClick={() => handleExport("транзакций")}>
                <Download className="mr-2 h-4 w-4" />
                Экспорт в CSV
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Список транзакций</CardTitle>
                  <div className="w-72">
                    <Input
                      placeholder="Поиск по ID транзакции..."
                      value={searchTransaction}
                      onChange={(e) => setSearchTransaction(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID транзакции</TableHead>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Торговая точка</TableHead>
                      <TableHead>Вид топлива</TableHead>
                      <TableHead>Объем (л)</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Способ оплаты</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id}</TableCell>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.station}</TableCell>
                        <TableCell>{transaction.fuel}</TableCell>
                        <TableCell>{transaction.volume}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>{transaction.payment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Транзакции не найдены
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}