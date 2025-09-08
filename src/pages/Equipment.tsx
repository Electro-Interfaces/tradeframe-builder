import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/context/SelectionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Plus, 
  Edit, 
  Settings, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  PowerOff, 
  Archive, 
  Loader2, 
  MapPin,
  ChevronDown,
  ChevronRight,
  Power,
  Trash2,
  Layers3,
  Scan
} from "lucide-react";
import { cn } from "@/lib/utils";

// Компоненты оборудования
import { EquipmentWizard } from "@/components/equipment/EquipmentWizard";
import { HelpButton } from "@/components/help/HelpButton";
import { EquipmentDetailCard } from "@/components/equipment/EquipmentDetailCard";
import { EquipmentComponentsList } from "@/components/equipment/EquipmentComponentsList";
import { EquipmentCommandsPanel } from "@/components/equipment/EquipmentCommandsPanel";
import { EquipmentCommandsEditor } from "@/components/equipment/EquipmentCommandsEditor";

// Типы и API
import { 
  Equipment, 
  EquipmentTemplate,
  CreateEquipmentRequest, 
  UpdateEquipmentRequest,
  EquipmentStatusAction,
  EquipmentStatus,
  EquipmentEvent
} from "@/types/equipment";
import {
  getEquipmentComponentsHealth,
  ComponentHealthStatus
} from "@/services/equipment";
import { Component } from "@/types/component";

// НОВЫЕ КЛИЕНТЫ - Прямая работа с Supabase и внешними API
import { httpClient } from "@/services/universalHttpClient";
import { createSupabaseClient } from "@/services/supabaseClient";

// Новые сервисы для оборудования
import { 
  supabaseEquipmentAPI, 
  supabaseEquipmentTemplatesAPI 
} from "@/services/equipmentSupabase";

// Сервисы для компонентов и резервуаров
import { tanksService } from "@/services/tanksServiceSupabase";
import { tanksApiIntegrationService } from "@/services/tanksApiIntegrationService";
import { tanksUnifiedService } from "@/services/tanksUnifiedService";
import ComponentHealthIndicator from "@/components/ui/ComponentHealthIndicator";

// Утилиты для статусов
const getStatusIcon = (status: EquipmentStatus) => {
  switch (status) {
    case 'online': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'offline': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    case 'disabled': return <PowerOff className="w-4 h-4 text-gray-600" />;
    case 'archived': return <Archive className="w-4 h-4 text-slate-600" />;
    default: return <Settings className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusText = (status: EquipmentStatus) => {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'error': return 'Ошибка';
    case 'disabled': return 'Отключено';
    case 'archived': return 'Архив';
    default: return 'Неизвестно';
  }
};

const getStatusColor = (status: EquipmentStatus) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    case 'disabled': return 'bg-gray-500';
    case 'archived': return 'bg-slate-500';
    default: return 'bg-gray-500';
  }
};

export default function Equipment() {
  const { selectedTradingPoint } = useSelection();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Получаем информацию о торговой точке с мемоизацией
  const [tradingPointInfo, setTradingPointInfo] = useState(null);
  
  useEffect(() => {
    const loadTradingPointInfo = async () => {
      try {
        if (selectedTradingPoint && selectedTradingPoint !== "all") {
          console.log('🔄 Загружаем информацию о торговой точке:', selectedTradingPoint);
          
          // Используем новый HTTP клиент для получения данных торговой точки
          const response = await httpClient.getTradingPointById(selectedTradingPoint);
          if (response.success) {
            console.log('✅ Информация о торговой точке загружена:', response.data);
            setTradingPointInfo(response.data);
          } else {
            throw new Error(response.error || 'Не удалось получить информацию о торговой точке');
          }
        } else {
          console.log('📝 Сброс информации о торговой точке');
          setTradingPointInfo(null);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки информации о торговой точке:', error);
        setTradingPointInfo(null);
      }
    };

    loadTradingPointInfo();
  }, [selectedTradingPoint]);
    
  
  // Основное состояние
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [templates, setTemplates] = useState<EquipmentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanningTradingPoint, setScanningTradingPoint] = useState(false);
  const [editingCommandsEquipmentId, setEditingCommandsEquipmentId] = useState<string | null>(null);
  
  
  // Модальные окна
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  // Расширенные ряды таблицы
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Состояние для статусов компонентов
  const [componentHealths, setComponentHealths] = useState<Record<string, {
    aggregatedStatus: ComponentHealthStatus;
    componentCount: number;
    statusBreakdown: Record<string, number>;
  }>>({});
  
  // ID выбранной торговой точки
  const selectedTradingPointId = useMemo(() => selectedTradingPoint, [selectedTradingPoint]);

  // Загрузка шаблонов при монтировании
  useEffect(() => {
    loadTemplates();
  }, []);
  
  // Загрузка оборудования при смене торговой точки или фильтров
  useEffect(() => {
    if (selectedTradingPointId) {
      loadEquipment();
    } else {
      setEquipment([]);
    }
  }, [selectedTradingPointId]);
  
  // Загрузка шаблонов с мемоизацией - используем новый Supabase клиент
  const loadTemplates = useCallback(async () => {
    try {
      console.log('🔄 Загружаем шаблоны оборудования...');
      const templatesData = await supabaseEquipmentTemplatesAPI.list();
      console.log('✅ Шаблоны оборудования загружены:', templatesData.length);
      setTemplates(templatesData);
    } catch (error) {
      console.error('❌ Ошибка загрузки шаблонов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить шаблоны оборудования",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Загрузка статусов компонентов для оборудования
  const loadComponentHealths = useCallback(async (equipmentList: Equipment[]) => {
    const healthPromises = equipmentList.map(async (eq) => {
      try {
        const health = await getEquipmentComponentsHealth(eq.id);
        return { equipmentId: eq.id, health };
      } catch (error) {
        console.warn(`Failed to load component health for equipment ${eq.id}:`, error);
        return { 
          equipmentId: eq.id, 
          health: { 
            aggregatedStatus: 'healthy' as ComponentHealthStatus, 
            componentCount: 0, 
            statusBreakdown: {} 
          } 
        };
      }
    });

    const results = await Promise.all(healthPromises);
    const healthMap: Record<string, any> = {};
    
    results.forEach(({ equipmentId, health }) => {
      healthMap[equipmentId] = health;
    });
    
    setComponentHealths(healthMap);
  }, []);

  // Загрузка оборудования с мемоизацией - используем новый Supabase API
  const loadEquipment = useCallback(async () => {
    if (!selectedTradingPointId) {
      console.log('📝 Не выбрана торговая точка, пропускаем загрузку оборудования');
      return;
    }
    
    console.log('🔄 Начинаем загрузку оборудования для торговой точки:', selectedTradingPointId);
    setLoading(true);
    setError(null);
    
    try {
      let response;
      if (selectedTradingPointId === "all") {
        console.log('📦 Загружаем оборудование для всех торговых точек');
        response = await supabaseEquipmentAPI.list({});
      } else {
        console.log('📦 Загружаем оборудование для торговой точки:', selectedTradingPointId);
        response = await supabaseEquipmentAPI.list({
          trading_point_id: selectedTradingPointId
        });
      }
      
      console.log('✅ Оборудование загружено:', response.data?.length, 'единиц');
      setEquipment(response.data || []);
      
      // Загружаем статусы компонентов для каждого оборудования
      console.log('🔄 Загружаем статусы компонентов...');
      await loadComponentHealths(response.data || []);
      console.log('✅ Загрузка завершена успешно');
    } catch (error) {
      console.error('❌ Ошибка загрузки оборудования:', error);
      setError('Не удалось загрузить оборудование');
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить оборудование: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTradingPointId, toast, loadComponentHealths]);

  // Обработчики событий - используем новый Supabase API
  const handleCreateEquipment = async (data: CreateEquipmentRequest) => {
    try {
      console.log('🔄 Создаём новое оборудование:', data);
      await supabaseEquipmentAPI.create(data);
      toast({
        title: "Успех",
        description: "Оборудование успешно создано"
      });
      loadEquipment();
      setIsWizardOpen(false);
    } catch (error) {
      console.error('❌ Ошибка создания оборудования:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать оборудование",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const handleUpdateEquipment = async (id: string, data: UpdateEquipmentRequest) => {
    try {
      console.log('🔄 Обновляем оборудование:', id, data);
      
      // Получаем текущие данные оборудования перед обновлением
      const currentEquipment = equipment?.find(eq => eq.id === id);
      
      // Обновляем оборудование через новый Supabase API
      await supabaseEquipmentAPI.update(id, data);
      
      // Если это топливный резервуар и были изменены параметры, синхронизируем с резервуарами
      if (currentEquipment?.system_type === "fuel_tank" && data.params) {
        try {
          console.log('🛢️ Синхронизируем изменения резервуара с базой данных резервуаров...');
          // Ищем связанный резервуар по названию оборудования
          const tanks = await tanksService.getTanks();
          const linkedTank = tanks.find(tank => 
            tank.name === (data.display_name || currentEquipment.display_name)
          );
          
          if (linkedTank) {
            console.log('✅ Найден связанный резервуар, обновляем:', linkedTank.id);
            // Обновляем резервуар с новыми параметрами
            await tanksService.updateTank(linkedTank.id, {
              name: data.display_name || linkedTank.name,
              fuelType: data.params.fuelType || linkedTank.fuelType,
              currentLevelLiters: data.params.currentLevelLiters || linkedTank.currentLevelLiters,
              capacityLiters: data.params.capacityLiters || linkedTank.capacityLiters,
              minLevelPercent: data.params.minLevelPercent || linkedTank.minLevelPercent,
              criticalLevelPercent: data.params.criticalLevelPercent || linkedTank.criticalLevelPercent,
              temperature: data.params.temperature || linkedTank.temperature,
              waterLevelMm: data.params.waterLevelMm || linkedTank.waterLevelMm,
              density: data.params.density || linkedTank.density,
              material: data.params.material || linkedTank.material,
              status: data.params.status || linkedTank.status,
              location: data.params.location || linkedTank.location,
              supplier: data.params.supplier || linkedTank.supplier,
              lastCalibration: data.params.lastCalibration || linkedTank.lastCalibration
            });
          }
        } catch (tankError) {
          console.warn('⚠️ Не удалось синхронизировать данные резервуара:', tankError);
          // Не блокируем основной процесс, только логируем предупреждение
        }
      }
      
      toast({
        title: "Успех",
        description: "Оборудование успешно обновлено"
      });
      loadEquipment();
      setSelectedEquipment(null);
    } catch (error) {
      console.error('❌ Ошибка обновления оборудования:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить оборудование",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const handleStatusChange = async (id: string, action: EquipmentStatusAction) => {
    try {
      console.log('🔄 Изменяем статус оборудования:', id, action);
      await supabaseEquipmentAPI.setStatus(id, action);
      const actionText = {
        enable: 'включено',
        disable: 'отключено',
        archive: 'архивировано'
      }[action];
      
      toast({
        title: "Успех",
        description: `Оборудование ${actionText}`
      });
      loadEquipment();
      setSelectedEquipment(null);
    } catch (error) {
      console.error('❌ Ошибка изменения статуса:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const handleLoadEvents = async (equipmentId: string): Promise<EquipmentEvent[]> => {
    try {
      console.log('🔄 Загружаем события оборудования:', equipmentId);
      return await supabaseEquipmentAPI.getEvents(equipmentId);
    } catch (error) {
      console.error('❌ Ошибка загрузки событий:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить события",
        variant: "destructive"
      });
      return [];
    }
  };
  
  const toggleRowExpansion = (equipmentId: string) => {
    setExpandedRows(prev => 
      prev.includes(equipmentId) 
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  // Обработчики для компонентов
  const handleEditComponent = (component: Component) => {
    console.log('Редактирование компонента:', component);
    toast({
      title: "Редактирование компонента",
      description: `Функция редактирования компонента "${component.display_name}" будет доступна в следующей версии.`
    });
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это оборудование? Это действие необратимо.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🗑️ Удаляем оборудование:', equipmentId);
      await supabaseEquipmentAPI.delete(equipmentId);
      
      toast({
        title: "Оборудование удалено",
        description: "Оборудование успешно удалено из системы",
      });
      
      // Перезагружаем список оборудования
      await loadEquipment();
    } catch (error) {
      console.error('❌ Ошибка удаления оборудования:', error);
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить оборудование. Попробуйте снова.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComponent = async (component: Component) => {
    if (!confirm(`Вы уверены, что хотите удалить компонент "${component.display_name}"? Это действие необратимо.`)) {
      return;
    }

    try {
      console.log('🗑️ Удаляем компонент:', component.id);
      
      // TODO: Здесь нужно будет использовать новый компонентный API когда он будет готов
      // Пока используем заглушку
      console.warn('⚠️ Функция удаления компонентов еще не реализована с новыми клиентами');
      
      toast({
        title: "Функция в разработке",
        description: "Удаление компонентов будет доступно в следующей версии",
        variant: "default"
      });
      
      // Перезагружаем список оборудования чтобы обновить количество компонентов
      // await loadEquipment();
    } catch (error) {
      console.error('❌ Ошибка удаления компонента:', error);
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить компонент. Попробуйте снова.",
        variant: "destructive"
      });
    }
  };

  // Получение данных от торговой точки через внешнее торговое API
  const handleScanTradingPoint = async () => {
    if (!selectedTradingPointId) return;
    
    try {
      setScanningTradingPoint(true);
      console.log('🔄 Запускаем синхронизацию резервуаров для торговой точки:', selectedTradingPointId);

      toast({
        title: "Запуск синхронизации резервуаров",
        description: "Загружаем данные резервуаров из внешнего торгового API...",
      });

      // Используем унифицированный сервис резервуаров для синхронизации с внешним API
      // Этот сервис использует httpClient для запросов к внешнему API
      const syncResult = await tanksUnifiedService.syncIfEmpty(selectedTradingPointId);
      
      if (syncResult.error) {
        if (syncResult.error.includes('уже существуют')) {
          // Резервуары уже есть - это нормально
          console.log('ℹ️ Резервуары уже существуют в базе данных');
          toast({
            title: "Резервуары уже существуют",
            description: "В базе данных уже есть резервуары для этой торговой точки. Для обновления используйте кнопку 'Обновить' на странице резервуаров.",
            variant: "default",
          });
        } else {
          // Реальная ошибка синхронизации
          throw new Error(syncResult.error);
        }
      } else if (syncResult.synchronized) {
        // Успешная синхронизация новых данных
        const stats = tanksUnifiedService.getStatistics(syncResult.tanks);
        console.log('✅ Синхронизация успешна, создано резервуаров:', stats.total);
        toast({
          title: "Резервуары созданы",
          description: `Успешно создано ${stats.total} резервуаров из внешнего API.`,
        });
      } else {
        // Возвращены существующие данные
        console.log('ℹ️ Возвращены существующие данные из локальной БД');
        toast({
          title: "Резервуары загружены",
          description: "Резервуары загружены из локальной базы данных.",
        });
      }

      // Обновляем список оборудования после синхронизации
      console.log('🔄 Обновляем список оборудования после синхронизации...');
      loadEquipment();

    } catch (error: any) {
      console.error('❌ Ошибка сканирования торговой точки:', error);
      toast({
        title: "Ошибка сканирования",
        description: error.message || "Не удалось опросить торговую точку",
        variant: "destructive",
      });
    } finally {
      setScanningTradingPoint(false);
    }
  };

  // Обработчик редактирования команд
  const handleEditCommands = (equipmentId: string) => {
    setEditingCommandsEquipmentId(equipmentId);
  };

  const handleCloseCommandsEditor = () => {
    setEditingCommandsEquipmentId(null);
  };

  const handleCommandsSaved = () => {
    loadEquipment(); // Перезагружаем список оборудования
  };

  // Если торговая точка не выбрана
  if (!selectedTradingPoint || selectedTradingPoint === "all") {
    return (
      <MainLayout fullWidth={true}>
        <EmptyState
          icon={MapPin}
          title="Выберите торговую точку" 
          description="Для просмотра оборудования необходимо выбрать торговую точку в селекторе."
          className="py-16"
        />
      </MainLayout>
    );
  }

  // Мобильная версия - карточки
  if (isMobile) {
    return (
      <MainLayout fullWidth={true}>
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Оборудование</h1>
              <p className="text-sm text-slate-400">
                {selectedTradingPoint === "all" ? "Все торговые точки" : (tradingPointInfo ? tradingPointInfo.name : 'Торговая точка не выбрана')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanTradingPoint}
                disabled={scanningTradingPoint || loading}
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-xs"
              >
                {scanningTradingPoint ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <Scan className="w-3 h-3 mr-1" />
                    Создать резервуары из API
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsWizardOpen(true)} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">
              {error}
            </div>
          )}

          {!loading && !error && equipment && equipment.length === 0 && (
            <EmptyState
              icon={Settings}
              title="Нет оборудования"
              description="На этой торговой точке пока нет оборудования"
              className="py-8"
            />
          )}

          {!loading && !error && equipment && equipment.length > 0 && (
            <div className="space-y-3">
              {equipment.map(item => {
                const template = templates.find(t => t.id === item.template_id);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                    onClick={() => setSelectedEquipment(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-white">{item.display_name}</h3>
                        <p className="text-sm text-slate-400">
                          {template?.name || "Неизвестный тип"}
                        </p>
                      </div>
                      {getStatusIcon(item.status)}
                    </div>
                    
                    {item.serial_number && (
                      <p className="text-xs text-slate-400">
                        S/N: {item.serial_number}
                      </p>
                    )}
                    
                    {componentHealths[item.id] && (
                      <div className="mt-2">
                        <ComponentHealthIndicator
                          status={componentHealths[item.id].aggregatedStatus}
                          componentCount={componentHealths[item.id].componentCount}
                          statusBreakdown={componentHealths[item.id].statusBreakdown}
                          size="sm"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="secondary" className="text-xs bg-slate-600 text-slate-200">
                        {getStatusText(item.status)}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => setSelectedEquipment(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.status !== 'archived' && item.status === 'disabled' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                            onClick={() => handleStatusChange(item.id, 'enable')}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status !== 'archived' && item.status !== 'disabled' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-yellow-400"
                            onClick={() => handleStatusChange(item.id, 'disable')}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status !== 'archived' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                            onClick={() => handleStatusChange(item.id, 'archive')}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => handleDeleteEquipment(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Wizard для создания */}
        <EquipmentWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          tradingPointId={selectedTradingPointId}
          templates={templates}
          onSubmit={handleCreateEquipment}
          loading={loading}
        />

        {/* Карточка детальной информации */}
        <EquipmentDetailCard
          open={!!selectedEquipment}
          onOpenChange={(open) => !open && setSelectedEquipment(null)}
          equipment={selectedEquipment}
          onUpdate={handleUpdateEquipment}
          onStatusChange={handleStatusChange}
          onLoadEvents={handleLoadEvents}
        />

        {/* Редактор команд оборудования */}
        <EquipmentCommandsEditor
          open={!!editingCommandsEquipmentId}
          onClose={handleCloseCommandsEditor}
          equipment={equipment?.find(eq => eq.id === editingCommandsEquipmentId)}
          onSave={handleCommandsSaved}
        />
      </MainLayout>
    );
  }

  // Десктопная версия - таблица
  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
              <p className="text-slate-400 mt-1">
                {selectedTradingPoint === "all" ? "Все торговые точки" : (tradingPointInfo ? tradingPointInfo.name : 'Торговая точка не выбрана')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <HelpButton helpKey="equipment" />
              <Button
                variant="outline"
                onClick={handleScanTradingPoint}
                disabled={scanningTradingPoint || loading}
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                {scanningTradingPoint ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4 mr-2" />
                )}
                Создать резервуары
              </Button>
            </div>
          </div>
        </div>

        {/* Секция оборудования */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg w-full">
          {/* Заголовок секции с кнопкой добавления */}
          <div className="px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⚙️</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Установленное оборудование</h2>
                  {!loading && equipment && equipment && equipment.length > 0 && (
                    <p className="text-sm text-slate-400">
                      Всего единиц: {equipment && equipment.length}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setIsWizardOpen(true)} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить из шаблона
              </Button>
            </div>
          </div>

          {/* Состояния загрузки, ошибки и пустого списка */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-400">Загрузка оборудования...</span>
            </div>
          )}

          {error && (
            <div className="px-6 py-8 text-center">
              <div className="text-red-400 mb-2">{error}</div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => loadEquipment()}
              >
                Попробовать снова
              </Button>
            </div>
          )}

          {!loading && !error && equipment && equipment.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Settings className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Нет оборудования</h3>
              <p className="text-slate-400 mb-4">
                На этой торговой точке пока нет оборудования.
              </p>
              <Button 
                onClick={() => setIsWizardOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить первое оборудование
              </Button>
            </div>
          )}

          {/* Таблица с оборудованием */}
          {!loading && !error && equipment && equipment.length > 0 && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-full table-fixed">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '5%'}}></th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '30%'}}>НАЗВАНИЕ</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '20%'}}>ТИП</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СЕРИЙНЫЙ НОМЕР</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>КОМПОНЕНТЫ</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>СТАТУС</th>
                    <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '10%'}}>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800">
                  {equipment.map((item) => {
                    const template = templates.find(t => t.id === item.template_id);
                    const isExpanded = expandedRows.includes(item.id);
                    const componentsCount = item.componentsCount || 0;
                    
                    return (
                      <>
                        <tr
                          key={item.id}
                          className="border-b border-slate-600 hover:bg-slate-700 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(item.id)}
                              className="p-0 h-6 w-6 text-slate-400 hover:text-white"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                          <td 
                            className="px-6 py-4 font-medium text-white cursor-pointer"
                            onClick={() => setSelectedEquipment(item)}
                          >
                            {item.display_name}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {template?.name || "Неизвестный тип"}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {item.serial_number || "—"}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {componentHealths[item.id] ? (
                              <ComponentHealthIndicator
                                status={componentHealths[item.id].aggregatedStatus}
                                componentCount={componentHealths[item.id].componentCount}
                                statusBreakdown={componentHealths[item.id].statusBreakdown}
                                size="sm"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="rounded-full p-1 bg-slate-700 border border-slate-600">
                                  <div className="h-3 w-3 rounded-full bg-slate-600 animate-pulse" />
                                </div>
                                <span className="text-xs font-medium text-slate-500">...</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant="secondary" className="bg-slate-600 text-slate-200 flex items-center gap-2 w-fit">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(item.status))} />
                              {getStatusText(item.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => setSelectedEquipment(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {item.status !== 'archived' && item.status === 'disabled' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                                  onClick={() => handleStatusChange(item.id, 'enable')}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                              )}
                              {item.status !== 'archived' && item.status !== 'disabled' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-yellow-400"
                                  onClick={() => handleStatusChange(item.id, 'disable')}
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              )}
                              {item.status !== 'archived' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                  onClick={() => handleStatusChange(item.id, 'archive')}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                onClick={() => handleDeleteEquipment(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Раскрывающийся контент с управлением оборудованием и компонентами */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="bg-slate-900/50 border-l-4 border-blue-500/20 ml-6 mr-2 mb-2">
                                <div className="space-y-4 p-6">
                                  {/* Панель управления оборудованием */}
                                  <EquipmentCommandsPanel 
                                    equipment={item}
                                    onRefresh={() => loadEquipment()}
                                    onEditCommands={handleEditCommands}
                                  />
                                  
                                  {/* Разделитель */}
                                  <div className="border-t border-slate-700"></div>
                                  
                                  {/* Заголовок для компонентов */}
                                  <div className="flex items-center gap-2">
                                    <Layers3 className="w-5 h-5 text-slate-400" />
                                    <h4 className="font-medium text-slate-100">Компоненты оборудования</h4>
                                  </div>
                                  
                                  {/* Список компонентов */}
                                  <EquipmentComponentsList 
                                    equipmentId={item.id}
                                    onEditComponent={handleEditComponent}
                                    onDeleteComponent={handleDeleteComponent}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Wizard для создания */}
      <EquipmentWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        tradingPointId={selectedTradingPointId}
        templates={templates}
        onSubmit={handleCreateEquipment}
        loading={loading}
      />

      {/* Карточка детальной информации */}
      <EquipmentDetailCard
        open={!!selectedEquipment}
        onOpenChange={(open) => !open && setSelectedEquipment(null)}
        equipment={selectedEquipment}
        onUpdate={handleUpdateEquipment}
        onStatusChange={handleStatusChange}
        onLoadEvents={handleLoadEvents}
      />

      {/* Редактор команд оборудования */}
      <EquipmentCommandsEditor
        open={!!editingCommandsEquipmentId}
        onClose={handleCloseCommandsEditor}
        equipment={equipment?.find(eq => eq.id === editingCommandsEquipmentId)}
        onSave={handleCommandsSaved}
      />
    </MainLayout>
  );
}