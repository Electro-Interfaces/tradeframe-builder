import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, CalendarIcon, MapPin, ChevronDown, ChevronRight, Layers3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Mock данные для шаблонов оборудования (должны синхронизироваться с EquipmentTypes)
const mockEquipmentTemplates = [
  {
    id: "1",
    name: "ТРК Tokheim Quantium 310",
    technical_code: "TQK_Q310",
    system_type: "fuel_dispenser",
    status: true,
  },
  {
    id: "2", 
    name: "Резервуар топливный 50м³",
    technical_code: "TANK_50K",
    system_type: "fuel_tank",
    status: true,
  },
  {
    id: "3",
    name: "POS-терминал Ingenico iCT250",
    technical_code: "POS_ICT250",
    system_type: "pos_system",
    status: true,
  },
];

// Mock данные для шаблонов компонентов (синхронизируются с ComponentTypes)
const mockComponentTemplates = [
  {
    id: "1",
    name: "Датчик уровня ПМП-201",
    technical_code: "PMP_201_LEVEL_SENSOR",
    system_type: "sensor",
    status: true,
  },
  {
    id: "2",
    name: "Платежный терминал Ingenico iCT220",
    technical_code: "PAY_ICT220",
    system_type: "payment_terminal",
    status: true,
  },
  {
    id: "3",
    name: "Дисплей покупателя LED-200",
    technical_code: "DISP_LED200",
    system_type: "display",
    status: true,
  },
];

// Mock данные для торговых точек
const mockTradingPoints = [
  { id: "1", name: "АЗС-5 на Ленина" },
  { id: "2", name: "АЗС-12 на Гагарина" },
];

// Интерфейс для экземпляра компонента
interface ComponentInstance {
  id: string;
  name: string;
  template_id: string;
  serial_number?: string;
  external_id: string;
  status: "online" | "offline" | "error";
  is_active: boolean;
  equipment_id: string;
}

// Интерфейс для экземпляра оборудования
interface EquipmentInstance {
  id: string;
  name: string;
  template_id: string;
  serial_number?: string;
  external_id: string;
  status: "online" | "offline" | "error";
  installation_date?: Date;
  trading_point_id: string;
  is_active: boolean;
  components?: ComponentInstance[];
}

// Mock данные для экземпляров оборудования
const mockEquipmentInstances: EquipmentInstance[] = [
  {
    id: "1",
    name: "ТРК-1 у въезда",
    template_id: "1",
    serial_number: "TQK123456",
    external_id: "TRK_001",
    status: "online",
    installation_date: new Date("2024-01-15"),
    trading_point_id: "1",
    is_active: true,
    components: [
      {
        id: "c1",
        name: "Датчик уровня топлива",
        template_id: "1",
        serial_number: "PMP123",
        external_id: "SENSOR_001",
        status: "online",
        is_active: true,
        equipment_id: "1",
      },
      {
        id: "c2",
        name: "Платежный терминал",
        template_id: "2",
        external_id: "PAY_001",
        status: "online",
        is_active: true,
        equipment_id: "1",
      },
    ],
  },
  {
    id: "2",
    name: "ТРК-2 у выезда", 
    template_id: "1",
    serial_number: "TQK789012",
    external_id: "TRK_002",
    status: "offline",
    installation_date: new Date("2024-02-20"),
    trading_point_id: "1",
    is_active: true,
    components: [
      {
        id: "c3",
        name: "Дисплей покупателя",
        template_id: "3",
        external_id: "DISP_001",
        status: "error",
        is_active: true,
        equipment_id: "2",
      },
    ],
  },
  {
    id: "3",
    name: "Резервуар №1",
    template_id: "2",
    external_id: "TANK_001",
    status: "online",
    trading_point_id: "1",
    is_active: true,
    components: [],
  },
];

// Схемы валидации
const equipmentSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  template_id: z.string().min(1, "Тип оборудования обязателен"),
  serial_number: z.string().optional(),
  external_id: z.string().min(1, "Внешний ID обязателен"),
  is_active: z.boolean().default(true),
  installation_date: z.date().optional(),
});

const componentSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  template_id: z.string().min(1, "Тип компонента обязателен"),
  serial_number: z.string().optional(),
  external_id: z.string().min(1, "Внешний ID обязателен"),
  is_active: z.boolean().default(true),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;
type ComponentFormData = z.infer<typeof componentSchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "online": return "bg-green-500";
    case "offline": return "bg-yellow-500";
    case "error": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "online": return "Онлайн";
    case "offline": return "Офлайн";
    case "error": return "Ошибка";
    default: return "Неизвестно";
  }
};

export default function Equipment() {
  const { toast } = useToast();
  const [equipmentInstances, setEquipmentInstances] = useState<EquipmentInstance[]>(mockEquipmentInstances);
  const [expandedEquipment, setExpandedEquipment] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateComponentModalOpen, setIsCreateComponentModalOpen] = useState(false);
  const [isEditComponentModalOpen, setIsEditComponentModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 - выбор шаблона, 2 - заполнение данных
  const [currentComponentStep, setCurrentComponentStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedComponentTemplateId, setSelectedComponentTemplateId] = useState<string>("");
  const [editingEquipment, setEditingEquipment] = useState<EquipmentInstance | null>(null);
  const [editingComponent, setEditingComponent] = useState<ComponentInstance | null>(null);
  const [currentEquipmentId, setCurrentEquipmentId] = useState<string>("");

  // Для демонстрации используем фиксированную торговую точку
  const selectedTradingPointId = "1";
  const selectedTradingPoint = mockTradingPoints.find(tp => tp.id === selectedTradingPointId);

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: "",
      template_id: "",
      serial_number: "",
      external_id: "",
      is_active: true,
    },
  });

  const componentForm = useForm<ComponentFormData>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: "",
      template_id: "",
      serial_number: "",
      external_id: "",
      is_active: true,
    },
  });

  // Фильтрация оборудования для выбранной торговой точки
  const filteredEquipment = equipmentInstances.filter(
    equipment => equipment.trading_point_id === selectedTradingPointId
  );

  const toggleEquipmentExpansion = (equipmentId: string) => {
    setExpandedEquipment(prev => 
      prev.includes(equipmentId) 
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleCreateEquipment = (data: EquipmentFormData) => {
    const newEquipment: EquipmentInstance = {
      id: Date.now().toString(),
      name: data.name,
      template_id: data.template_id,
      serial_number: data.serial_number,
      external_id: data.external_id,
      status: "offline",
      installation_date: data.installation_date,
      trading_point_id: selectedTradingPointId!,
      is_active: data.is_active,
      components: [],
    };

    setEquipmentInstances(prev => [...prev, newEquipment]);
    setIsCreateModalOpen(false);
    setCurrentStep(1);
    setSelectedTemplateId("");
    form.reset();
    
    toast({
      title: "Успех",
      description: "Оборудование успешно добавлено",
    });
  };

  const handleEditEquipment = (data: EquipmentFormData) => {
    if (!editingEquipment) return;

    const updatedEquipment: EquipmentInstance = {
      ...editingEquipment,
      name: data.name,
      serial_number: data.serial_number,
      external_id: data.external_id,
      installation_date: data.installation_date,
      is_active: data.is_active,
    };

    setEquipmentInstances(prev => 
      prev.map(equipment => 
        equipment.id === editingEquipment.id ? updatedEquipment : equipment
      )
    );

    setIsEditModalOpen(false);
    setEditingEquipment(null);
    form.reset();
    
    toast({
      title: "Успех",
      description: "Оборудование успешно обновлено",
    });
  };

  const handleDeleteEquipment = (equipment: EquipmentInstance) => {
    setEquipmentInstances(prev => prev.filter(e => e.id !== equipment.id));
    
    toast({
      title: "Успех",
      description: "Оборудование успешно удалено",
    });
  };

  const openEditModal = (equipment: EquipmentInstance) => {
    setEditingEquipment(equipment);
    form.reset({
      name: equipment.name,
      template_id: equipment.template_id,
      serial_number: equipment.serial_number || "",
      external_id: equipment.external_id,
      is_active: equipment.is_active,
      installation_date: equipment.installation_date,
    });
    setIsEditModalOpen(true);
  };

  const handleNextStep = () => {
    if (selectedTemplateId) {
      form.setValue("template_id", selectedTemplateId);
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const resetCreateModal = () => {
    setCurrentStep(1);
    setSelectedTemplateId("");
    form.reset();
  };

  // Функции для управления компонентами
  const handleCreateComponent = (data: ComponentFormData) => {
    const newComponent: ComponentInstance = {
      id: Date.now().toString(),
      name: data.name,
      template_id: data.template_id,
      serial_number: data.serial_number,
      external_id: data.external_id,
      status: "offline",
      is_active: data.is_active,
      equipment_id: currentEquipmentId,
    };

    setEquipmentInstances(prev => 
      prev.map(equipment => 
        equipment.id === currentEquipmentId 
          ? { 
              ...equipment, 
              components: [...(equipment.components || []), newComponent] 
            }
          : equipment
      )
    );

    setIsCreateComponentModalOpen(false);
    setCurrentComponentStep(1);
    setSelectedComponentTemplateId("");
    setCurrentEquipmentId("");
    componentForm.reset();
    
    toast({
      title: "Успех",
      description: "Компонент успешно добавлен",
    });
  };

  const handleEditComponent = (data: ComponentFormData) => {
    if (!editingComponent) return;

    const updatedComponent: ComponentInstance = {
      ...editingComponent,
      name: data.name,
      serial_number: data.serial_number,
      external_id: data.external_id,
      is_active: data.is_active,
    };

    setEquipmentInstances(prev => 
      prev.map(equipment => 
        equipment.id === editingComponent.equipment_id
          ? {
              ...equipment,
              components: equipment.components?.map(component =>
                component.id === editingComponent.id ? updatedComponent : component
              ) || []
            }
          : equipment
      )
    );

    setIsEditComponentModalOpen(false);
    setEditingComponent(null);
    componentForm.reset();
    
    toast({
      title: "Успех",
      description: "Компонент успешно обновлен",
    });
  };

  const handleDeleteComponent = (component: ComponentInstance) => {
    setEquipmentInstances(prev => 
      prev.map(equipment => 
        equipment.id === component.equipment_id
          ? {
              ...equipment,
              components: equipment.components?.filter(c => c.id !== component.id) || []
            }
          : equipment
      )
    );
    
    toast({
      title: "Успех",
      description: "Компонент успешно удален",
    });
  };

  const openCreateComponentModal = (equipmentId: string) => {
    setCurrentEquipmentId(equipmentId);
    setIsCreateComponentModalOpen(true);
  };

  const openEditComponentModal = (component: ComponentInstance) => {
    setEditingComponent(component);
    componentForm.reset({
      name: component.name,
      template_id: component.template_id,
      serial_number: component.serial_number || "",
      external_id: component.external_id,
      is_active: component.is_active,
    });
    setIsEditComponentModalOpen(true);
  };

  const handleNextComponentStep = () => {
    if (selectedComponentTemplateId) {
      componentForm.setValue("template_id", selectedComponentTemplateId);
      setCurrentComponentStep(2);
    }
  };

  const handlePrevComponentStep = () => {
    setCurrentComponentStep(1);
  };

  const resetCreateComponentModal = () => {
    setCurrentComponentStep(1);
    setSelectedComponentTemplateId("");
    setCurrentEquipmentId("");
    componentForm.reset();
  };

  // Если торговая точка не выбрана, показать пустое состояние
  if (!selectedTradingPoint) {
    return (
      <MainLayout>
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader className="text-center">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
            <CardTitle>Выберите торговую точку</CardTitle>
            <CardDescription>
              Для просмотра оборудования необходимо выбрать торговую точку в селекторе в заголовке страницы.
            </CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">
            Оборудование на ТТ "{selectedTradingPoint.name}"
          </h1>
          
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            setIsCreateModalOpen(open);
            if (!open) resetCreateModal();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Добавить оборудование
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {currentStep === 1 ? "Выбор типа оборудования" : "Данные экземпляра"}
                </DialogTitle>
              </DialogHeader>

              {currentStep === 1 ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-select">Выберите тип оборудования</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип оборудования" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockEquipmentTemplates
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
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button 
                      onClick={handleNextStep}
                      disabled={!selectedTemplateId}
                    >
                      Далее
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateEquipment)} className="space-y-4">
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
                      <Button type="button" variant="outline" onClick={handlePrevStep}>
                        Назад
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">Сохранить</Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Серийный номер</TableHead>
                <TableHead>Компоненты</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    На этой торговой точке пока нет оборудования.
                    <br />
                    Нажмите "Добавить оборудование", чтобы создать первое.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEquipment.map((equipment) => {
                  const template = mockEquipmentTemplates.find(t => t.id === equipment.template_id);
                  const isExpanded = expandedEquipment.includes(equipment.id);
                  const componentsCount = equipment.components?.length || 0;
                  
                  return (
                    <>
                      <TableRow key={equipment.id} className="group">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEquipmentExpansion(equipment.id)}
                            className="p-0 h-6 w-6"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{equipment.name}</TableCell>
                        <TableCell>{template?.name || "Неизвестный тип"}</TableCell>
                        <TableCell>{equipment.serial_number || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Layers3 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{componentsCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="flex items-center gap-2 w-fit">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(equipment.status)}`} />
                            {getStatusText(equipment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditModal(equipment)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Вы уверены, что хотите удалить оборудование "{equipment.name}"?
                                    Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteEquipment(equipment)}>
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Раскрывающийся контент с компонентами */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
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
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
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
      </div>
    </MainLayout>
  );
}