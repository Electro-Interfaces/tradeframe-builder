import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  DollarSign, 
  Edit, 
  History, 
  CheckCircle, 
  Clock, 
  XCircle,
  Fuel 
} from "lucide-react";

// Mock data for fuel prices
const mockFuelPrices = [
  {
    id: 1,
    fuelType: "АИ-95",
    currentPriceKopecks: 5250, // 52.50 руб
    status: "active", // active, pending, error
    lastUpdated: "07.12.2024 14:30",
    updatedBy: "Иванов А.И."
  },
  {
    id: 2,
    fuelType: "АИ-92",
    currentPriceKopecks: 4950, // 49.50 руб
    status: "pending",
    lastUpdated: "07.12.2024 13:15",
    updatedBy: "Петров С.П."
  },
  {
    id: 3,
    fuelType: "ДТ",
    currentPriceKopecks: 5820, // 58.20 руб
    status: "error",
    lastUpdated: "07.12.2024 12:45",
    updatedBy: "Сидоров М.К."
  }
];

const mockPriceHistory = [
  {
    id: 1,
    date: "07.12.2024 14:30",
    fuelType: "АИ-95",
    oldPriceKopecks: 5200,
    newPriceKopecks: 5250,
    user: "Иванов А.И.",
    status: "Применено",
    reason: "Изменение закупочной цены"
  },
  {
    id: 2,
    date: "06.12.2024 16:20",
    fuelType: "АИ-92",
    oldPriceKopecks: 4900,
    newPriceKopecks: 4950,
    user: "Петров С.П.",
    status: "Применено",
    reason: "Корректировка маржи"
  },
  {
    id: 3,
    date: "05.12.2024 11:15",
    fuelType: "ДТ",
    oldPriceKopecks: 5750,
    newPriceKopecks: 5820,
    user: "Сидоров М.К.",
    status: "Ошибка",
    reason: "Изменение НДС"
  }
];

const priceFormSchema = z.object({
  newPrice: z.number().min(0.01, "Цена должна быть больше 0").max(999.99, "Цена слишком высокая"),
  reason: z.string().optional(),
});

type PriceFormData = z.infer<typeof priceFormSchema>;

export default function Prices() {
  const [selectedTradingPoint] = useState("АЗС-5 на Ленина"); // Mock selected point
  const [fuelPrices, setFuelPrices] = useState(mockFuelPrices);
  const [priceHistory, setPriceHistory] = useState(mockPriceHistory);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState<any>(null);
  const isMobile = useIsMobile();

  const form = useForm<PriceFormData>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: {
      newPrice: 0,
      reason: "",
    },
  });

  // Format price from kopecks to rubles
  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toFixed(2) + " ₽";
  };

  // Convert rubles to kopecks
  const rublesToKopecks = (rubles: number) => {
    return Math.round(rubles * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Актуальна";
      case "pending": return "Ожидает применения";
      case "error": return "Ошибка синхронизации";
      default: return "Неизвестно";
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClass = isMobile ? "h-3 w-3" : "h-4 w-4";
    switch (status) {
      case "active": return <CheckCircle className={`${iconClass} text-green-600`} />;
      case "pending": return <Clock className={`${iconClass} text-yellow-600`} />;
      case "error": return <XCircle className={`${iconClass} text-red-600`} />;
      default: return null;
    }
  };

  const handleEditPrice = (fuel: any) => {
    setSelectedFuel(fuel);
    form.setValue("newPrice", fuel.currentPriceKopecks / 100);
    form.setValue("reason", "");
    setEditDialogOpen(true);
  };

  const onSubmitPriceChange = (data: PriceFormData) => {
    if (!selectedFuel) return;

    const newPriceKopecks = rublesToKopecks(data.newPrice);
    const oldPriceKopecks = selectedFuel.currentPriceKopecks;

    // Update price and set status to pending
    setFuelPrices(prev => prev.map(fuel => 
      fuel.id === selectedFuel.id 
        ? { 
            ...fuel, 
            currentPriceKopecks: newPriceKopecks,
            status: "pending",
            lastUpdated: new Date().toLocaleString("ru-RU"),
            updatedBy: "Текущий пользователь"
          }
        : fuel
    ));

    // Add to history
    const newHistoryEntry = {
      id: priceHistory.length + 1,
      date: new Date().toLocaleString("ru-RU"),
      fuelType: selectedFuel.fuelType,
      oldPriceKopecks,
      newPriceKopecks,
      user: "Текущий пользователь",
      status: "Отправлено",
      reason: data.reason || "—"
    };

    setPriceHistory([newHistoryEntry, ...priceHistory]);

    // Simulate terminal response after 2-3 seconds
    setTimeout(() => {
      setFuelPrices(prev => prev.map(fuel => 
        fuel.id === selectedFuel.id 
          ? { ...fuel, status: "active" }
          : fuel
      ));

      // Update history status
      setPriceHistory(prev => prev.map(entry => 
        entry.id === newHistoryEntry.id 
          ? { ...entry, status: "Применено" }
          : entry
      ));
    }, 2500);

    setEditDialogOpen(false);
    form.reset();
    
    toast({
      title: "Команда на изменение цены успешно отправлена",
      description: `Новая цена для ${selectedFuel.fuelType}: ${formatPrice(newPriceKopecks)}`,
    });
  };

  // Empty state if no trading point selected
  if (!selectedTradingPoint) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-100 mb-2">
              Торговая точка не выбрана
            </h2>
            <p className="text-gray-400">
              Пожалуйста, выберите торговую точку для управления ценами
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
              Управление ценами на ТТ "{selectedTradingPoint}"
            </h1>
            <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
              Просмотр и изменение цен на топливо
            </p>
          </div>
          
          <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className={`${isMobile ? 'w-full' : ''}`}
              >
                <History className="w-4 h-4 mr-2" />
                {isMobile ? 'История изменений' : 'История изменений цен'}
              </Button>
            </DialogTrigger>
            <DialogContent className={`${isMobile ? 'w-full mx-4 max-h-[80vh] overflow-y-auto' : 'max-w-5xl max-h-[80vh] overflow-y-auto'}`}>
              <DialogHeader>
                <DialogTitle>История изменений цен</DialogTitle>
              </DialogHeader>
              <div className={isMobile ? 'overflow-x-auto' : ''}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Дата и время</TableHead>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Топливо</TableHead>
                      {!isMobile && <TableHead>Старая цена</TableHead>}
                      <TableHead className={isMobile ? 'text-xs' : ''}>Новая цена</TableHead>
                      {!isMobile && <TableHead>Пользователь</TableHead>}
                      <TableHead className={isMobile ? 'text-xs' : ''}>Статус</TableHead>
                      {!isMobile && <TableHead>Причина</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className={`font-medium ${isMobile ? 'text-xs' : ''}`}>
                          {entry.date}
                        </TableCell>
                        <TableCell className={isMobile ? 'text-xs' : ''}>
                          {entry.fuelType}
                          {isMobile && (
                            <div className="text-xs text-gray-400">
                              {formatPrice(entry.oldPriceKopecks)} → {formatPrice(entry.newPriceKopecks)}
                            </div>
                          )}
                        </TableCell>
                        {!isMobile && <TableCell>{formatPrice(entry.oldPriceKopecks)}</TableCell>}
                        <TableCell className={isMobile ? 'text-xs' : ''}>{formatPrice(entry.newPriceKopecks)}</TableCell>
                        {!isMobile && <TableCell>{entry.user}</TableCell>}
                        <TableCell className={isMobile ? 'text-xs' : ''}>
                          <Badge variant={entry.status === "Применено" ? "default" : "destructive"}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        {!isMobile && <TableCell>{entry.reason}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Prices Table */}
        {fuelPrices.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Fuel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Цены на топливо не найдены
                </h3>
                <p className="text-gray-400">
                  Для этой торговой точки не настроены цены на топливо
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className={isMobile ? 'pb-3' : ''}>
              <CardTitle className={`text-gray-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                Текущие цены на топливо
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                // Mobile: Card layout
                <div className="space-y-4">
                  {fuelPrices.map((fuel) => (
                    <Card key={fuel.id} className="bg-gray-700 border-gray-600">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-blue-400">{fuel.fuelType}</h3>
                            <p className="text-2xl font-bold text-gray-100">{formatPrice(fuel.currentPriceKopecks)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(fuel.status)}
                            <Badge className={`${getStatusColor(fuel.status)} text-xs`}>
                              {getStatusText(fuel.status)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
                          <span>Изменено: {fuel.lastUpdated}</span>
                        </div>
                        
                        <Button 
                          onClick={() => handleEditPrice(fuel)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Изменить цену
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
                      <TableHead>Вид топлива</TableHead>
                      <TableHead>Текущая цена</TableHead>
                      <TableHead>Статус цены</TableHead>
                      <TableHead>Последнее изменение</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelPrices.map((fuel) => (
                      <TableRow key={fuel.id}>
                        <TableCell className="font-medium text-blue-400">
                          {fuel.fuelType}
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          {formatPrice(fuel.currentPriceKopecks)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(fuel.status)}
                            <Badge className={getStatusColor(fuel.status)}>
                              {getStatusText(fuel.status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {fuel.lastUpdated}
                        </TableCell>
                        <TableCell>
                          <Button 
                            onClick={() => handleEditPrice(fuel)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Изменить цену
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

        {/* Edit Price Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-md'}`}>
            <DialogHeader>
              <DialogTitle>Изменение цены</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmitPriceChange)} className="space-y-4">
              <div>
                <Label htmlFor="fuelType">Вид топлива</Label>
                <Input
                  id="fuelType"
                  value={selectedFuel?.fuelType || ""}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              
              <div>
                <Label htmlFor="currentPrice">Текущая цена</Label>
                <Input
                  id="currentPrice"
                  value={selectedFuel ? formatPrice(selectedFuel.currentPriceKopecks) : ""}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              
              <div>
                <Label htmlFor="newPrice">Новая цена (в рублях) *</Label>
                <Input
                  id="newPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999.99"
                  {...form.register("newPrice", { valueAsNumber: true })}
                  placeholder="52.50"
                />
                {form.formState.errors.newPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.newPrice.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="reason">Причина изменения</Label>
                <Input
                  id="reason"
                  {...form.register("reason")}
                  placeholder="Например: Изменение закупочной цены"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Сохранить
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}