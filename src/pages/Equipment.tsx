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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, CalendarIcon, MapPin, ChevronDown, ChevronRight, Layers3, MoreHorizontal, Play, Terminal } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { CommandHistory, CommandExecutionHistory } from "@/components/ui/command-history";

// Mock данные для шаблонов оборудования (должны синхронизироваться с EquipmentTypes)
const mockEquipmentTemplates = [
  {
    id: "1",
    name: "ТРК Tokheim Quantium 310",
    technical_code: "TQK_Q310",
    system_type: "fuel_dispenser",
    status: true,
    availableCommandIds: ["1", "2", "4", "5"], // Привязанные команды
  },
  {
    id: "2", 
    name: "Резервуар топливный 50м³",
    technical_code: "TANK_50K",
    system_type: "fuel_tank",
    status: true,
    availableCommandIds: ["1", "4"], // Привязанные команды
  },
  {
    id: "3",
    name: "POS-терминал Ingenico iCT250",
    technical_code: "POS_ICT250",
    system_type: "pos_system",
    status: true,
    availableCommandIds: ["1", "3", "4"], // Привязанные команды
  },
];

// Mock данные команд (синхронизированы с Commands.tsx)
const mockAvailableCommands = [
  {
    id: "1",
    name: "Перезагрузить устройство",
    code: "REBOOT_DEVICE",
    targetType: "equipment",
    isActive: true,
    jsonSchema: '{"type": "object", "properties": {"force": {"type": "boolean", "title": "Принудительная перезагрузка", "description": "Принудительно перезагрузить без сохранения состояния"}}, "required": []}',
  },
  {
    id: "2", 
    name: "Установить цену топлива",
    code: "SET_FUEL_PRICE",
    targetType: "equipment",
    isActive: true,
    jsonSchema: '{"type": "object", "properties": {"price": {"type": "number", "title": "Цена за литр", "description": "Новая цена топлива в рублях", "minimum": 0}, "fuel_type": {"type": "string", "title": "Тип топлива", "enum": ["АИ-92", "АИ-95", "АИ-98", "ДТ"], "description": "Выберите тип топлива"}}, "required": ["price", "fuel_type"]}',
  },
  {
    id: "3",
    name: "Обновить прошивку",
    code: "UPDATE_FIRMWARE", 
    targetType: "equipment",
    isActive: true,
    jsonSchema: '{"type": "object", "properties": {"version": {"type": "string", "title": "Версия прошивки", "description": "Номер версии прошивки для установки"}, "backup": {"type": "boolean", "title": "Создать резервную копию", "description": "Создать резервную копию текущей прошивки"}}, "required": ["version"]}',
  },
  {
    id: "4",
    name: "Получить статус",
    code: "GET_STATUS",
    targetType: "equipment", 
    isActive: true,
    jsonSchema: '{"type": "object", "properties": {}, "required": []}', // Без параметров
  },
  {
    id: "5",
    name: "Остановить топливоотдачу",
    code: "STOP_FUELING",
    targetType: "equipment",
    isActive: true,
    jsonSchema: '{"type": "object", "properties": {"emergency": {"type": "boolean", "title": "Экстренная остановка", "description": "Экстренная остановка всех пистолетов"}}, "required": []}',
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

// Mock данные истории выполнения команд
const mockCommandHistory: CommandExecutionHistory[] = [
  {
    id: "h1",
    commandId: "1",
    commandName: "Перезагрузить устройство",
    commandCode: "REBOOT_DEVICE",
    userId: "1",
    userName: "Иван Иванов",
    executedAt: new Date("2024-08-30T14:30:00"),
    status: "success",
    parameters: { force: false },
    duration: 3200,
  },
  {
    id: "h2",
    commandId: "2",
    commandName: "Установить цену топлива",
    commandCode: "SET_FUEL_PRICE",
    userId: "2",
    userName: "Мария Петрова",
    executedAt: new Date("2024-08-30T12:15:00"),
    status: "success",
    parameters: { price: 52.50, fuel_type: "АИ-95" },
    duration: 1800,
  },
  {
    id: "h3",
    commandId: "4",
    commandName: "Получить статус",
    commandCode: "GET_STATUS",
    userId: "1",
    userName: "Иван Иванов",
    executedAt: new Date("2024-08-30T11:45:00"),
    status: "error",
    parameters: {},
    errorMessage: "Устройство не отвечает",
    duration: 5000,
  },
  {
    id: "h4",
    commandId: "5",
    commandName: "Остановить топливоотдачу",
    commandCode: "STOP_FUELING",
    userId: "3",
    userName: "Петр Смирнов",
    executedAt: new Date("2024-08-29T16:20:00"),
    status: "success",
    parameters: { emergency: true },
    duration: 500,
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
  const [commandHistory, setCommandHistory] = useState<CommandExecutionHistory[]>(mockCommandHistory);
  const [expandedEquipment, setExpandedEquipment] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateComponentModalOpen, setIsCreateComponentModalOpen] = useState(false);
  const [isEditComponentModalOpen, setIsEditComponentModalOpen] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 - выбор шаблона, 2 - заполнение данных
  const [currentComponentStep, setCurrentComponentStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedComponentTemplateId, setSelectedComponentTemplateId] = useState<string>("");
  const [editingEquipment, setEditingEquipment] = useState<EquipmentInstance | null>(null);
  const [editingComponent, setEditingComponent] = useState<ComponentInstance | null>(null);
  const [currentEquipmentId, setCurrentEquipmentId] = useState<string>("");
  const [selectedCommand, setSelectedCommand] = useState<any>(null);
  const [targetEquipment, setTargetEquipment] = useState<EquipmentInstance | null>(null);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

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

  // Функции для выполнения команд
  const handleExecuteCommand = (equipment: EquipmentInstance, command: any) => {
    setTargetEquipment(equipment);
    setSelectedCommand(command);
    setIsCommandModalOpen(true);
  };

  const executeCommand = async (parameters: any) => {
    if (!selectedCommand || !targetEquipment) return;

    setIsExecutingCommand(true);

    // Симуляция отправки команды
    toast({
      title: "Команда отправлена",
      description: `Команда "${selectedCommand.name}" отправлена на выполнение`,
    });

    // Добавляем запись в историю
    const newHistoryEntry: CommandExecutionHistory = {
      id: `h_${Date.now()}`,
      commandId: selectedCommand.id,
      commandName: selectedCommand.name,
      commandCode: selectedCommand.code,
      userId: "1", // В реальном приложении - текущий пользователь
      userName: "Текущий пользователь",
      executedAt: new Date(),
      status: "pending",
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    };

    setCommandHistory(prev => [newHistoryEntry, ...prev]);

    // Симуляция выполнения (2-3 секунды)
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% успешности
      
      setCommandHistory(prev => 
        prev.map(item => 
          item.id === newHistoryEntry.id 
            ? {
                ...item,
                status: success ? "success" : "error",
                duration: Math.floor(Math.random() * 3000) + 500,
                errorMessage: success ? undefined : "Устройство не отвечает или команда не поддерживается"
              }
            : item
        )
      );

      toast({
        title: success ? "Команда выполнена" : "Ошибка выполнения",
        description: success 
          ? `Команда "${selectedCommand.name}" успешно выполнена на "${targetEquipment.name}"` 
          : `Ошибка при выполнении команды "${selectedCommand.name}"`,
        variant: success ? "default" : "destructive"
      });

      setIsExecutingCommand(false);
      setIsCommandModalOpen(false);
      setSelectedCommand(null);
      setTargetEquipment(null);
    }, Math.random() * 2000 + 1000);
  };

  const getAvailableCommands = (equipmentTemplateId: string) => {
    const template = mockEquipmentTemplates.find(t => t.id === equipmentTemplateId);
    if (!template?.availableCommandIds) return [];
    
    return mockAvailableCommands.filter(cmd => 
      template.availableCommandIds.includes(cmd.id) && cmd.isActive
    );
  };

  const getEquipmentHistory = (equipmentId: string) => {
    // В реальном приложении здесь будет фильтрация по equipment_id
    return commandHistory.slice(0, 10); // Показываем последние 10 записей для демонстрации
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(equipment)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              
                              {getAvailableCommands(equipment.template_id).length > 0 && (
                                <>
                                  <div className="h-px bg-border my-1" />
                                  {getAvailableCommands(equipment.template_id).map((command) => (
                                    <DropdownMenuItem 
                                      key={command.id}
                                      onClick={() => handleExecuteCommand(equipment, command)}
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      {command.name}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                              
                              <div className="h-px bg-border my-1" />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEquipment(equipment)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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