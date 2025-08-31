import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/context/SelectionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MapPin, ChevronDown, ChevronRight, Layers3, MoreHorizontal, Settings, AlertCircle, CheckCircle2, XCircle, Power, PowerOff, Archive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Новые компоненты
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { EquipmentWizard } from "@/components/equipment/EquipmentWizard";
import { EquipmentDetailCard } from "@/components/equipment/EquipmentDetailCard";

// Новые типы и API
import { 
  Equipment, 
  EquipmentTemplate,
  EquipmentFilters as IEquipmentFilters, 
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
  
  // Основное состояние
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [templates, setTemplates] = useState<EquipmentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [filters, setFilters] = useState<IEquipmentFilters>({});
  
  // Модальные окна
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailCardOpen, setIsDetailCardOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  // Расширенные ряды таблицы
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // ID выбранной торговой точки
  const selectedTradingPointId = selectedTradingPoint?.id;


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
  }, [selectedTradingPointId, filters]);
  
  // Загрузка шаблонов
  const loadTemplates = async () => {
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
  };
  
  // Загрузка оборудования
  const loadEquipment = async () => {
    if (!selectedTradingPointId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await currentEquipmentAPI.list({
        trading_point_id: selectedTradingPointId,
        ...filters
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
  };

  // Обработчики событий
  const handleCreateEquipment = async (data: CreateEquipmentRequest) => {
    try {
      await currentEquipmentAPI.create(data);
      toast({
        title: "Успех",
        description: "Оборудование успешно создано"
      });
      loadEquipment();
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
  
  const handleEquipmentClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsDetailCardOpen(true);
  };
  
  const handleDeleteEquipment = async (equipment: Equipment) => {
    try {
      await handleStatusChange(equipment.id, 'archive');
    } catch (error) {
      // Ошибка уже обработана в handleStatusChange
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
      <MainLayout>
        <EmptyState
          icon={MapPin}
          title="Выберите торговую точку" 
          description="Для просмотра оборудования необходимо выбрать торговую точку в селекторе."
          className="py-16"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              Оборудование на ТТ "{selectedTradingPoint.name}"
            </h1>
            <p className="text-muted-foreground mt-1">
              Управление оборудованием торговой точки
            </p>
          </div>
          
          <Button onClick={() => setIsWizardOpen(true)} disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить из шаблона
          </Button>
        </div>
        
        {/* Фильтры */}
        <div className="mb-6">
          <EquipmentFilters
            filters={filters}
            onFiltersChange={setFilters}
            templates={templates}
            loading={loading}
          />
        </div>







        <div className="w-full h-full -mx-4 md:-mx-6 lg:-mx-8">
          <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
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
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      На этой торговой точке пока нет оборудования.
                      <br />
                      Нажмите "Добавить оборудование", чтобы создать первое.
                    </td>
                  </tr>
                ) : (
                filteredEquipment.map((equipment) => {
                  const template = mockEquipmentTemplates.find(t => t.id === equipment.template_id);
                  const isExpanded = expandedEquipment.includes(equipment.id);
                  const componentsCount = equipment.components?.length || 0;
                  
                  return (
                    <>
                      <tr
                        key={equipment.id}
                        className={`border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEquipmentExpansion(equipment.id)}
                            className="p-0 h-6 w-6 text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{equipment.name}</td>
                        <td className="px-6 py-4 text-slate-400">{template?.name || "Неизвестный тип"}</td>
                        <td className="px-6 py-4 text-slate-400">{equipment.serial_number || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Layers3 className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-white">{componentsCount}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-slate-600 text-slate-200 flex items-center gap-2 w-fit">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(equipment.status)}`} />
                            {getStatusText(equipment.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => openEditModal(equipment)}
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
                                {getAvailableCommands(equipment.template_id).length > 0 && (
                                  <>
                                    {getAvailableCommands(equipment.template_id).map((command) => (
                                      <DropdownMenuItem 
                                        key={command.id}
                                        onClick={() => handleExecuteCommand(equipment, command)}
                                      >
                                        <Play className="w-4 h-4 mr-2" />
                                        {command.name}
                                      </DropdownMenuItem>
                                    ))}
                                    <div className="h-px bg-border my-1" />
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteEquipment(equipment)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Раскрывающийся контент с компонентами */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <div className="bg-muted/20 border-l-4 border-primary/20 ml-6 mr-2 mb-2">
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-medium text-sm">
                                    Компоненты в составе "{equipment.name}"
                                  </h4>
                                  <Button
                                    size="sm"
                                    onClick={() => openCreateComponentModal(equipment.id)}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Добавить компонент
                                  </Button>
                                </div>
                                
                                {equipment.components && equipment.components.length > 0 ? (
                                  <div className="border rounded-md bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs">Название</TableHead>
                                          <TableHead className="text-xs">Тип</TableHead>
                                          <TableHead className="text-xs">Серийный номер</TableHead>
                                          <TableHead className="text-xs">Статус</TableHead>
                                          <TableHead className="text-xs text-right">Действия</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {equipment.components.map((component) => {
                                          const componentTemplate = mockComponentTemplates.find(t => t.id === component.template_id);
                                          return (
                                            <TableRow key={component.id}>
                                              <TableCell className="text-sm">{component.name}</TableCell>
                                              <TableCell className="text-sm">{componentTemplate?.name || "Неизвестный тип"}</TableCell>
                                              <TableCell className="text-sm">{component.serial_number || "—"}</TableCell>
                                              <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                  <div className={`w-1.5 h-1.5 rounded-full mr-1 ${getStatusColor(component.status)}`} />
                                                  {getStatusText(component.status)}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditComponentModal(component)}
                                                  >
                                                    <Edit className="w-3 h-3" />
                                                  </Button>
                                                  
                                                  <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                      <Button variant="outline" size="sm">
                                                        <Trash2 className="w-3 h-3" />
                                                      </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                        <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          Вы уверены, что хотите удалить компонент "{component.name}"?
                                                        </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteComponent(component)}>
                                                          Удалить
                                                        </AlertDialogAction>
                                                      </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                  </AlertDialog>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground text-sm">
                                    В составе этого оборудования пока нет компонентов.
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Модальное окно редактирования */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактирование оборудования</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEditEquipment)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: ТРК-1 у въезда" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Серийный номер</FormLabel>
                      <FormControl>
                        <Input placeholder="Серийный номер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="external_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Внешний ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Уникальный ID во внешней системе" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installation_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Дата установки</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Выберите дату</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Статус</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">Сохранить</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Модальное окно создания компонента */}
        <Dialog open={isCreateComponentModalOpen} onOpenChange={(open) => {
          setIsCreateComponentModalOpen(open);
          if (!open) resetCreateComponentModal();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentComponentStep === 1 ? "Выбор типа компонента" : "Данные экземпляра компонента"}
              </DialogTitle>
            </DialogHeader>

            {currentComponentStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="component-template-select">Выберите тип компонента</Label>
                  <Select value={selectedComponentTemplateId} onValueChange={setSelectedComponentTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип компонента" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockComponentTemplates
                        .filter(template => template.status)
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateComponentModalOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleNextComponentStep}
                    disabled={!selectedComponentTemplateId}
                  >
                    Далее
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...componentForm}>
                <form onSubmit={componentForm.handleSubmit(handleCreateComponent)} className="space-y-4">
                  <FormField
                    control={componentForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название</FormLabel>
                        <FormControl>
                          <Input placeholder="Например: Датчик уровня топлива" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={componentForm.control}
                    name="serial_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Серийный номер</FormLabel>
                        <FormControl>
                          <Input placeholder="Серийный номер" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={componentForm.control}
                    name="external_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Внешний ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Уникальный ID во внешней системе" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={componentForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Статус</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handlePrevComponentStep}>
                      Назад
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreateComponentModalOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">Сохранить</Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        {/* Модальное окно редактирования компонента */}
        <Dialog open={isEditComponentModalOpen} onOpenChange={setIsEditComponentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактирование компонента</DialogTitle>
            </DialogHeader>

            <Form {...componentForm}>
              <form onSubmit={componentForm.handleSubmit(handleEditComponent)} className="space-y-4">
                <FormField
                  control={componentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: Датчик уровня топлива" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={componentForm.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Серийный номер</FormLabel>
                      <FormControl>
                        <Input placeholder="Серийный номер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={componentForm.control}
                  name="external_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Внешний ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Уникальный ID во внешней системе" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={componentForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Статус</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditComponentModalOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">Сохранить</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        {/* Модальное окно выполнения команды */}
        <Dialog open={isCommandModalOpen} onOpenChange={setIsCommandModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Выполнить команду: {selectedCommand?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCommand && targetEquipment && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Целевое оборудование:</div>
                  <div className="font-medium">{targetEquipment.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ID: {targetEquipment.external_id}
                  </div>
                </div>
                
                <DynamicForm
                  jsonSchema={selectedCommand.jsonSchema || '{"type": "object", "properties": {}, "required": []}'}
                  onSubmit={executeCommand}
                  onCancel={() => setIsCommandModalOpen(false)}
                  isLoading={isExecutingCommand}
                  submitText="Выполнить команду"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Обновленное модальное окно редактирования с вкладками */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать оборудование</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Основные данные</TabsTrigger>
                <TabsTrigger value="history">История команд</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-6">
                {editingEquipment && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEditEquipment)} className="space-y-4">
                      {/* ... существующие поля формы ... */}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditModalOpen(false)}
                        >
                          Отмена
                        </Button>
                        <Button type="submit">Сохранить</Button>
                      </div>
                    </form>
                  </Form>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                {editingEquipment && (
                  <CommandHistory 
                    history={getEquipmentHistory(editingEquipment.id)}
                    equipmentId={editingEquipment.id}
                    equipmentName={editingEquipment.name}
                  />
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* ... остальные модальные окна ... */}
      </div>
    </MainLayout>
  );
}