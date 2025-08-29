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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  History, 
  CheckCircle, 
  Clock, 
  XCircle,
  Fuel,
  CalendarIcon,
  Eye
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
    appliedDate: "07.12.2024 14:35",
    user: "Иванов А.И.",
    changesCount: 2,
    changes: [
      { fuelType: "АИ-95", oldPriceKopecks: 5200, newPriceKopecks: 5250 },
      { fuelType: "АИ-92", oldPriceKopecks: 4900, newPriceKopecks: 4950 }
    ],
    status: "Применено",
    reason: "Изменение закупочных цен"
  },
  {
    id: 2,
    date: "06.12.2024 16:20",
    appliedDate: "06.12.2024 16:25",
    user: "Петров С.П.",
    changesCount: 1,
    changes: [
      { fuelType: "ДТ", oldPriceKopecks: 5750, newPriceKopecks: 5820 }
    ],
    status: "Применено",
    reason: "Корректировка маржи"
  },
  {
    id: 3,
    date: "05.12.2024 11:15",
    appliedDate: "05.12.2024 11:20",
    user: "Сидоров М.К.",
    changesCount: 1,
    changes: [
      { fuelType: "АИ-95", oldPriceKopecks: 5100, newPriceKopecks: 5200 }
    ],
    status: "Ошибка",
    reason: "Изменение НДС"
  }
];

const batchPriceSchema = z.object({
  appliedDate: z.date({ required_error: "Необходимо указать дату применения" }),
  reason: z.string().optional(),
});

type BatchPriceData = z.infer<typeof batchPriceSchema>;

export default function Prices() {
  const [selectedTradingPoint] = useState("АЗС-5 на Ленина"); // Mock selected point
  const [fuelPrices, setFuelPrices] = useState(mockFuelPrices);
  const [priceHistory, setPriceHistory] = useState(mockPriceHistory);
  const [newPrices, setNewPrices] = useState<{[key: number]: number}>({});
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const isMobile = useIsMobile();

  const form = useForm<BatchPriceData>({
    resolver: zodResolver(batchPriceSchema),
    defaultValues: {
      appliedDate: new Date(),
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
      case "active": return "bg-success/20 text-success border-success/30";
      case "pending": return "bg-warning/20 text-warning border-warning/30";
      case "error": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
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
      case "active": return <CheckCircle className={`${iconClass} text-success`} />;
      case "pending": return <Clock className={`${iconClass} text-warning`} />;
      case "error": return <XCircle className={`${iconClass} text-destructive`} />;
      default: return null;
    }
  };

  const handlePriceChange = (fuelId: number, newPrice: number) => {
    setNewPrices(prev => ({
      ...prev,
      [fuelId]: newPrice
    }));
  };

  const getChangedPrices = () => {
    return Object.entries(newPrices)
      .map(([fuelId, newPrice]) => {
        const fuel = fuelPrices.find(f => f.id === parseInt(fuelId));
        const newPriceKopecks = rublesToKopecks(newPrice);
        return fuel && newPriceKopecks !== fuel.currentPriceKopecks ? {
          fuel,
          oldPriceKopecks: fuel.currentPriceKopecks,
          newPriceKopecks
        } : null;
      })
      .filter(Boolean);
  };

  const hasChanges = () => getChangedPrices().length > 0;

  const onSubmitBatchPriceChange = (data: BatchPriceData) => {
    const changes = getChangedPrices();
    if (changes.length === 0) return;

    // Update prices and set status to pending
    setFuelPrices(prev => prev.map(fuel => {
      const change = changes.find(c => c.fuel.id === fuel.id);
      return change ? {
        ...fuel,
        currentPriceKopecks: change.newPriceKopecks,
        status: "pending",
        lastUpdated: new Date().toLocaleString("ru-RU"),
        updatedBy: "Текущий пользователь"
      } : fuel;
    }));

    // Add to history
    const newHistoryEntry = {
      id: priceHistory.length + 1,
      date: new Date().toLocaleString("ru-RU"),
      appliedDate: format(data.appliedDate, "dd.MM.yyyy HH:mm", { locale: ru }),
      user: "Текущий пользователь",
      changesCount: changes.length,
      changes: changes.map(c => ({
        fuelType: c.fuel.fuelType,
        oldPriceKopecks: c.oldPriceKopecks,
        newPriceKopecks: c.newPriceKopecks
      })),
      status: "Отправлено",
      reason: data.reason || "—"
    };

    setPriceHistory([newHistoryEntry, ...priceHistory]);

    // Simulate terminal response after 2-3 seconds
    setTimeout(() => {
      setFuelPrices(prev => prev.map(fuel => {
        const hasChange = changes.some(c => c.fuel.id === fuel.id);
        return hasChange ? { ...fuel, status: "active" } : fuel;
      }));

      // Update history status
      setPriceHistory(prev => prev.map(entry => 
        entry.id === newHistoryEntry.id 
          ? { ...entry, status: "Применено" }
          : entry
      ));
    }, 2500);

    setBatchDialogOpen(false);
    setNewPrices({});
    form.reset();
    
    toast({
      title: "Команды на изменение цен успешно отправлены",
      description: `Обновлено цен: ${changes.length}`,
    });
  };

  const openHistoryDetails = (item: any) => {
    setSelectedHistoryItem(item);
    setHistoryDetailsOpen(true);
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
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
              Управление ценами на ТТ "{selectedTradingPoint}"
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
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
                {isMobile ? 'Журнал изменений' : 'Журнал изменений цен'}
              </Button>
            </DialogTrigger>
            <DialogContent className={`${isMobile ? 'w-full mx-4 max-h-[80vh] overflow-y-auto' : 'max-w-4xl max-h-[80vh] overflow-y-auto'}`}>
              <DialogHeader>
                <DialogTitle>Журнал изменений цен</DialogTitle>
              </DialogHeader>
              <div className={isMobile ? 'overflow-x-auto' : ''}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Дата применения</TableHead>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Пользователь</TableHead>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Кол-во изменений</TableHead>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Статус</TableHead>
                      <TableHead className={isMobile ? 'text-xs' : ''}>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className={`font-medium ${isMobile ? 'text-xs' : ''}`}>
                          {entry.appliedDate}
                        </TableCell>
                        <TableCell className={isMobile ? 'text-xs' : ''}>
                          {entry.user}
                        </TableCell>
                        <TableCell className={isMobile ? 'text-xs' : ''}>
                          {entry.changesCount}
                        </TableCell>
                        <TableCell className={isMobile ? 'text-xs' : ''}>
                          <Badge variant={entry.status === "Применено" ? "default" : "destructive"}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={isMobile ? 'text-xs' : ''}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openHistoryDetails(entry)}
                          >
                            <Eye className="w-4 h-4" />
                            {!isMobile && <span className="ml-1">Детали</span>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Prices Grid */}
        {fuelPrices.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Fuel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Цены на топливо не найдены
                </h3>
                <p className="text-muted-foreground">
                  Для этой торговой точки не настроены цены на топливо
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {fuelPrices.map((fuel) => (
                <Card key={fuel.id} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary">{fuel.fuelType}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-4xl font-bold text-foreground">
                      {formatPrice(fuel.currentPriceKopecks)}
                    </div>
                    
                    <div>
                      <Label htmlFor={`price-${fuel.id}`} className="text-sm text-muted-foreground">
                        Новая цена (₽)
                      </Label>
                      <Input
                        id={`price-${fuel.id}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="999.99"
                        placeholder={`${(fuel.currentPriceKopecks / 100).toFixed(2)}`}
                        value={newPrices[fuel.id] || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            handlePriceChange(fuel.id, value);
                          } else if (e.target.value === '') {
                            setNewPrices(prev => {
                              const updated = { ...prev };
                              delete updated[fuel.id];
                              return updated;
                            });
                          }
                        }}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fuel.status)}
                      <Badge className={getStatusColor(fuel.status)}>
                        {getStatusText(fuel.status)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Изменено: {fuel.lastUpdated}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Apply Changes Button */}
            {hasChanges() && (
              <div className={`sticky bottom-4 z-10 ${isMobile ? '' : 'flex justify-center'}`}>
                <Button 
                  onClick={() => setBatchDialogOpen(true)}
                  size="lg"
                  className={`bg-primary hover:bg-primary/90 ${isMobile ? 'w-full' : 'px-8'}`}
                >
                  Применить новые цены ({getChangedPrices().length})
                </Button>
              </div>
            )}
          </>
        )}

        {/* Batch Price Change Dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-2xl'}`}>
            <DialogHeader>
              <DialogTitle>Применение изменений цен</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmitBatchPriceChange)} className="space-y-6">
              {/* Changes Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Изменения:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Топливо</TableHead>
                        <TableHead>Было</TableHead>
                        <TableHead>Стало</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getChangedPrices().map((change, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{change.fuel.fuelType}</TableCell>
                          <TableCell>{formatPrice(change.oldPriceKopecks)}</TableCell>
                          <TableCell className="font-bold text-primary">{formatPrice(change.newPriceKopecks)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Applied Date */}
              <div>
                <Label htmlFor="appliedDate">Дата и время применения *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !form.watch("appliedDate") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("appliedDate") ? format(form.watch("appliedDate"), "dd.MM.yyyy HH:mm", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("appliedDate")}
                      onSelect={(date) => date && form.setValue("appliedDate", date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.appliedDate && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.appliedDate.message}
                  </p>
                )}
              </div>
              
              {/* Reason */}
              <div>
                <Label htmlFor="reason">Причина изменения (опционально)</Label>
                <Input
                  id="reason"
                  {...form.register("reason")}
                  placeholder="Укажите причину изменения цен"
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)} className="flex-1">
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Применить изменения
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* History Details Dialog */}
        <Dialog open={historyDetailsOpen} onOpenChange={setHistoryDetailsOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-2xl'}`}>
            <DialogHeader>
              <DialogTitle>Детали изменений</DialogTitle>
            </DialogHeader>
            {selectedHistoryItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Дата создания:</span>
                    <div className="font-medium">{selectedHistoryItem.date}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата применения:</span>
                    <div className="font-medium">{selectedHistoryItem.appliedDate}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Пользователь:</span>
                    <div className="font-medium">{selectedHistoryItem.user}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Статус:</span>
                    <Badge variant={selectedHistoryItem.status === "Применено" ? "default" : "destructive"}>
                      {selectedHistoryItem.status}
                    </Badge>
                  </div>
                </div>
                
                {selectedHistoryItem.reason && selectedHistoryItem.reason !== "—" && (
                  <div>
                    <span className="text-muted-foreground">Причина:</span>
                    <div className="font-medium">{selectedHistoryItem.reason}</div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Изменения цен:</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Топливо</TableHead>
                          <TableHead>Старая цена</TableHead>
                          <TableHead>Новая цена</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedHistoryItem.changes.map((change: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{change.fuelType}</TableCell>
                            <TableCell>{formatPrice(change.oldPriceKopecks)}</TableCell>
                            <TableCell className="font-bold text-primary">{formatPrice(change.newPriceKopecks)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}