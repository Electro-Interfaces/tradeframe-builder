import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Gauge, 
  Plus, 
  FileText, 
  Thermometer, 
  Droplets, 
  CheckCircle, 
  XCircle,
  Fuel,
  Bell,
  Settings,
  Calendar,
  Truck,
  AlertTriangle,
  Download,
  Upload,
  Filter,
  MoreHorizontal
} from "lucide-react";

// Enhanced Mock data with new fields
const mockTanks = [
  {
    id: 1,
    name: "Резервуар №1",
    fuelType: "АИ-95",
    currentLevelLiters: 25000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 15,
    waterLevelMm: 5,
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    lastCalibration: "15.12.2024 14:30",
    linkedPumps: [
      { id: 1, name: "ТРК-1" },
      { id: 2, name: "ТРК-3" }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 10,
      notifications: {
        critical: true,
        minimum: true,
        temperature: true,
        water: true
      }
    }
  },
  {
    id: 2,
    name: "Резервуар №2", 
    fuelType: "АИ-92",
    currentLevelLiters: 8000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 14,
    waterLevelMm: 3,
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "error" }
    ],
    lastCalibration: "12.12.2024 09:15",
    linkedPumps: [
      { id: 4, name: "ТРК-2" }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 10,
      notifications: {
        critical: true,
        minimum: true,
        temperature: false,
        water: true
      }
    }
  },
  {
    id: 3,
    name: "Резервуар №3",
    fuelType: "ДТ",
    currentLevelLiters: 3000,
    capacityLiters: 40000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 16,
    waterLevelMm: 2,
    sensors: [
      { name: "Уровень", status: "error" },
      { name: "Температура", status: "ok" }
    ],
    lastCalibration: "10.12.2024 16:45",
    linkedPumps: [
      { id: 5, name: "ТРК-4" },
      { id: 6, name: "ТРК-5" },
      { id: 7, name: "ТРК-6" }
    ],
    notifications: {
      enabled: false,
      drainAlerts: false,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -15, max: 50 },
      maxWaterLevel: 15,
      notifications: {
        critical: true,
        minimum: true,
        temperature: true,
        water: false
      }
    }
  }
];

// Tank Events Mock Data
const mockTankEvents = [
  {
    id: 1,
    tankId: 1,
    type: "drain_finished",
    date: "16.12.2024 10:30",
    status: "confirmed",
    details: "Слив 20000л завершен",
    source: "sensor"
  },
  {
    id: 2,
    tankId: 1,
    type: "level_below",
    date: "15.12.2024 18:45",
    status: "requires_check",
    details: "Уровень ниже минимального",
    source: "sensor"
  },
  {
    id: 3,
    tankId: 2,
    type: "drain_started",
    date: "14.12.2024 09:15",
    status: "confirmed",
    details: "Начат слив топлива",
    source: "mobile_app"
  },
  {
    id: 4,
    tankId: 3,
    type: "temperature_alert",
    date: "13.12.2024 16:20",
    status: "requires_check",
    details: "Превышена критическая температура",
    source: "sensor"
  }
];

// Enhanced Drains Mock Data
const mockDrains = [
  {
    id: 1,
    date: "16.12.2024 10:30",
    tankId: 1,
    tankName: "Резервуар №1",
    fuelType: "АИ-95",
    volume: 20000,
    truckNumber: "А123БВ77",
    driverName: "Иванов А.И.",
    reason: "Плановая поставка",
    source: "sensor",
    status: "confirmed",
    comment: "Автоматическое подтверждение датчиком"
  },
  {
    id: 2,
    date: "15.12.2024 14:15",
    tankId: 2,
    tankName: "Резервуар №2",
    fuelType: "АИ-92",
    volume: 25000,
    truckNumber: "В456ГД77",
    driverName: "Петров С.П.",
    reason: "Восполнение запасов",
    source: "mobile_app",
    status: "pending",
    comment: "Ожидает подтверждения менеджера"
  },
  {
    id: 3,
    date: "14.12.2024 09:20",
    tankId: 3,
    tankName: "Резервуар №3",
    fuelType: "ДТ",
    volume: 15000,
    truckNumber: "С789ЕЖ77",
    driverName: "Сидоров В.В.",
    reason: "Экстренная поставка",
    source: "api",
    status: "error",
    comment: "Расхождение по объему"
  }
];

// Calibrations Mock Data
const mockCalibrations = [
  {
    id: 1,
    tankId: 1,
    date: "15.12.2024 14:30",
    operator: "Техник Иванов И.И.",
    filename: "calibration_tank1_151224.xlsx",
    status: "completed"
  },
  {
    id: 2,
    tankId: 2,
    date: "12.12.2024 09:15", 
    operator: "Техник Петров П.П.",
    filename: "calibration_tank2_121224.csv",
    status: "completed"
  },
  {
    id: 3,
    tankId: 3,
    date: "10.12.2024 16:45",
    operator: "Техник Сидоров С.С.",
    filename: "calibration_tank3_101224.xlsx",
    status: "completed"
  }
];

const mockDrainageLog = [
  {
    id: 1,
    date: "07.12.2024 09:30",
    tankName: "Резервуар №1",
    fuelType: "АИ-95",
    volume: 20000,
    truckNumber: "А123БВ77",
    driverName: "Иванов А.И.",
    status: "Завершено"
  },
  {
    id: 2,
    date: "06.12.2024 14:15",
    tankName: "Резервуар №2",
    fuelType: "АИ-92", 
    volume: 25000,
    truckNumber: "В456ГД77",
    driverName: "Петров С.П.",
    status: "Завершено"
  }
];

// Vertical Progress Component with threshold markers
const TankProgressIndicator = ({ percentage, minLevel, criticalLevel, isMobile }: {
  percentage: number;
  minLevel: number;
  criticalLevel: number;
  isMobile: boolean;
}) => {
  const getProgressColor = (percent: number) => {
    if (percent > minLevel) return "#3b82f6"; // Blue
    if (percent >= criticalLevel) return "#f59e0b"; // Yellow 
    return "#ef4444"; // Red
  };

  const progressColor = getProgressColor(percentage);

  return (
    <TooltipProvider>
      <div className="relative flex justify-center">
        {/* Vertical Background bar - full height to match text block */}
        <div className="w-8 h-48 bg-slate-600 rounded-full overflow-hidden relative">
          {/* Progress fill from bottom */}
          <div 
            className="absolute bottom-0 w-full rounded-full transition-all duration-300"
            style={{
              height: `${percentage}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        
        {/* Threshold markers - positioned on the right side */}
        <div className="absolute right-0 top-0 h-48 flex flex-col justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="absolute w-3 h-0.5 bg-slate-300 cursor-help z-10 -right-1"
                style={{ bottom: `${minLevel}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Минимальный уровень ({minLevel}%)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="absolute w-3 h-0.5 bg-red-400 cursor-help z-10 -right-1"
                style={{ bottom: `${criticalLevel}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Критический уровень ({criticalLevel}%)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

// API Mock Functions
const mockAPI = {
  getTanks: () => Promise.resolve(mockTanks),
  getTank: (id: number) => Promise.resolve(mockTanks.find(t => t.id === id)),
  getTankEvents: (id: number, limit = 5) => 
    Promise.resolve(mockTankEvents.filter(e => e.tankId === id).slice(0, limit)),
  getDrains: () => Promise.resolve(mockDrains),
  getTankCalibrations: (id: number) => 
    Promise.resolve(mockCalibrations.filter(c => c.tankId === id)),
  uploadCalibration: (tankId: number, formData: FormData) => 
    Promise.resolve({ success: true, id: Date.now() }),
  updateTankSettings: (id: number, settings: any) => 
    Promise.resolve({ success: true })
};

// User role mock
const userRole = "manager"; // "driver", "manager", "admin"

// Form Schemas
const drainageFormSchema = z.object({
  tankId: z.string().min(1, "Выберите резервуар"),
  volume: z.number().min(1, "Введите объем больше 0"),
  truckNumber: z.string().optional(),
  driverName: z.string().optional(),
});

const tankSettingsSchema = z.object({
  minLevelPercent: z.number().min(0).max(100),
  criticalLevelPercent: z.number().min(0).max(100),
  criticalTemp: z.object({
    min: z.number(),
    max: z.number()
  }),
  maxWaterLevel: z.number().min(0),
  notifications: z.object({
    critical: z.boolean(),
    minimum: z.boolean(),
    temperature: z.boolean(),
    water: z.boolean()
  })
});

type DrainageFormData = z.infer<typeof drainageFormSchema>;
type TankSettingsData = z.infer<typeof tankSettingsSchema>;

export default function Tanks() {
  const [selectedTradingPoint] = useState("АЗС-5 на Ленина"); // Mock selected point
  const [drainageDialogOpen, setDrainageDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [tankEvents, setTankEvents] = useState<{[key: number]: any[]}>({});
  const [drainageLog, setDrainageLog] = useState(mockDrainageLog);
  const [expandedDrains, setExpandedDrains] = useState(mockDrains);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const form = useForm<DrainageFormData>({
    resolver: zodResolver(drainageFormSchema),
    defaultValues: {
      tankId: "",
      volume: 0,
      truckNumber: "",
      driverName: "",
    },
  });

  const settingsForm = useForm<TankSettingsData>({
    resolver: zodResolver(tankSettingsSchema)
  });

  // Load tank events on component mount
  React.useEffect(() => {
    const loadTankEvents = async () => {
      const events: {[key: number]: any[]} = {};
      for (const tank of mockTanks) {
        events[tank.id] = await mockAPI.getTankEvents(tank.id);
      }
      setTankEvents(events);
    };
    loadTankEvents();
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage > 20) return "hsl(var(--primary))"; // Blue
    if (percentage >= 10) return "hsl(45, 93%, 47%)"; // Yellow
    return "hsl(0, 84%, 60%)"; // Red
  };

  const getPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };


  const onSubmitDrainage = (data: DrainageFormData) => {
    const selectedTank = mockTanks.find(tank => tank.id.toString() === data.tankId);
    if (selectedTank) {
      const newLogEntry = {
        id: drainageLog.length + 1,
        date: new Date().toLocaleString("ru-RU"),
        tankName: selectedTank.name,
        fuelType: selectedTank.fuelType,
        volume: data.volume,
        truckNumber: data.truckNumber || "—",
        driverName: data.driverName || "—",
        status: "Завершено"
      };
      
      setDrainageLog([newLogEntry, ...drainageLog]);
      setDrainageDialogOpen(false);
      form.reset();
      
      toast({
        title: "Операция слива успешно зарегистрирована",
        description: `${data.volume} л ${selectedTank.fuelType} в ${selectedTank.name}`,
      });
    }
  };

  const handleTankSettings = (tank: any) => {
    setSelectedTank(tank);
    settingsForm.reset({
      minLevelPercent: tank.minLevelPercent,
      criticalLevelPercent: tank.criticalLevelPercent,
      criticalTemp: tank.thresholds.criticalTemp,
      maxWaterLevel: tank.thresholds.maxWaterLevel,
      notifications: tank.thresholds.notifications
    });
    setSettingsDialogOpen(true);
  };

  const handleCalibration = (tank: any) => {
    setSelectedTank(tank);
    setCalibrationDialogOpen(true);
  };

  const onSubmitSettings = async (data: TankSettingsData) => {
    if (!selectedTank) return;
    
    setLoading(true);
    try {
      await mockAPI.updateTankSettings(selectedTank.id, data);
      
      // Update local state
      const tankIndex = mockTanks.findIndex(t => t.id === selectedTank.id);
      if (tankIndex >= 0) {
        mockTanks[tankIndex] = {
          ...mockTanks[tankIndex],
          minLevelPercent: data.minLevelPercent,
          criticalLevelPercent: data.criticalLevelPercent,
          thresholds: {
            ...mockTanks[tankIndex].thresholds,
            criticalTemp: data.criticalTemp,
            maxWaterLevel: data.maxWaterLevel,
            notifications: data.notifications
          }
        };
      }
      
      toast({
        title: "Настройки сохранены",
        description: `Параметры резервуара ${selectedTank.name} обновлены`,
      });
      
      setSettingsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "requires_check": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "drain_finished": return <Droplets className="h-4 w-4" />;
      case "drain_started": return <Truck className="h-4 w-4" />;
      case "level_below": return <AlertTriangle className="h-4 w-4" />;
      case "temperature_alert": return <Thermometer className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const canEdit = userRole === "manager" || userRole === "admin";

  // Empty state if no trading point selected
  if (!selectedTradingPoint) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Gauge className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Торговая точка не выбрана
            </h2>
            <p className="text-slate-400">
              Пожалуйста, выберите торговую точку для просмотра данных о резервуарах
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        {/* Заголовок страницы */}
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Резервуары на ТТ "{selectedTradingPoint}"</h1>
          <p className="text-slate-400 mt-2">Мониторинг запасов топлива и управление операциями</p>
        </div>

        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⛽</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Резервуары</h2>
                <div className="text-sm text-slate-400">
                  Активных резервуаров: {mockTanks.length}
                </div>
              </div>
              <div className="flex gap-3">
                <Dialog open={drainageDialogOpen} onOpenChange={setDrainageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0">
                      <Plus className="w-4 h-4 mr-2" />
                      Зарегистрировать слив
                    </Button>
                  </DialogTrigger>
              <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-md'}`}>
                <DialogHeader>
                  <DialogTitle>Регистрация слива топлива</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmitDrainage)} className="space-y-4">
                  <div>
                    <Label htmlFor="tankId">Резервуар</Label>
                    <Select 
                      value={form.watch("tankId")} 
                      onValueChange={(value) => form.setValue("tankId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите резервуар" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id.toString()}>
                            {tank.name} - {tank.fuelType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.tankId && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.tankId.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="volume">Объем по накладной (литры) *</Label>
                    <Input
                      id="volume"
                      type="number"
                      {...form.register("volume", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {form.formState.errors.volume && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.volume.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="truckNumber">Номер бензовоза</Label>
                    <Input
                      id="truckNumber"
                      {...form.register("truckNumber")}
                      placeholder="А123БВ77"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="driverName">Имя водителя</Label>
                    <Input
                      id="driverName"
                      {...form.register("driverName")}
                      placeholder="Иванов А.И."
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDrainageDialogOpen(false)}
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
            
                <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="border-slate-600 text-white hover:bg-slate-700 px-4 py-2 rounded-lg font-medium flex-shrink-0"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Журнал сливов
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={`${isMobile ? 'w-full mx-4 max-h-[80vh] overflow-y-auto' : 'max-w-4xl max-h-[80vh] overflow-y-auto'}`}>
                <DialogHeader>
                  <DialogTitle>Журнал операций слива</DialogTitle>
                </DialogHeader>
                <div className={isMobile ? 'overflow-x-auto' : ''}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={isMobile ? 'text-xs' : ''}>Дата и время</TableHead>
                        <TableHead className={isMobile ? 'text-xs' : ''}>Резервуар</TableHead>
                        {!isMobile && <TableHead>Вид топлива</TableHead>}
                        <TableHead className={isMobile ? 'text-xs' : ''}>Объем (л)</TableHead>
                        {!isMobile && <TableHead>Номер бензовоза</TableHead>}
                        <TableHead className={isMobile ? 'text-xs' : ''}>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drainageLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className={`font-medium ${isMobile ? 'text-xs' : ''}`}>
                            {entry.date}
                          </TableCell>
                          <TableCell className={isMobile ? 'text-xs' : ''}>
                            {entry.tankName}
                            {isMobile && (
                              <div className="text-xs text-gray-400">{entry.fuelType}</div>
                            )}
                          </TableCell>
                          {!isMobile && <TableCell>{entry.fuelType}</TableCell>}
                          <TableCell className={isMobile ? 'text-xs' : ''}>{entry.volume.toLocaleString()}</TableCell>
                          {!isMobile && <TableCell>{entry.truckNumber}</TableCell>}
                          <TableCell className={isMobile ? 'text-xs' : ''}>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {entry.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Tanks Grid */}
        {mockTanks.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Fuel className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Резервуары не найдены
                </h3>
                <p className="text-slate-400">
                  Для этой торговой точки не добавлено ни одного резервуара. 
                  Добавьте их в разделе "Оборудование"
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {mockTanks.map((tank) => {
              const percentage = getPercentage(tank.currentLevelLiters, tank.capacityLiters);
              
              return (
                <Card key={tank.id} className="bg-slate-800 border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-6">
                    {/* Header - separate lines */}
                    <div className="mb-4 space-y-2">
                      {/* Tank Name - first line */}
                      <div className="flex items-center gap-3">
                        <Gauge className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <div className="text-white font-semibold text-lg">
                          {tank.name}
                        </div>
                      </div>
                      
                      {/* Fuel Type and Percentage - second line */}
                      <div className="flex items-center justify-between">
                        <div className="text-blue-400 font-bold text-lg ml-9">
                          {tank.fuelType}
                        </div>
                        <div className={`text-2xl font-bold ${
                          percentage > tank.minLevelPercent ? 'text-blue-400' :
                          percentage >= tank.criticalLevelPercent ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {percentage}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Main content with vertical progress bar on left and data on right */}
                    <div className="flex gap-6">
                      {/* Vertical Progress Bar - moved to left */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <TankProgressIndicator 
                          percentage={percentage} 
                          minLevel={tank.minLevelPercent}
                          criticalLevel={tank.criticalLevelPercent}
                          isMobile={isMobile}
                        />
                        <div className="text-xs text-slate-300 font-medium text-center leading-tight">
                          {tank.currentLevelLiters.toLocaleString()}<br />/ {tank.capacityLiters.toLocaleString()} л
                        </div>
                      </div>
                      
                      {/* Tank Data and Sensors - vertical column on right */}
                      <div className="flex-1 flex flex-col space-y-4">
                        {/* Temperature */}
                        <div className="flex items-center gap-3">
                          <Thermometer className="h-5 w-5 text-orange-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-slate-400 text-sm">Температура</div>
                            <div className="font-semibold text-white">{tank.temperature} °C</div>
                          </div>
                        </div>
                        
                        {/* Water Level */}
                        <div className="flex items-center gap-3">
                          <Droplets className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-slate-400 text-sm">Подтоварная вода</div>
                            <div className="font-semibold text-white">{tank.waterLevelMm} мм</div>
                          </div>
                        </div>
                        
                        {/* Sensors */}
                        {tank.sensors.map((sensor, index) => (
                          <TooltipProvider key={index}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 cursor-help">
                                  {sensor.status === "ok" ? (
                                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <div className="text-slate-400 text-sm">{sensor.name}</div>
                                    <div className={`font-semibold ${
                                      sensor.status === "ok" ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {sensor.status === "ok" ? 'ОК' : 'Ошибка'}
                                    </div>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Датчик {sensor.name.toLowerCase()}: {sensor.status === "ok" ? "Работает нормально" : "Ошибка"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}

                        {/* Last Calibration */}
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-slate-400 text-sm">Последняя калибровка</div>
                            <div className="font-semibold text-white">{tank.lastCalibration}</div>
                          </div>
                        </div>

                        {/* Linked Pumps */}
                        <div className="flex items-start gap-3">
                          <Fuel className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-slate-400 text-sm">Привязанные ТРК ({tank.linkedPumps.length})</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tank.linkedPumps.map((pump) => (
                                <span 
                                  key={pump.id} 
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                >
                                  {pump.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Controls Row */}
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        {/* Notification Bell */}
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 w-8 p-0 ${
                                    tank.notifications.enabled 
                                      ? 'text-yellow-400 hover:text-yellow-300' 
                                      : 'text-slate-500 hover:text-slate-400'
                                  }`}
                                >
                                  <Bell className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Уведомления {tank.notifications.enabled ? 'включены' : 'отключены'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Recent Events Count */}
                          {tankEvents[tank.id] && tankEvents[tank.id].length > 0 && (
                            <span className="text-xs text-slate-400">
                              События: {tankEvents[tank.id].length}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCalibration(tank)}
                            className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                            disabled={!canEdit}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Калибровка
                          </Button>
                          
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTankSettings(tank)}
                              className="text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Настройки
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Recent Events */}
                      {tankEvents[tank.id] && tankEvents[tank.id].length > 0 && (
                        <div className="mt-4">
                          <div className="text-slate-400 text-sm mb-2">Последние события</div>
                          <div className="space-y-2">
                            {tankEvents[tank.id].slice(0, 3).map((event) => (
                              <div 
                                key={event.id} 
                                className="flex items-center gap-2 p-2 rounded border border-slate-600 bg-slate-700/30"
                              >
                                <div className={`p-1 rounded ${getEventStatusColor(event.status)}`}>
                                  {getEventTypeIcon(event.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-slate-400">{event.date}</div>
                                  <div className="text-sm text-white truncate">{event.details}</div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs border ${getEventStatusColor(event.status)}`}>
                                  {event.status === 'confirmed' ? '✓' : event.status === 'requires_check' ? '!' : '✗'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}