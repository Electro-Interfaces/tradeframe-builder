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
import { HelpButton } from "@/components/help/HelpButton";
import { currentEquipmentAPI } from "@/services/equipment";
import { Equipment } from "@/types/equipment";
import { stsApiService } from "@/services/stsApi";
import { tradingPointsService } from "@/services/tradingPointsService";
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
  RefreshCw,
  HelpCircle
} from "lucide-react";

// Enhanced Mock data with new fields
const mockTanks = [
  {
    id: 1,
    name: "Резервуар №1",
    fuelType: "Дизельное топливо",
    currentLevelLiters: 7595.83,
    capacityLiters: 10128.88,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 19,
    waterLevelMm: 0,
    density: 822.68,
    mass: 6330.79,
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
    },
    // Данные от API СТС
    stsData: {
      volumeBegin: 7606.69,
      volumeEnd: 7606.69,
      massBegin: 6330.79,
      massEnd: 6330.79,
      releaseVolume: 25.39,
      releaseLiters: 20.89,
      renewedToday: "12:27",
      fuelCode: 5
    }
  },
  {
    id: 2,
    name: "Резервуар №2", 
    fuelType: "АИ-95",
    currentLevelLiters: 4287.96,
    capacityLiters: 10303.01,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 18.6,
    waterLevelMm: 0.58,
    density: 735.23,
    mass: 3376.27,
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
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
        temperature: true,
        water: true
      }
    },
    // Данные от API СТС
    stsData: {
      volumeBegin: 4575,
      volumeEnd: 4575,
      massBegin: 3376.27,
      massEnd: 3376.27,
      releaseVolume: 251.52,
      releaseLiters: 184.92,
      renewedToday: "12:27",
      fuelCode: 3
    }
  },
  {
    id: 3,
    name: "Резервуар №3",
    fuelType: "АИ-92",
    currentLevelLiters: 6266.36,
    capacityLiters: 10489.99,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 19,
    waterLevelMm: 0,
    density: 731.49,
    mass: 4847.8,
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    lastCalibration: "10.12.2024 16:45",
    linkedPumps: [
      { id: 3, name: "ТРК-3" },
      { id: 5, name: "ТРК-5" }
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
    },
    // Данные от API СТС
    stsData: {
      volumeBegin: 6593.41,
      volumeEnd: 6593.41,
      massBegin: 4847.8,
      massEnd: 4847.8,
      releaseVolume: 317.3,
      releaseLiters: 232.1,
      renewedToday: "12:27",
      fuelCode: 2
    }
  }
];

// Компонент вертикального индикатора уровня топлива
const TankProgressIndicator = ({ percentage, minLevel, criticalLevel, isMobile }) => {
  const height = isMobile ? 120 : 160;
  const width = 40;
  
  const getColor = () => {
    if (percentage > minLevel) return '#3b82f6'; // blue-500
    if (percentage >= criticalLevel) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };
  
  const fillHeight = (percentage / 100) * height;
  
  return (
    <div 
      style={{ height: `${height}px`, width: `${width}px` }}
      className="relative bg-slate-700 rounded-lg border border-slate-600 overflow-hidden"
    >
      {/* Background gradient */}
      <div 
        className="absolute bottom-0 w-full transition-all duration-500 ease-in-out"
        style={{ 
          height: `${fillHeight}px`,
          background: `linear-gradient(to top, ${getColor()}, ${getColor()}88)`
        }}
      />
      
      {/* Critical level indicator */}
      <div 
        className="absolute w-full h-0.5 bg-red-500/50"
        style={{ bottom: `${(criticalLevel / 100) * height}px` }}
      />
      
      {/* Min level indicator */}
      <div 
        className="absolute w-full h-0.5 bg-yellow-500/50"
        style={{ bottom: `${(minLevel / 100) * height}px` }}
      />
      
      {/* Percentage text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-xs font-bold drop-shadow-lg">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

// Mock API for tank events and calibration
const mockTankEvents = [
  { id: 1, tankId: 1, date: "15.12.2024 14:30", type: "calibration", status: "success", details: "Калибровка завершена успешно", operator: "Иванов И.И." },
  { id: 2, tankId: 1, date: "15.12.2024 10:15", type: "delivery", status: "completed", details: "Приемка топлива: 5000 л", operator: "Петров П.П." },
  { id: 3, tankId: 2, date: "14.12.2024 16:45", type: "maintenance", status: "in_progress", details: "Плановое обслуживание датчиков", operator: "Сидоров С.С." },
  { id: 4, tankId: 3, date: "14.12.2024 12:20", type: "alert", status: "warning", details: "Превышен уровень воды", operator: "Система" }
];

// Mock calibration history
const mockCalibrations = [
  { id: 1, tankId: 1, date: "15.12.2024 14:30", volume: 25000, result: "success", operator: "Иванов И.И.", notes: "Стандартная калибровка" },
  { id: 2, tankId: 1, date: "01.12.2024 09:00", volume: 24850, result: "success", operator: "Петров П.П.", notes: "Плановая калибровка" },
  { id: 3, tankId: 2, date: "12.12.2024 09:15", volume: 8000, result: "success", operator: "Сидоров С.С.", notes: "После ремонта" }
];

// Mock drainage log
const mockDrainageLog = [
  { id: 1, date: "15.12.2024 08:00", tankId: 1, reason: "Плановый слив", volume: 50, approvedBy: "Главный инженер", status: "approved" },
  { id: 2, date: "14.12.2024 14:30", tankId: 2, reason: "Превышение воды", volume: 25, approvedBy: "Начальник смены", status: "completed" },
  { id: 3, date: "13.12.2024 16:00", tankId: 3, reason: "Техническое обслуживание", volume: 75, approvedBy: "Главный инженер", status: "pending" }
];

// Mock expanded drains data
const mockDrains = [
  { id: 1, date: "15.12.2024", tanks: [1, 2], totalVolume: 125, status: "completed", operator: "Иванов И.И." },
  { id: 2, date: "14.12.2024", tanks: [3], totalVolume: 50, status: "pending", operator: "Петров П.П." },
  { id: 3, date: "13.12.2024", tanks: [1], totalVolume: 75, status: "approved", operator: "Сидоров С.С." }
];

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
    Promise.resolve({ success: true, id }),
};

// Form schemas
const settingsSchema = z.object({
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
  file: z.any().optional(),
  notes: z.string().optional()
});

export default function Tanks() {
  const { user, getUserRole } = useAuth();
  const { canManageTanks, canCalibrate, canApproveDrains } = usePermissions();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Получаем название торговой точки для отображения
  const getTradingPointName = (pointId: string) => {
    const points = [
      { value: "point1", label: "АЗС №001 - Центральная" },
      { value: "point2", label: "АЗС №002 - Северная" },
      { value: "point3", label: "АЗС №003 - Южная" },
      { value: "bto-azs-1", label: "АЗС 1" },
      { value: "bto-azs-2", label: "АЗС 2" },
      { value: "bto-azs-3", label: "АЗС 3" },
      { value: "bto-azs-4", label: "АЗС 4" }
    ];
    const point = points.find(p => p.value === pointId);
    return point ? point.label : pointId;
  };

  const isMobile = useIsMobile();
  
  // Состояния компонента
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [tankEvents, setTankEvents] = useState<{[key: number]: any[]}>({});
  const [drainageLog, setDrainageLog] = useState(mockDrainageLog);
  const [expandedDrains, setExpandedDrains] = useState(mockDrains);
  const [loading, setLoading] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [loadingFromSTSAPI, setLoadingFromSTSAPI] = useState(false);
  const [calibrationHistory, setCalibrationHistory] = useState<{[key: number]: any[]}>({});
  const [tanks, setTanks] = useState(mockTanks);
  const [filters, setFilters] = useState({
    period: '',
    tankId: '',
    eventType: '',
    status: ''
  });

  // Формы
  const settingsForm = useForm({
    resolver: zodResolver(settingsSchema)
  });

  const calibrationForm = useForm({
    resolver: zodResolver(calibrationSchema)
  });

  // Загружаем оборудование при смене торговой точки
  useEffect(() => {
    const loadEquipment = async () => {
      if (!selectedTradingPoint) {
        setEquipment([]);
        return;
      }

      try {
        setLoading(true);
        
        // Получаем данные оборудования для выбранной торговой точки
        const data = await currentEquipmentAPI.getAll();
        
        // Фильтруем только резервуары (tanks)
        const tankEquipment = data.filter(item => 
          item.type && item.type.toLowerCase().includes('резервуар') ||
          item.type && item.type.toLowerCase().includes('tank') ||
          item.name && item.name.toLowerCase().includes('резервуар')
        );

        console.log('Загружено оборудование резервуаров:', tankEquipment);
        setEquipment(tankEquipment);

        // Преобразуем данные оборудования в формат резервуаров
        if (tankEquipment.length > 0) {
          const tanksFromEquipment = tankEquipment.map(eq => {
            // Пытаемся извлечь числовые данные из состояний компонентов
            const levelComponent = eq.components?.find(c => 
              c.type?.toLowerCase().includes('level') || 
              c.name?.toLowerCase().includes('уровень')
            );
            
            const tempComponent = eq.components?.find(c => 
              c.type?.toLowerCase().includes('temperature') || 
              c.name?.toLowerCase().includes('температура')
            );

            const currentLevel = levelComponent?.currentValue ? 
              parseFloat(levelComponent.currentValue.toString()) : 
              Math.random() * 40000 + 5000; // Случайный уровень для демо
            
            const capacity = eq.specifications?.capacity || 50000;
            const temperature = tempComponent?.currentValue ? 
              parseFloat(tempComponent.currentValue.toString()) : 
              Math.random() * 10 + 10; // Случайная температура

            return {
              id: eq.id,
              name: eq.name || `Резервуар №${eq.id}`,
              fuelType: eq.specifications?.fuelType || 'АИ-95',
              currentLevelLiters: currentLevel,
              capacityLiters: capacity,
              minLevelPercent: 20,
              criticalLevelPercent: 10,
              temperature: temperature,
              waterLevelMm: Math.random() * 5,
              sensors: eq.components?.map(c => ({
                name: c.name || c.type || 'Датчик',
                status: c.status || 'ok'
              })) || [
                { name: "Уровень", status: "ok" },
                { name: "Температура", status: "ok" }
              ],
              lastCalibration: new Date().toLocaleDateString('ru-RU'),
              linkedPumps: [],
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
            };
          });
          
          // Обновляем список резервуаров данными от оборудования
          console.log('Обновляем резервуары данными оборудования:', tanksFromEquipment);
          setTanks(tanksFromEquipment);
        } else {
          // Если нет данных оборудования, используем mock данные
          setTanks(mockTanks);
        }
        
      } catch (error) {
        console.error('Ошибка загрузки оборудования:', error);
        // В случае ошибки используем mock данные
        setTanks(mockTanks);
      } finally {
        setLoading(false);
      }
    };

    loadEquipment();
  }, [selectedTradingPoint]);

  // Load tank events and calibration history on component mount
  useEffect(() => {
    const loadTankData = async () => {
      const events: {[key: number]: any[]} = {};
      const calibrations: {[key: number]: any[]} = {};
      
      for (const tank of tanks) {
        events[tank.id] = await mockAPI.getTankEvents(tank.id);
        calibrations[tank.id] = await mockAPI.getTankCalibrations(tank.id);
      }
      
      setTankEvents(events);
      setCalibrationHistory(calibrations);
    };
    loadTankData();
  }, []);

  // Проверяем и настраиваем STS API при инициализации, автоматически загружаем данные
  useEffect(() => {
    console.log('🔧 Инициализация раздела резервуаров...');
    
    // Обеспечиваем правильную настройку STS API
    ensureSTSApiConfigured();
    setStsApiConfigured(true);
    
    // Автоматически загружаем данные резервуаров при выборе торговой точки
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      console.log('🚀 Автоматическая загрузка резервуаров для торговой точки:', selectedTradingPoint);
      loadTanksFromSTSAPI();
    }
  }, [selectedTradingPoint]);

  const getProgressColor = (percentage: number) => {
    if (percentage > 20) return "hsl(var(--primary))"; // Blue
    if (percentage >= 10) return "hsl(45, 93%, 47%)"; // Yellow
    return "hsl(0, 84%, 60%)"; // Red
  };

  const getPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  // Функция для настройки STS API с правильными параметрами
  const ensureSTSApiConfigured = () => {
    console.log('🔧 Проверяем и настраиваем STS API конфигурацию...');
    
    const correctConfig = {
      url: 'https://pos.autooplata.ru/tms',
      username: 'UserApi',
      password: 'lHQfLZHzB3tn',
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      refreshInterval: 20 * 60 * 1000 // 20 минут
    };
    
    // Проверяем текущую конфигурацию
    const currentConfig = localStorage.getItem('sts-api-config');
    let needsUpdate = false;
    
    if (currentConfig) {
      try {
        const parsed = JSON.parse(currentConfig);
        // Проверяем, что все нужные параметры совпадают
        if (parsed.url !== correctConfig.url || 
            parsed.username !== correctConfig.username || 
            parsed.password !== correctConfig.password ||
            !parsed.enabled) {
          needsUpdate = true;
        }
      } catch {
        needsUpdate = true;
      }
    } else {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('🔧 Обновляем конфигурацию STS API с правильными параметрами');
      localStorage.setItem('sts-api-config', JSON.stringify(correctConfig));
    }
    
    return correctConfig;
  };

  // Загрузка резервуаров из STS API (упрощенная версия без дублирования авторизации)
  const loadTanksFromSTSAPI = async () => {
    console.log('🔧 Начинаем загрузку резервуаров из STS API...');

    setLoadingFromSTSAPI(true);

    try {
      // Обеспечиваем правильную настройку STS API
      ensureSTSApiConfigured();

      // Получаем полный объект торговой точки для получения external_id
      if (!selectedTradingPoint || selectedTradingPoint === 'all') {
        throw new Error('Выберите конкретную торговую точку для получения данных резервуаров из STS API');
      }

      // Загружаем полные данные торговой точки
      console.log('🔍 Загружаем торговую точку по ID:', selectedTradingPoint);
      
      const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPointObject) {
        throw new Error('Не удалось загрузить данные торговой точки');
      }

      console.log('🏪 Полные данные торговой точки:', tradingPointObject);

      // Получаем параметры из селекторов приложения
      const contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code || '1',
        tradingPointId: tradingPointObject.external_id || '1'
      };
      
      console.log('🔍 Параметры запроса для резервуаров:', contextParams);

      // Загружаем резервуары из STS API (stsApiService сам управляет авторизацией)
      console.log('🔄 Загружаем резервуары из STS API /v1/tanks...');
      const stsTanks = await stsApiService.getTanks(contextParams);
      
      console.log('🔍 Исходные данные резервуаров STS API:', stsTanks);
      
      if (stsTanks && stsTanks.length > 0) {
        console.log(`✅ Загружено ${stsTanks.length} резервуаров из STS API`);
        
        // Загружаем события и калибровки для каждого резервуара
        const events: {[key: number]: any[]} = {};
        const calibrations: {[key: number]: any[]} = {};
        
        for (const tank of stsTanks) {
          events[tank.id] = await mockAPI.getTankEvents(tank.id);
          calibrations[tank.id] = await mockAPI.getTankCalibrations(tank.id);
        }
        
        setTankEvents(events);
        setCalibrationHistory(calibrations);
        setTanks(stsTanks);
        setStsApiConfigured(true);
        
        
        console.log('✅ Резервуары из STS API успешно загружены и обработаны');
      } else {
        console.warn('⚠️ STS API вернул пустой список резервуаров');
        if (!isMobile) {
          toast({
            title: "Нет данных",
            description: "STS API не вернул данных о резервуарах",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки резервуаров из STS API:', error);
      if (!isMobile) {
        toast({
          title: "Ошибка загрузки",
          description: error instanceof Error ? error.message : 'Произошла ошибка при загрузке данных резервуаров',
          variant: "destructive",
        });
      }
    } finally {
      setLoadingFromSTSAPI(false);
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

  const onSettingsSubmit = async (data: any) => {
    try {
      await mockAPI.updateTankSettings(selectedTank.id, data);
      
      // Update tank in local state
      const updatedTanks = tanks.map(tank => {
        if (tank.id === selectedTank.id) {
          return {
            ...tank,
            minLevelPercent: data.minLevelPercent,
            criticalLevelPercent: data.criticalLevelPercent,
            thresholds: {
              ...tank.thresholds,
              criticalTemp: data.criticalTemp,
              maxWaterLevel: data.maxWaterLevel,
              notifications: data.notifications
            }
          };
        }
        return tank;
      });
      
      setTanks(updatedTanks);
      setSettingsDialogOpen(false);
      
      toast({
        title: "Настройки сохранены",
        description: `Настройки резервуара ${selectedTank.name} обновлены`,
      });
    } catch (error) {
      console.error('Error updating tank settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки резервуара",
        variant: "destructive",
      });
    }
  };

  const onCalibrationSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      if (data.file) formData.append('file', data.file);
      if (data.notes) formData.append('notes', data.notes);
      
      const result = await mockAPI.uploadCalibration(selectedTank.id, formData);
      
      if (result.success) {
        const newCalibration = {
          id: result.id,
          tankId: selectedTank.id,
          date: new Date().toLocaleString('ru-RU'),
          result: 'success',
          operator: user?.name || 'Текущий пользователь',
          notes: data.notes || ''
        };
        
        // Update calibration history
        setCalibrationHistory(prev => ({
          ...prev,
          [selectedTank.id]: [newCalibration, ...(prev[selectedTank.id] || [])]
        }));
        
        setCalibrationDialogOpen(false);
        calibrationForm.reset();
        
        toast({
          title: "Калибровка загружена",
          description: `Файл калибровки для ${selectedTank.name} успешно загружен`,
        });
      }
    } catch (error) {
      console.error('Error uploading calibration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл калибровки",
        variant: "destructive",
      });
    }
  };

  // Helper functions for event display
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <Truck className="h-4 w-4" />;
      case 'calibration': return <Settings className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning':
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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
      <div className={`w-full space-y-6 ${isMobile ? 'px-2 py-4' : 'px-4 md:px-6 lg:px-8 py-6'}`}>
        {/* Заголовок страницы */}
        <Card className={`bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-sm ${isMobile ? 'mx-0' : ''} overflow-hidden`}>
          <CardHeader className={`${isMobile ? 'px-4 py-4' : 'px-8 py-6'} bg-gradient-to-r from-slate-800/90 via-slate-750/90 to-slate-800/90 border-b border-slate-600/30`}>
            <CardTitle className={`text-slate-100 flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg"></div>
                <div className="flex flex-col">
                  <span className={`${isMobile ? 'text-xl font-bold' : 'text-3xl font-bold'} text-white leading-tight`}>Резервуары</span>
                  <span className="text-slate-400 text-sm font-medium">Мониторинг запасов топлива и управление операциями</span>
                </div>
              </div>
              
              <div className={`flex ${isMobile ? 'gap-2 self-start flex-wrap' : 'gap-4'} items-center`}>
                {!isMobile && (
                  <Button
                    onClick={() => window.open('/help/point/tanks', '_blank')}
                    variant="outline"
                    size="sm"
                    className="border-slate-500/60 text-slate-300 hover:text-white hover:bg-slate-600/80 hover:border-slate-400 hover:shadow-md transition-all duration-300 px-5 py-2.5 rounded-lg bg-slate-700/30 backdrop-blur-sm"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Инструкция
                  </Button>
                )}
                
                {/* Кнопка обновления данных */}
                {stsApiConfigured ? (
                  <Button
                    onClick={loadTanksFromSTSAPI}
                    disabled={loadingFromSTSAPI}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
                  >
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">
                      {loadingFromSTSAPI ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </div>
                    {loadingFromSTSAPI ? 'Обновление...' : 'Обновить данные'}
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        // Перезагружаем данные резервуаров из mock API
                        const events: {[key: number]: any[]} = {};
                        const calibrations: {[key: number]: any[]} = {};
                        
                        for (const tank of mockTanks) {
                          events[tank.id] = await mockAPI.getTankEvents(tank.id);
                          calibrations[tank.id] = await mockAPI.getTankCalibrations(tank.id);
                        }
                        
                        setTankEvents(events);
                        setCalibrationHistory(calibrations);
                        console.log('✅ Данные резервуаров обновлены (mock API)');
                        if (!isMobile) {
                          toast({
                            title: "Данные обновлены",
                            description: "Тестовые данные резервуаров обновлены",
                            variant: "default",
                          });
                        }
                      } catch (error) {
                        console.error('❌ Ошибка обновления резервуаров:', error);
                        if (!isMobile) {
                          toast({
                            title: "Ошибка обновления",
                            description: "Произошла ошибка при обновлении данных",
                            variant: "destructive",
                          });
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
                  >
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </div>
                    {loading ? 'Обновление...' : 'Обновить данные'}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>


        {/* Резервуары - сетка карточек */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
          {tanks.map((tank) => {
            const percentage = getPercentage(tank.currentLevelLiters, tank.capacityLiters);
            
            return (
              <Card key={tank.id} className="bg-slate-800 border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardContent className={isMobile ? "p-3" : "p-4"}>
                  {/* Header with tank name and fuel type */}
                  <div className={isMobile ? "mb-3" : "mb-4"}>
                    {/* Tank Name */}
                    <div className={`flex items-center gap-2 ${isMobile ? "mb-1" : "mb-2"}`}>
                      <Gauge className={`${isMobile ? "h-4 w-4" : "h-5 w-5"} text-blue-400 flex-shrink-0`} />
                      <div className={`text-white font-semibold ${isMobile ? "text-base" : "text-lg"}`}>
                        {tank.name}
                      </div>
                    </div>
                    
                    {/* Fuel Type and Volume/Percentage */}
                    <div className={`flex items-center justify-between ${isMobile ? "flex-col items-start gap-1" : ""}`}>
                      <div className={`text-blue-400 font-bold ${isMobile ? "text-lg" : "text-xl"}`}>
                        {tank.fuelType}
                      </div>
                      <div className={`${isMobile ? "text-base" : "text-lg"} font-bold ${
                        percentage > tank.minLevelPercent ? 'text-blue-400' :
                        percentage >= tank.criticalLevelPercent ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {tank.currentLevelLiters.toLocaleString()} л ({percentage}%)
                      </div>
                    </div>
                  </div>
                  
                  {/* Main content - Progress bar left, parameters right */}
                  <div className={`flex ${isMobile ? "flex-col gap-3" : "gap-4"}`}>
                    {/* Block 1: Progress Bar (Left) */}
                    <div className={`flex ${isMobile ? "flex-row justify-center" : "flex-col"} items-center gap-2 flex-shrink-0`}>
                      <TankProgressIndicator 
                        percentage={percentage} 
                        minLevel={tank.minLevelPercent}
                        criticalLevel={tank.criticalLevelPercent}
                        isMobile={isMobile}
                      />
                      <div className={`${isMobile ? "text-sm" : "text-base"} text-slate-300 text-center leading-snug`}>
                        <div>Макс: {Math.round(tank.capacityLiters).toLocaleString()} л</div>
                      </div>
                    </div>

                    {/* Block 2: Parameters taking full height */}
                    <div className="flex-1 bg-slate-900/30 p-3 rounded-md overflow-hidden">
                      <div className={`h-full flex flex-col justify-between ${isMobile ? "text-xs space-y-1" : "text-sm space-y-2"}`}>
                        {/* Temperature */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Thermometer className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} text-slate-400 flex-shrink-0`} />
                          <span className="text-slate-400 truncate">Температура</span>
                          <span className="text-white font-medium ml-auto flex-shrink-0">{parseFloat(tank.apiData?.temperature || tank.temperature || '0').toFixed(1)}°C</span>
                        </div>
                        
                        {/* Level */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} bg-slate-400 rounded-full flex-shrink-0`}></div>
                          <span className="text-slate-400 truncate">Уровень</span>
                          <span className="text-white font-medium ml-auto flex-shrink-0">{parseFloat(tank.apiData?.level || '0').toFixed(1)} мм</span>
                        </div>
                        
                        {/* Density */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} bg-slate-500 rounded-full flex-shrink-0`}></div>
                          <span className="text-slate-400 truncate">Плотность</span>
                          <span className="text-white font-medium ml-auto flex-shrink-0">{parseFloat(tank.apiData?.density || '0').toFixed(2)}</span>
                        </div>
                        
                        {/* Water */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Droplets className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} text-slate-400 flex-shrink-0`} />
                          <span className="text-slate-400 truncate">Вода</span>
                          <span className="text-white font-medium ml-auto flex-shrink-0">{parseFloat(tank.apiData?.water?.level || '0').toFixed(1)} мм</span>
                        </div>
                        
                        {/* Free Space */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} bg-slate-500 rounded-full flex-shrink-0`}></div>
                          <span className="text-slate-400 truncate">Свободно</span>
                          <span className="text-white font-medium ml-auto flex-shrink-0">{parseFloat(tank.apiData?.volume_free || '0').toLocaleString()} л</span>
                        </div>
                        
                        {/* Mass */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} bg-blue-500 rounded-full flex-shrink-0`}></div>
                          <span className="text-slate-400 truncate">Масса</span>
                          <span className="text-white font-medium ml-auto flex-shrink-0">{parseFloat(tank.apiData?.amount_begin || '0').toLocaleString()} кг</span>
                        </div>
                        
                        {/* Status */}
                        <div className="flex items-center gap-2 min-w-0">
                          {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? (
                            <CheckCircle className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} text-green-400 flex-shrink-0`} />
                          ) : (
                            <XCircle className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} text-red-400 flex-shrink-0`} />
                          )}
                          <span className="text-slate-400 truncate">Состояние</span>
                          <span className={`font-medium ml-auto flex-shrink-0 ${tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'text-green-400' : 'text-red-400'}`}>
                            {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'Активно' : 'Ошибка'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Данные от API СТС section с реальными данными */}
                  <div className={`${isMobile ? "mt-3 pt-3" : "mt-5 pt-4"} border-t border-slate-700`}>
                    <div className={`grid grid-cols-2 gap-x-4 gap-y-2 ${isMobile ? "text-xs" : "text-base"}`}>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Объем нач:</span>
                        <span className="text-white font-medium">{parseFloat(tank.apiData?.volume_begin || '0').toLocaleString()} л</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Отпуск об:</span>
                        <span className="text-white font-medium">{parseFloat(tank.apiData?.release?.volume || '0').toLocaleString()} л</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Объем кон:</span>
                        <span className="text-white font-medium">{parseFloat(tank.apiData?.volume_end || '0').toLocaleString()} л</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Отпуск м:</span>
                        <span className="text-white font-medium">{parseFloat(tank.apiData?.release?.amount || '0').toLocaleString()} кг</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Масса нач:</span>
                        <span className="text-white font-medium">{parseFloat(tank.apiData?.amount_begin || '0').toLocaleString()} кг</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Обновлено:</span>
                        <span className="text-white font-medium">{tank.apiData?.dt ? new Date(tank.apiData.dt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Масса кон:</span>
                        <span className="text-white font-medium">{parseFloat(tank.apiData?.amount_end || '0').toLocaleString()} кг</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Код топлива:</span>
                        <span className="text-orange-400 font-semibold">{tank.apiData?.fuel || '?'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notification indicator */}
                  <div className={`${isMobile ? "mt-2" : "mt-4"} flex justify-center`}>
                    <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} bg-yellow-500/20 rounded-full flex items-center justify-center`}>
                      <Bell className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} text-yellow-400`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Настройки резервуара {selectedTank?.name}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={settingsForm.control}
                    name="minLevelPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Минимальный уровень (%)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-slate-700 border-slate-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="criticalLevelPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Критический уровень (%)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-slate-700 border-slate-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={settingsForm.control}
                    name="criticalTemp.min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Мин. температура (°C)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-slate-700 border-slate-600 text-white" />
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
                        <FormLabel className="text-slate-300">Макс. температура (°C)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-slate-700 border-slate-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={settingsForm.control}
                  name="maxWaterLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Макс. уровень воды (мм)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="bg-slate-700 border-slate-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Label className="text-slate-300">Уведомления</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settingsForm.control}
                      name="notifications.critical"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-slate-300">Критические</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="notifications.minimum"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-slate-300">Минимальный уровень</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="notifications.temperature"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-slate-300">Температура</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="notifications.water"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-slate-300">Уровень воды</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSettingsDialogOpen(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Сохранить
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Calibration Dialog */}
        <Dialog open={calibrationDialogOpen} onOpenChange={setCalibrationDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Загрузка калибровки {selectedTank?.name}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...calibrationForm}>
              <form onSubmit={calibrationForm.handleSubmit(onCalibrationSubmit)} className="space-y-4">
                <FormField
                  control={calibrationForm.control}
                  name="file"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Файл калибровки</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => onChange(e.target.files?.[0])}
                          className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-slate-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={calibrationForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Примечания</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Дополнительные комментарии..."
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Calibration History */}
                {calibrationHistory[selectedTank?.id] && calibrationHistory[selectedTank.id].length > 0 && (
                  <div className="mt-4">
                    <Label className="text-slate-300 mb-2 block">История калибровок</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {calibrationHistory[selectedTank.id].slice(0, 5).map((cal) => (
                        <div key={cal.id} className="bg-slate-700 rounded p-2 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-white font-medium">{cal.date}</div>
                              <div className="text-slate-400">{cal.operator}</div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs ${
                              cal.result === 'success' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {cal.result === 'success' ? 'Успешно' : 'Ошибка'}
                            </div>
                          </div>
                          {cal.notes && (
                            <div className="mt-1 text-slate-400">{cal.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCalibrationDialogOpen(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}