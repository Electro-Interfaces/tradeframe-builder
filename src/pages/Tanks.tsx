import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth, usePermissions } from "@/contexts/AuthContext";
import { useSelection } from "@/context/SelectionContext";
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
  Filter
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
    status: "completed",
    calibrationType: "full",
    notes: "Плановая калибровка после модернизации датчиков"
  },
  {
    id: 2,
    tankId: 2,
    date: "12.12.2024 09:15", 
    operator: "Техник Петров П.П.",
    filename: "calibration_tank2_121224.csv",
    status: "completed",
    calibrationType: "check",
    notes: ""
  },
  {
    id: 3,
    tankId: 3,
    date: "10.12.2024 16:45",
    operator: "Техник Сидоров С.С.",
    filename: "calibration_tank3_101224.xlsx",
    status: "completed",
    calibrationType: "full",
    notes: "Калибровка после ремонта резервуара"
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
        {/* Vertical Background bar - square shape, full height to match text block */}
        <div className="w-8 h-48 bg-slate-600 overflow-hidden relative border border-slate-500 rounded-sm">
          {/* Progress fill from bottom - square shape */}
          <div 
            className="absolute bottom-0 w-full transition-all duration-300 border-t-2"
            style={{
              height: `${percentage}%`,
              backgroundColor: progressColor,
              borderTopColor: progressColor === "#3b82f6" ? "#1e40af" : progressColor === "#f59e0b" ? "#d97706" : "#dc2626"
            }}
          />
        </div>
        
        {/* Threshold markers - positioned on the right side with enhanced visibility */}
        <div className="absolute right-0 top-0 h-48 flex flex-col justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="absolute w-5 h-1.5 bg-yellow-400 cursor-help z-10 -right-1 border border-yellow-300 shadow-lg rounded-sm"
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
                className="absolute w-5 h-1.5 bg-red-500 cursor-help z-10 -right-1 border border-red-400 shadow-lg rounded-sm"
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

// User role будет получена из AuthContext

// Form Schemas
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

const calibrationSchema = z.object({
  file: z.any().refine((file) => file && file[0] && (file[0].type === 'text/csv' || file[0].type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), {
    message: "Пожалуйста, загрузите файл в формате CSV или XLSX"
  }),
  operator: z.string().min(2, "Введите имя оператора"),
  calibrationType: z.enum(["full", "check"], {
    errorMap: () => ({ message: "Выберите тип калибровки" })
  }),
  notes: z.string().optional()
});

type TankSettingsData = z.infer<typeof tankSettingsSchema>;
type CalibrationData = z.infer<typeof calibrationSchema>;

export default function Tanks() {
  const { user, getUserRole } = useAuth();
  const { canManageTanks, canCalibrate, canApproveDrains } = usePermissions();
  const { selectedTradingPoint } = useSelection();
  
  // Получаем название торговой точки для отображения
  const getTradingPointName = (pointId: string) => {
    const points = [
      { value: "point1", label: "АЗС №001 - Центральная" },
      { value: "point2", label: "АЗС №002 - Северная" },
      { value: "point3", label: "АЗС №003 - Южная" },
    ];
    return points.find(p => p.value === pointId)?.label || pointId;
  };
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [tankEvents, setTankEvents] = useState<{[key: number]: any[]}>({});
  const [drainageLog, setDrainageLog] = useState(mockDrainageLog);
  const [expandedDrains, setExpandedDrains] = useState(mockDrains);
  const [loading, setLoading] = useState(false);
  const [calibrationHistory, setCalibrationHistory] = useState<{[key: number]: any[]}>({});
  const [filters, setFilters] = useState({
    period: '',
    tankId: '',
    status: '',
    source: '',
    searchTerm: ''
  });
  const isMobile = useIsMobile();


  const settingsForm = useForm<TankSettingsData>({
    resolver: zodResolver(tankSettingsSchema)
  });

  const calibrationForm = useForm<CalibrationData>({
    resolver: zodResolver(calibrationSchema)
  });

  // Load tank events and calibration history on component mount
  useEffect(() => {
    const loadTankData = async () => {
      const events: {[key: number]: any[]} = {};
      const calibrations: {[key: number]: any[]} = {};
      
      for (const tank of mockTanks) {
        events[tank.id] = await mockAPI.getTankEvents(tank.id);
        calibrations[tank.id] = await mockAPI.getTankCalibrations(tank.id);
      }
      
      setTankEvents(events);
      setCalibrationHistory(calibrations);
    };
    loadTankData();
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage > 20) return "hsl(var(--primary))"; // Blue
    if (percentage >= 10) return "hsl(45, 93%, 47%)"; // Yellow
    return "hsl(0, 84%, 60%)"; // Red
  };

  const getPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
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
    calibrationForm.reset({
      operator: "",
      calibrationType: "full",
      notes: ""
    });
    setCalibrationDialogOpen(true);
  };

  const onSubmitCalibration = async (data: CalibrationData) => {
    if (!selectedTank) return;
    
    setLoading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      if (data.file && data.file[0]) {
        formData.append('file', data.file[0]);
      }
      formData.append('operator', data.operator);
      formData.append('calibrationType', data.calibrationType);
      formData.append('notes', data.notes || '');
      formData.append('tankId', selectedTank.id.toString());
      
      const result = await mockAPI.uploadCalibration(selectedTank.id, formData);
      
      if (result.success) {
        // Create new calibration record
        const newCalibration = {
          id: result.id,
          tankId: selectedTank.id,
          date: new Date().toLocaleString('ru-RU'),
          operator: data.operator,
          filename: data.file[0].name,
          status: 'completed',
          calibrationType: data.calibrationType,
          notes: data.notes
        };
        
        // Update calibration history
        setCalibrationHistory(prev => ({
          ...prev,
          [selectedTank.id]: [newCalibration, ...(prev[selectedTank.id] || [])]
        }));
        
        // Update tank's last calibration
        const tankIndex = mockTanks.findIndex(t => t.id === selectedTank.id);
        if (tankIndex >= 0) {
          mockTanks[tankIndex].lastCalibration = newCalibration.date;
        }
        
        toast({
          title: "Калибровка загружена",
          description: `Файл ${data.file[0].name} успешно обработан для ${selectedTank.name}`,
        });
        
        setCalibrationDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файл калибровки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  // Права доступа получаем из AuthContext
  const canEdit = canManageTanks();
  const canPerformCalibration = canCalibrate();
  const canApproveDrainOperations = canApproveDrains();

  // Empty state if no trading point selected
  if (!selectedTradingPoint) {
    return (
      <MainLayout fullWidth={true}>
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
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">
            Резервуары{selectedTradingPoint ? ` на ${getTradingPointName(selectedTradingPoint)}` : ""}
          </h1>
          <p className="text-slate-400 mt-2">Мониторинг запасов топлива и управление операциями</p>
        </div>

        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-4 md:px-6 py-4">
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
                  <DialogContent className="max-w-7xl max-h-[85vh]">
                    <DialogHeader className="pb-4 border-b border-slate-700">
                      <DialogTitle className="text-xl font-semibold text-white">
                        Журнал операций слива ({expandedDrains.length} записей)
                      </DialogTitle>
                    </DialogHeader>
                    
                    {/* Search bar */}
                    <div className="mb-4">
                      <Input 
                        placeholder="Поиск по водителю, номеру или резервуару..."
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>

                    {expandedDrains.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        Записи не найдены
                      </div>
                    ) : (
                      <>
                        {/* Таблица на всю ширину */}
                        <div className="w-full">
                          <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                            <table className="w-full text-sm min-w-full table-fixed">
                              <thead className="bg-slate-700">
                                <tr>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '12%'}}>ДАТА/ВРЕМЯ</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>РЕЗЕРВУАР</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>ОБЪЕМ (Л)</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '12%'}}>ВОДИТЕЛЬ</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>ТРАНСПОРТ</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '13%'}}>ПРИЧИНА</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>ИСТОЧНИК</th>
                                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>СТАТУС</th>
                                  <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '8%'}}>ДЕЙСТВИЯ</th>
                                </tr>
                              </thead>
                              <tbody className="bg-slate-800">
                                {expandedDrains.map((drain) => (
                                  <tr
                                    key={drain.id}
                                    className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                                  >
                                    <td className="px-4 md:px-6 py-4">
                                      <div className="text-white font-mono text-sm">
                                        {drain.date}
                                      </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <div>
                                        <div className="font-medium text-white text-base">{drain.tankName}</div>
                                        <div className="text-sm text-blue-400">{drain.fuelType}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <div className="text-white font-semibold text-base">
                                        {drain.volume.toLocaleString()}
                                      </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <div className="text-white">
                                        {drain.driverName}
                                      </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <div className="text-white">
                                        {drain.truckNumber}
                                      </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <div className="text-slate-300">
                                        {drain.reason}
                                      </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <Badge variant="secondary" className={`${
                                        drain.source === 'sensor' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        drain.source === 'mobile_app' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                      }`}>
                                        {drain.source === 'sensor' ? 'Датчик' :
                                         drain.source === 'mobile_app' ? 'Мобильное' : 'API'}
                                      </Badge>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <Badge variant="secondary" className={`${
                                        drain.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        drain.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                        'bg-red-500/20 text-red-400 border-red-500/30'
                                      }`}>
                                        {drain.status === 'confirmed' ? '✓ Подтверждено' :
                                         drain.status === 'pending' ? '⏳ Ожидает' : '✗ Ошибка'}
                                      </Badge>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 w-8 p-0 ${
                                            drain.status === 'pending' && canApproveDrainOperations
                                              ? 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                                              : 'text-slate-600 cursor-not-allowed'
                                          }`}
                                          title="Подтвердить"
                                          disabled={drain.status !== 'pending' || !canApproveDrainOperations}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 w-8 p-0 ${
                                            drain.status === 'pending' && canApproveDrainOperations
                                              ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                              : 'text-slate-600 cursor-not-allowed'
                                          }`}
                                          title="Отклонить"
                                          disabled={drain.status !== 'pending' || !canApproveDrainOperations}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="text-sm text-slate-400">
                        Показано записей: {expandedDrains.length}
                      </div>
                      <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700">
                        <Download className="w-4 h-4 mr-2" />
                        Экспорт Excel
                      </Button>
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
                            disabled={!canPerformCalibration}
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

        {/* Tank Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-400" />
                Настройки резервуара
              </DialogTitle>
            </DialogHeader>
            {selectedTank && (
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-6">
                  {/* Tank Info */}
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <Gauge className="h-5 w-5 text-blue-400" />
                      <span className="font-semibold text-white">{selectedTank.name}</span>
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {selectedTank.fuelType}
                      </Badge>
                    </div>
                  </div>

                  {/* Level Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Droplets className="h-5 w-5 text-blue-400" />
                      Уровни топлива
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="criticalLevelPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Критический уровень (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                className="bg-slate-700 border-slate-600 text-white"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="minLevelPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Минимальный уровень (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                className="bg-slate-700 border-slate-600 text-white"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Temperature Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-orange-400" />
                      Температурные пределы
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="criticalTemp.min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Мин. температура (°C)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="bg-slate-700 border-slate-600 text-white"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="criticalTemp.max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Макс. температура (°C)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="bg-slate-700 border-slate-600 text-white"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Water Level Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Droplets className="h-5 w-5 text-blue-400" />
                      Содержание воды
                    </h3>
                    <FormField
                      control={settingsForm.control}
                      name="maxWaterLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Максимальный уровень воды (мм)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="bg-slate-700 border-slate-600 text-white"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Bell className="h-5 w-5 text-yellow-400" />
                      Уведомления
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="notifications.critical"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Критический уровень
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="notifications.minimum"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Минимальный уровень
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="notifications.temperature"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Температура
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="notifications.water"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Уровень воды
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSettingsDialogOpen(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={settingsForm.formState.isSubmitting}
                    >
                      {settingsForm.formState.isSubmitting ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        {/* Calibration Dialog */}
        <Dialog open={calibrationDialogOpen} onOpenChange={setCalibrationDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-400" />
                Калибровка резервуара
              </DialogTitle>
            </DialogHeader>
            
            {selectedTank && (
              <div className="space-y-6">
                {/* Tank Info */}
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Gauge className="h-5 w-5 text-blue-400" />
                    <span className="font-semibold text-white">{selectedTank.name}</span>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {selectedTank.fuelType}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    Последняя калибровка: {selectedTank.lastCalibration}
                  </div>
                </div>

                {/* Calibration Form */}
                <Form {...calibrationForm}>
                  <form onSubmit={calibrationForm.handleSubmit(onSubmitCalibration)} className="space-y-4">
                    {/* File Upload */}
                    <FormField
                      control={calibrationForm.control}
                      name="file"
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem>
                          <FormLabel>Файл калибровки</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".csv,.xlsx"
                              className="bg-slate-700 border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                              onChange={(e) => onChange(e.target.files)}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Operator */}
                    <FormField
                      control={calibrationForm.control}
                      name="operator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Оператор</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ФИО оператора"
                              className="bg-slate-700 border-slate-600 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Calibration Type */}
                    <FormField
                      control={calibrationForm.control}
                      name="calibrationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Тип калибровки</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Выберите тип" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="full">Полная калибровка</SelectItem>
                              <SelectItem value="check">Проверочная калибровка</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={calibrationForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Примечания (необязательно)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Дополнительная информация о калибровке"
                              className="bg-slate-700 border-slate-600 text-white resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCalibrationDialogOpen(false)}
                        className="flex-1"
                        disabled={loading}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Загрузка...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Загрузить
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* Calibration History */}
                {calibrationHistory[selectedTank.id] && calibrationHistory[selectedTank.id].length > 0 && (
                  <div className="pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      История калибровок
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {calibrationHistory[selectedTank.id].slice(0, 5).map((cal) => (
                        <div
                          key={cal.id}
                          className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700"
                        >
                          <div className="flex-1">
                            <div className="text-sm text-white">{cal.date}</div>
                            <div className="text-xs text-slate-400">
                              {cal.operator} • {cal.filename}
                              {cal.calibrationType === 'full' ? ' (Полная)' : ' (Проверочная)'}
                            </div>
                            {cal.notes && (
                              <div className="text-xs text-slate-500 mt-1">{cal.notes}</div>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                          >
                            {cal.status === 'completed' ? 'Завершено' : 'Обработка'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}