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
  currentEquipmentAPI, 
  currentEquipmentTemplatesAPI,
  getEquipmentComponentsHealth,
  ComponentHealthStatus
} from "@/services/equipment";
import { currentComponentsAPI } from "@/services/components";
import { tradingPointsService } from "@/services/tradingPointsService";
import { tradingPointScanService } from "@/services/tradingPointScanService";
import { tanksService } from "@/services/tanksService";
import ComponentHealthIndicator from "@/components/ui/ComponentHealthIndicator";
import { Component } from "@/types/component";

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
    if (selectedTradingPoint) {
      tradingPointsService.getById(selectedTradingPoint).then(setTradingPointInfo);
    } else {
      setTradingPointInfo(null);
    }
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
  
  // Загрузка шаблонов с мемоизацией
  const loadTemplates = useCallback(async () => {
    try {
      const templatesData = await currentEquipmentTemplatesAPI.list();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить шаблоны",
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

  // Загрузка оборудования с мемоизацией
  const loadEquipment = useCallback(async () => {
    if (!selectedTradingPointId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await currentEquipmentAPI.list({
        trading_point_id: selectedTradingPointId
      });
      setEquipment(response.data);
      
      // Загружаем статусы компонентов для каждого оборудования
      await loadComponentHealths(response.data);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      setError('Не удалось загрузить оборудование');
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить оборудование",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTradingPointId, toast]);

  // Обработчики событий
  const handleCreateEquipment = async (data: CreateEquipmentRequest) => {
    try {
      await currentEquipmentAPI.create(data);
      toast({
        title: "Успех",
        description: "Оборудование успешно создано"
      });
      loadEquipment();
      setIsWizardOpen(false);
    } catch (error) {
      console.error('Failed to create equipment:', error);
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
      // Получаем текущие данные оборудования перед обновлением
      const currentEquipment = equipment.find(eq => eq.id === id);
      
      // Обновляем оборудование
      await currentEquipmentAPI.update(id, data);
      
      // Если это топливный резервуар и были изменены параметры, синхронизируем с резервуарами
      if (currentEquipment?.system_type === "fuel_tank" && data.params) {
        try {
          // Ищем связанный резервуар по названию оборудования
          const tanks = await tanksService.getTanks();
          const linkedTank = tanks.find(tank => 
            tank.name === (data.display_name || currentEquipment.display_name)
          );
          
          if (linkedTank) {
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
          console.warn('Failed to sync tank data:', tankError);
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
      console.error('Failed to update equipment:', error);
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
      await currentEquipmentAPI.setStatus(id, action);
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
      console.error('Failed to change status:', error);
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
      return await currentEquipmentAPI.getEvents(equipmentId);
    } catch (error) {
      console.error('Failed to load events:', error);
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
      await currentEquipmentAPI.delete(equipmentId);
      
      toast({
        title: "Оборудование удалено",
        description: "Оборудование успешно удалено из системы",
      });
      
      // Перезагружаем список оборудования
      await loadEquipment();
    } catch (error) {
      console.error('Ошибка удаления оборудования:', error);
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
      await currentComponentsAPI.delete(component.id);
      
      toast({
        title: "Компонент удален",
        description: `Компонент "${component.display_name}" успешно удален`,
      });
      
      // Перезагружаем список оборудования чтобы обновить количество компонентов
      await loadEquipment();
    } catch (error) {
      console.error('Ошибка удаления компонента:', error);
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить компонент. Попробуйте снова.",
        variant: "destructive"
      });
    }
  };

  // Получение данных от торговой точки через торговое API
  const handleScanTradingPoint = async () => {
    if (!selectedTradingPointId) return;
    
    try {
      setScanningTradingPoint(true);

      toast({
        title: "Запуск сканирования",
        description: "Опрашиваем торговую точку через торговое API...",
      });

      // Сканируем торговую точку
      const scanResult = await tradingPointScanService.scanTradingPoint(selectedTradingPointId);
      
      if (!scanResult.success) {
        throw new Error(scanResult.errors?.join(', ') || 'Неизвестная ошибка сканирования');
      }

      if (scanResult.equipment_found.length === 0) {
        toast({
          title: "Сканирование завершено",
          description: "Новое оборудование не найдено",
        });
        return;
      }

      toast({
        title: "Найдено оборудование",
        description: `Найдено ${scanResult.equipment_found.length} единиц оборудования. Добавляем к торговой точке...`,
      });

      // Добавляем найденное оборудование
      const addResult = await tradingPointScanService.addDiscoveredEquipment(
        selectedTradingPointId, 
        scanResult.equipment_found
      );

      // Показываем результат
      if (addResult.added.length > 0) {
        const totalComponents = scanResult.components_found.length;
        toast({
          title: "Сканирование завершено успешно",
          description: `Добавлено ${addResult.added.length} единиц оборудования и ${totalComponents} компонентов`,
        });
      }

      // Показываем ошибки, если есть
      if (addResult.errors.length > 0) {
        console.warn('Ошибки при добавлении:', addResult.errors);
        toast({
          title: "Частичные ошибки",
          description: `${addResult.errors.length} ошибок при добавлении. Смотрите консоль.`,
          variant: "destructive",
        });
      }

      // Обновляем список оборудования
      loadEquipment();

    } catch (error: any) {
      console.error('Ошибка сканирования:', error);
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
  if (!selectedTradingPoint) {
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
                {tradingPointInfo ? tradingPointInfo.name : 'Торговая точка не выбрана'}
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
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Scan className="w-3 h-3" />
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
          equipment={equipment.find(eq => eq.id === editingCommandsEquipmentId)}
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
                {tradingPointInfo ? tradingPointInfo.name : 'Торговая точка не выбрана'}
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
                Получить данные от ТТ
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
        equipment={equipment.find(eq => eq.id === editingCommandsEquipmentId)}
        onSave={handleCommandsSaved}
      />
    </MainLayout>
  );
}