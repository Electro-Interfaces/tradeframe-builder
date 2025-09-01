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
  MoreHorizontal, 
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
  Layers3
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Компоненты оборудования
import { EquipmentWizard } from "@/components/equipment/EquipmentWizard";
import { EquipmentDetailCard } from "@/components/equipment/EquipmentDetailCard";

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
  currentEquipmentTemplatesAPI 
} from "@/services/equipment";
import { tradingPointsStore } from "@/mock/tradingPointsStore";

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
  const tradingPointInfo = useMemo(() => {
    return selectedTradingPoint 
      ? tradingPointsStore.getById(selectedTradingPoint) 
      : null;
  }, [selectedTradingPoint]);
    
  
  // Основное состояние
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [templates, setTemplates] = useState<EquipmentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  
  // Модальные окна
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  // Расширенные ряды таблицы
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
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
      await currentEquipmentAPI.update(id, data);
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
              {/* Предупреждение о демо режиме */}
              <div className="mt-2 text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded border border-amber-500/20">
                ⚠️ ДЕМО: Данные не сохраняются
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsWizardOpen(true)} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
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

          {!loading && !error && equipment.length === 0 && (
            <EmptyState
              icon={Settings}
              title="Нет оборудования"
              description="На этой торговой точке пока нет оборудования"
              className="py-8"
            />
          )}

          {!loading && !error && equipment.length > 0 && (
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
                    
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="secondary" className="text-xs bg-slate-600 text-slate-200">
                        {getStatusText(item.status)}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedEquipment(item)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          {item.status !== 'archived' && (
                            <>
                              <DropdownMenuSeparator />
                              {item.status === 'disabled' ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'enable')}>
                                  <Power className="w-4 h-4 mr-2" />
                                  Включить
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'disable')}>
                                  <PowerOff className="w-4 h-4 mr-2" />
                                  Отключить
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(item.id, 'archive')}
                                className="text-destructive"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Архивировать
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      </MainLayout>
    );
  }

  // Десктопная версия - таблица
  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
          <p className="text-slate-400 mt-1">
            {tradingPointInfo ? tradingPointInfo.name : 'Торговая точка не выбрана'}
          </p>
          {/* Предупреждение о демо режиме */}
          <div className="mt-3 text-xs text-amber-400 bg-amber-900/20 px-3 py-1 rounded border border-amber-500/20">
            ⚠️ ДЕМО РЕЖИМ: Данные не сохраняются между сессиями (в production заменить на реальное API)
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
                  {!loading && equipment.length > 0 && (
                    <p className="text-sm text-slate-400">
                      Всего единиц: {equipment.length}
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

          {!loading && !error && equipment.length === 0 && (
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
          {!loading && !error && equipment.length > 0 && (
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
                            {componentsCount > 0 ? (
                              <div className="flex items-center gap-2">
                                <Layers3 className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-white">{componentsCount}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant="secondary" className="bg-slate-600 text-slate-200 flex items-center gap-2 w-fit">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(item.status))} />
                              {getStatusText(item.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => setSelectedEquipment(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {item.status !== 'archived' && (
                                    <>
                                      {item.status === 'disabled' ? (
                                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'enable')}>
                                          <Power className="w-4 h-4 mr-2" />
                                          Включить
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'disable')}>
                                          <PowerOff className="w-4 h-4 mr-2" />
                                          Отключить
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusChange(item.id, 'archive')}
                                        className="text-destructive"
                                      >
                                        <Archive className="w-4 h-4 mr-2" />
                                        Архивировать
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Раскрывающийся контент с компонентами */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="bg-slate-900/50 border-l-4 border-blue-500/20 ml-6 mr-2 mb-2">
                                <div className="p-6">
                                  <div className="flex items-center justify-center py-8">
                                    <div className="text-center">
                                      <Layers3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                      <p className="text-slate-400 text-sm">
                                        Компоненты будут доступны в следующей версии
                                      </p>
                                      <Badge variant="outline" className="mt-2">
                                        Скоро
                                      </Badge>
                                    </div>
                                  </div>
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
    </MainLayout>
  );
}