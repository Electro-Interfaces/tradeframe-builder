import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2, Command, X, Settings, Power } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { equipmentTypesAPI } from "@/services/equipmentTypes";
import { systemTypesAPI, SystemType } from "@/services/systemTypesSupabaseService";
import { SystemTypeDialog } from "@/components/dialogs/SystemTypeDialog";

// Схема валидации
const equipmentTypeSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  code: z.string()
    .min(1, "Технический код обязателен")
    .regex(/^[A-Z0-9_-]+$/, "Код должен содержать только латинские буквы, цифры, _ и -"),
  description: z.string().optional(),
  systemType: z.string().min(1, "Системный тип обязателен"),
  isActive: z.boolean(),
  availableCommandIds: z.array(z.string()).default([]),
  defaultParams: z.record(z.any()).default({}),
});

type EquipmentType = z.infer<typeof equipmentTypeSchema>;

interface EquipmentTypeWithId extends EquipmentType {
  id: string;
}

// Mock данные команд (из Commands.tsx)
const mockAvailableCommands = [
  {
    id: "1",
    name: "Перезагрузить устройство",
    code: "REBOOT_DEVICE",
    targetType: "equipment",
    isActive: true,
  },
  {
    id: "2", 
    name: "Установить цену топлива",
    code: "SET_FUEL_PRICE",
    targetType: "equipment",
    isActive: true,
  },
  {
    id: "3",
    name: "Обновить прошивку",
    code: "UPDATE_FIRMWARE", 
    targetType: "equipment",
    isActive: true,
  },
  {
    id: "4",
    name: "Получить статус",
    code: "GET_STATUS",
    targetType: "equipment", 
    isActive: true,
  },
  {
    id: "5",
    name: "Остановить топливоотдачу",
    code: "STOP_FUELING",
    targetType: "equipment",
    isActive: true,
  },
];

// Удаляем mock данные - теперь используем localStorage через API

export default function EquipmentTypes() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeWithId[]>([]);
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemTypesLoading, setSystemTypesLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentTypeWithId | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EquipmentTypeWithId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [defaultParams, setDefaultParams] = useState<Record<string, any>>({});
  
  // Состояния для управления системными типами
  const [isSystemTypesDialogOpen, setIsSystemTypesDialogOpen] = useState(false);
  const [isSystemTypeDialogOpen, setIsSystemTypeDialogOpen] = useState(false);
  const [editingSystemType, setEditingSystemType] = useState<SystemType | null>(null);
  
  const { toast } = useToast();

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadEquipmentTypes();
    loadSystemTypes();
  }, []);

  const loadEquipmentTypes = async () => {
    try {
      setIsLoading(true);
      const types = await equipmentTypesAPI.list();
      setEquipmentTypes(types as EquipmentTypeWithId[]);
    } catch (error) {
      console.error('Error loading equipment types:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить типы оборудования",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemTypes = async () => {
    try {
      setSystemTypesLoading(true);
      const types = await systemTypesAPI.list();
      setSystemTypes(types);
    } catch (error) {
      console.error('Error loading system types:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить системные типы",
        variant: "destructive"
      });
    } finally {
      setSystemTypesLoading(false);
    }
  };

  // Функция получения метки системного типа
  const getSystemTypeLabel = (value: string) => {
    if (!value || typeof value !== 'string') {
      return '';
    }
    const systemType = systemTypes.find(type => type.value === value);
    return systemType?.label || value;
  };

  // Фильтрация оборудования по поиску с использованием useMemo для оптимизации
  const filteredEquipmentTypes = useMemo(() => {
    try {
      console.log('Filtering equipment. Search query:', searchQuery);
      console.log('Equipment types count:', equipmentTypes.length);
      
      if (!searchQuery || !searchQuery.trim()) {
        return equipmentTypes;
      }
      
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = equipmentTypes.filter(equipment => {
        if (!equipment || !equipment.id) {
          console.warn('Invalid equipment found:', equipment);
          return false;
        }
        
        try {
          const name = (equipment.name || '').toLowerCase();
          const code = (equipment.code || '').toLowerCase();
          const description = (equipment.description || '').toLowerCase();
          const systemTypeLabel = getSystemTypeLabel(equipment.systemType).toLowerCase();
          
          const matches = (
            name.includes(lowerQuery) ||
            code.includes(lowerQuery) ||
            description.includes(lowerQuery) ||
            systemTypeLabel.includes(lowerQuery)
          );
          
          return matches;
        } catch (innerError) {
          console.error('Error processing equipment:', equipment, innerError);
          return false;
        }
      });
      
      console.log('Filtered equipment count:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('Critical error in filtering:', error);
      return equipmentTypes; // Возвращаем все оборудование в случае ошибки
    }
  }, [equipmentTypes, searchQuery]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<EquipmentType>({
    resolver: zodResolver(equipmentTypeSchema),
    mode: "onTouched", // Валидация только после взаимодействия с полем
    defaultValues: {
      name: "",
      code: "",
      description: "",
      systemType: systemTypes[0]?.value || "fuel_tank", // Устанавливаем первый доступный тип с fallback
      isActive: true,
      availableCommandIds: [],
      defaultParams: {},
    },
  });

  const handleCreate = () => {
    const defaultValues = {
      name: "",
      code: "",
      description: "",
      systemType: systemTypes[0]?.value || "fuel_tank", // Устанавливаем первый доступный тип с fallback
      isActive: true,
      availableCommandIds: [],
      defaultParams: {},
    };
    
    // Автоматически загружаем все поля резервуара если выбран fuel_tank
    const initialDefaultParams = defaultValues.systemType === "fuel_tank" ? {
      // Обязательные поля (соответствуют Tank интерфейсу)
      id: 1,
      name: "",
      fuelType: "",
      currentLevelLiters: 0,
      
      // Параметры емкости
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      
      // Физические параметры (синхронизировано с tanksService)
      temperature: 15.0,
      waterLevelMm: 0.0,
      density: 0.725,
      
      // Статус и операционные данные (добавлено из tanksService)
      status: 'active',
      location: "Зона не указана",
      installationDate: new Date().toISOString().split('T')[0],
      lastCalibration: null,
      supplier: null,
      
      // Поля из UI (добавлено)
      sensors: [
        { name: "Уровень", status: "ok" },
        { name: "Температура", status: "ok" }
      ],
      linkedPumps: [],
      notifications: {
        enabled: true,
        drainAlerts: true,
        levelAlerts: true
      },
      
      // Пороговые значения (синхронизировано с tanksService и UI)
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15,
        notifications: {
          critical: true,
          minimum: true,
          temperature: true,
          water: true
        }
      },
      
      // Системные поля
      trading_point_id: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Дополнительные технические параметры
      material: "steel"
    } : {};
    
    console.log("Creating new form with default values:", defaultValues);
    console.log("Auto-loading default params for fuel_tank:", initialDefaultParams);
    
    reset(defaultValues);
    setDefaultParams(initialDefaultParams);
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: EquipmentTypeWithId) => {
    reset(item);
    setDefaultParams(item.defaultParams || {});
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleClone = (item: EquipmentTypeWithId) => {
    reset({
      ...item,
      name: `${item.name} (копия)`,
      code: `${item.code}_COPY`,
    });
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = (item: EquipmentTypeWithId) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = async (data: EquipmentType) => {
    try {
      // Проверка уникальности кода
      const isDuplicateCode = equipmentTypes.some(
        (item) => item.code === data.code && item.id !== editingItem?.id
      );

      if (isDuplicateCode) {
        setError("code", { message: "Технический код должен быть уникальным" });
        return;
      }

      // Добавляем defaultParams к данным формы
      const submitData = {
        ...data,
        defaultParams: defaultParams
      };

      if (editingItem) {
        // Редактирование
        await equipmentTypesAPI.update(editingItem.id, submitData);
        toast({
          title: "Шаблон обновлен",
          description: `Шаблон "${data.name}" успешно обновлен.`,
        });
      } else {
        // Создание
        await equipmentTypesAPI.create(submitData);
        toast({
          title: "Шаблон создан",
          description: `Шаблон "${data.name}" успешно создан.`,
        });
      }

      // Перезагружаем список после изменений
      await loadEquipmentTypes();
      setIsDialogOpen(false);
      setDefaultParams({});
      reset();
    } catch (error) {
      console.error('Error saving equipment type:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить шаблон",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await equipmentTypesAPI.delete(itemToDelete.id);
      toast({
        title: "Шаблон удален",
        description: `Шаблон "${itemToDelete.name}" успешно удален.`,
      });
      
      // Перезагружаем список после удаления
      await loadEquipmentTypes();
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting equipment type:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить шаблон",
        variant: "destructive"
      });
    }
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-2xl font-semibold text-white">Справочник типов оборудования</h1>
          <p className="text-slate-400 mt-2">Создавайте и управляйте шаблонами оборудования с настройкой команд и системных типов</p>
        </div>

        {/* Панель типов оборудования */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700 mx-4 md:mx-6 lg:mx-8">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🔧</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Типы оборудования</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setIsSystemTypesDialogOpen(true)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white flex-shrink-0"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Системные типы
                </Button>
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                >
                  + Создать шаблон оборудования
                </Button>
              </div>
            </div>
            
            {/* Поиск оборудования */}
            <div className="mt-4">
              <Input
                placeholder="Поиск типов оборудования..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>

        {isLoading ? (
          <div className="px-6 pb-6 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-400">Загрузка типов оборудования...</p>
            </div>
          </div>
        ) : equipmentTypes.length === 0 ? (
          <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
            <EmptyState 
              title="Нет типов оборудования" 
              description="Создайте первый шаблон оборудования для начала работы"
              cta={
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Создать шаблон оборудования
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : filteredEquipmentTypes.length === 0 ? (
          <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
            <EmptyState 
              title="Ничего не найдено" 
              description="Попробуйте изменить условия поиска"
              className="py-16"
            />
          </div>
        ) : (
          <>
            {/* Десктоп: таблица на всю ширину */}
            <div className="hidden md:block w-full">
              <div className="mx-4 md:mx-6 lg:mx-8">
          <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
            <table className="w-full text-sm min-w-full table-fixed">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '35%'}}>НАЗВАНИЕ ШАБЛОНА</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '20%'}}>ТЕХНИЧЕСКИЙ КОД</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СИСТЕМНЫЙ ТИП</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СТАТУС</th>
                  <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800">
                {filteredEquipmentTypes.filter(Boolean).map((equipmentType) => equipmentType && equipmentType.id ? (
                  <tr
                    key={equipmentType.id}
                    className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4">
                      <div>
                        <div className="font-medium text-white text-base">{equipmentType.name}</div>
                        {equipmentType.description && (
                          <div className="text-sm text-slate-400">{equipmentType.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                        {equipmentType.code}
                      </code>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                        {getSystemTypeLabel(equipmentType.systemType)}
                      </Badge>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <Badge variant={equipmentType.isActive ? "default" : "secondary"}>
                        {equipmentType.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleEdit(equipmentType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleClone(equipmentType)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                          onClick={() => handleDeleteConfirm(equipmentType)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          </div>
              </div>
        </div>

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 pb-6">
              <div className="mx-4 md:mx-6 lg:mx-8 space-y-3">
              {filteredEquipmentTypes.filter(Boolean).map((equipmentType) => equipmentType && equipmentType.id ? (
                <div
                  key={equipmentType.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{equipmentType.name}</div>
                      {equipmentType.description && (
                        <div className="text-sm text-slate-400 mb-2">{equipmentType.description}</div>
                      )}
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Код:</span>
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                            {equipmentType.code}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Тип:</span>
                          <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                            {getSystemTypeLabel(equipmentType.systemType)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Статус:</span>
                          <Badge variant={equipmentType.isActive ? "default" : "secondary"}>
                            {equipmentType.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleEdit(equipmentType)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleClone(equipmentType)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => handleDeleteConfirm(equipmentType)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null)}
              </div>
            </div>
          </>
        )}
        </div>

        {/* Диалог создания/редактирования */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] sm:w-full flex flex-col p-0">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <DialogTitle>
                  {editingItem ? "Редактировать шаблон" : "Создать шаблон"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? "Внесите изменения в шаблон оборудования."
                    : "Создайте новый шаблон оборудования для использования на торговых точках."
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col flex-1 min-h-0 px-6">
                <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
                  <TabsList className="grid w-full grid-cols-3 h-12 bg-slate-800 border border-slate-600 flex-shrink-0 mb-4">
                    <TabsTrigger 
                      value="basic" 
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 font-medium"
                    >
                      Основные параметры
                    </TabsTrigger>
                    <TabsTrigger 
                      value="defaults" 
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 font-medium"
                    >
                      Значения по умолчанию
                    </TabsTrigger>
                    <TabsTrigger 
                      value="commands" 
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 font-medium"
                    >
                      Доступные команды
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="basic" className="h-full overflow-y-auto pr-2 space-y-4 data-[state=active]:block" style={{scrollbarWidth: 'thin'}}>
                      <div className="pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Название шаблона *</Label>
                      <Input
                        id="name"
                        {...register("name")}
                        placeholder="ТРК Tokheim Quantium 310"
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code">Технический код *</Label>
                      <Input
                        id="code"
                        {...register("code")}
                        placeholder="TQK_Q310"
                        className="font-mono"
                      />
                      {errors.code && (
                        <p className="text-sm text-destructive">
                          {errors.code.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="systemType">Системный тип *</Label>
                    <Select
                      value={watch("systemType")}
                      onValueChange={(value) => {
                        setValue("systemType", value);
                        
                        // Автоматически загружаем все поля резервуара при выборе fuel_tank
                        if (value === "fuel_tank") {
                          const fuelTankParams = {
                            // Обязательные поля (соответствуют Tank интерфейсу)
                            id: 1,
                            name: "",
                            fuelType: "",
                            currentLevelLiters: 0,
                            
                            // Параметры емкости
                            capacityLiters: 50000,
                            minLevelPercent: 20,
                            criticalLevelPercent: 10,
                            
                            // Физические параметры (синхронизировано с tanksService)
                            temperature: 15.0,
                            waterLevelMm: 0.0,
                            density: 0.725,
                            
                            // Статус и операционные данные (добавлено из tanksService)
                            status: 'active',
                            location: "Зона не указана",
                            installationDate: new Date().toISOString().split('T')[0],
                            lastCalibration: null,
                            supplier: null,
                            
                            // Поля из UI (добавлено)
                            sensors: [
                              { name: "Уровень", status: "ok" },
                              { name: "Температура", status: "ok" }
                            ],
                            linkedPumps: [],
                            notifications: {
                              enabled: true,
                              drainAlerts: true,
                              levelAlerts: true
                            },
                            
                            // Пороговые значения (синхронизировано с tanksService и UI)
                            thresholds: {
                              criticalTemp: {
                                min: -10,
                                max: 40
                              },
                              maxWaterLevel: 15,
                              notifications: {
                                critical: true,
                                minimum: true,
                                temperature: true,
                                water: true
                              }
                            },
                            
                            // Системные поля
                            trading_point_id: "",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            
                            // Дополнительные технические параметры
                            material: "steel"
                          };
                          setDefaultParams(prev => ({ ...prev, ...fuelTankParams }));
                        } else {
                          // Для других типов очищаем или устанавливаем соответствующие параметры
                          setDefaultParams({});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип оборудования" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.systemType && (
                      <p className="text-sm text-destructive">
                        {errors.systemType.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Подробное описание оборудования..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={watch("isActive")}
                      onCheckedChange={(checked) => setValue("isActive", checked)}
                    />
                    <Label htmlFor="isActive">Активен</Label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="defaults" className="h-full overflow-y-auto pr-2 space-y-4 data-[state=active]:block" style={{scrollbarWidth: 'thin'}}>
                      <div className="pb-6 space-y-4">
                    <div>
                      <Label>Параметры по умолчанию для типа оборудования</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Эти значения будут использоваться при создании нового экземпляра оборудования
                      </p>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50/5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white">Настраиваемые параметры</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newKey = `param_${Object.keys(defaultParams).length + 1}`;
                            setDefaultParams(prev => ({
                              ...prev,
                              [newKey]: ""
                            }));
                          }}
                          className="text-slate-300 border-slate-600 hover:bg-slate-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить параметр
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(defaultParams).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-lg bg-slate-800/30">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Ключ параметра</Label>
                              <Input
                                value={key}
                                onChange={(e) => {
                                  const newKey = e.target.value;
                                  if (newKey !== key && newKey) {
                                    setDefaultParams(prev => {
                                      const newParams = { ...prev };
                                      delete newParams[key];
                                      newParams[newKey] = value;
                                      return newParams;
                                    });
                                  }
                                }}
                                placeholder="parameter_name"
                                className="bg-slate-700 border-slate-600 text-white text-sm"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Значение</Label>
                              <Input
                                value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                onChange={(e) => {
                                  let newValue: any = e.target.value;
                                  
                                  // Попытка парсинга как JSON для объектов/массивов
                                  try {
                                    if (newValue.startsWith('{') || newValue.startsWith('[') || newValue === 'true' || newValue === 'false' || !isNaN(Number(newValue))) {
                                      newValue = JSON.parse(newValue);
                                    }
                                  } catch {
                                    // Оставляем как строку если не удалось распарсить
                                  }
                                  
                                  setDefaultParams(prev => ({
                                    ...prev,
                                    [key]: newValue
                                  }));
                                }}
                                placeholder="Значение параметра"
                                className="bg-slate-700 border-slate-600 text-white text-sm"
                              />
                            </div>
                            
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDefaultParams(prev => {
                                    const newParams = { ...prev };
                                    delete newParams[key];
                                    return newParams;
                                  });
                                }}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {Object.keys(defaultParams).length === 0 && (
                          <div className="text-center py-8 text-slate-500">
                            <div className="text-sm">Параметров пока нет</div>
                            <div className="text-xs mt-1">Нажмите "Добавить параметр" чтобы создать первый</div>
                          </div>
                        )}
                      </div>

                      {watch("systemType") === "fuel_tank" && (
                        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="text-sm text-blue-400 font-medium mb-3">💡 Поля резервуара (автоматически загружены)</div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-300">
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Базовые характеристики:</div>
                              <div>• id - ID резервуара</div>
                              <div>• name - Название резервуара</div>
                              <div>• fuelType - Тип топлива</div>
                              <div>• currentLevelLiters - Текущий уровень (литры)</div>
                              <div>• capacityLiters - Объем резервуара (литры)</div>
                              <div>• minLevelPercent - Минимальный уровень (%)</div>
                              <div>• criticalLevelPercent - Критический уровень (%)</div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Физические параметры:</div>
                              <div>• temperature - Температура (°C)</div>
                              <div>• waterLevelMm - Уровень воды (мм)</div>
                              <div>• density - Плотность</div>
                              <div>• material - Материал</div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Статус и местоположение:</div>
                              <div>• status - Статус ('active'|'maintenance'|'offline')</div>
                              <div>• location - Местоположение</div>
                              <div>• installationDate - Дата установки</div>
                              <div>• lastCalibration - Последняя калибровка</div>
                              <div>• supplier - Поставщик</div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Датчики и связи:</div>
                              <div>• sensors - Массив датчиков (name, status)</div>
                              <div>• linkedPumps - Связанные насосы (id, name)</div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Уведомления:</div>
                              <div>• notifications.enabled - Включены ли уведомления</div>
                              <div>• notifications.drainAlerts - Оповещения о сливе</div>
                              <div>• notifications.levelAlerts - Оповещения об уровне</div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Пороговые значения:</div>
                              <div>• thresholds.criticalTemp.min/max - Критическая температура</div>
                              <div>• thresholds.maxWaterLevel - Макс. уровень воды</div>
                              <div>• thresholds.notifications.* - Настройки уведомлений</div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="font-medium text-blue-200">Системные поля:</div>
                              <div>• trading_point_id - ID торговой точки</div>
                              <div>• created_at - Дата создания</div>
                              <div>• updated_at - Дата обновления</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="commands" className="h-full overflow-y-auto pr-2 space-y-4 data-[state=active]:block" style={{scrollbarWidth: 'thin'}}>
                      <div className="pb-6 space-y-4">
                    <div>
                      <Label>Доступные команды для данного типа оборудования</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Выберите команды, которые можно выполнять на этом типе оборудования
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {mockAvailableCommands
                        .filter(cmd => cmd.targetType === "equipment" && cmd.isActive)
                        .map((command) => {
                          const isSelected = watch("availableCommandIds")?.includes(command.id) || false;
                          
                          return (
                            <div key={command.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <Checkbox
                                id={`command-${command.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentIds = getValues("availableCommandIds") || [];
                                  if (checked) {
                                    setValue("availableCommandIds", [...currentIds, command.id]);
                                  } else {
                                    setValue("availableCommandIds", currentIds.filter(id => id !== command.id));
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`command-${command.id}`} className="font-medium cursor-pointer">
                                  {command.name}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Код: <code className="bg-muted px-1 py-0.5 rounded text-xs">{command.code}</code>
                                </p>
                              </div>
                              <Command className="h-4 w-4 text-muted-foreground" />
                            </div>
                          );
                        })}
                    </div>

                    {watch("availableCommandIds")?.length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <Label className="text-sm font-medium">Выбранные команды:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {watch("availableCommandIds").map((commandId) => {
                            const command = mockAvailableCommands.find(cmd => cmd.id === commandId);
                            if (!command) return null;
                            
                            return (
                              <Badge key={commandId} variant="secondary" className="text-xs">
                                {command.name}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-2"
                                  onClick={() => {
                                    const currentIds = getValues("availableCommandIds") || [];
                                    setValue("availableCommandIds", currentIds.filter(id => id !== commandId));
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <DialogFooter className="px-6 py-4 flex-shrink-0 border-t border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setDefaultParams({});
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={(() => {
                    const name = watch("name");
                    const code = watch("code");
                    const systemType = watch("systemType");
                    
                    // Кнопка активна если все обязательные поля заполнены
                    return !name?.trim() || !code?.trim() || !systemType || isSubmitting;
                  })()}
                >
                  {editingItem ? "Сохранить" : "Создать шаблон"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Диалог подтверждения удаления */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить шаблон</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить шаблон "{itemToDelete?.name}"?
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Диалог управления системными типами */}
        <Dialog open={isSystemTypesDialogOpen} onOpenChange={setIsSystemTypesDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-2xl max-h-[80vh] sm:w-full flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
              <DialogTitle>Управление системными типами</DialogTitle>
              <DialogDescription>
                Добавляйте, редактируйте и удаляйте системные типы оборудования
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 px-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Системные типы</h3>
                <Button
                  onClick={() => {
                    setEditingSystemType(null);
                    setIsSystemTypeDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить тип
                </Button>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-96">
                {systemTypesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-400 text-sm">Загрузка...</p>
                    </div>
                  </div>
                ) : systemTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Системные типы не найдены</p>
                  </div>
                ) : (
                  systemTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-white">{type.label}</div>
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                            {type.value}
                          </code>
                          <Badge variant={type.isActive ? "default" : "secondary"}>
                            {type.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                        {type.description && (
                          <div className="text-sm text-slate-400 mt-1">{type.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => {
                            setEditingSystemType(type);
                            setIsSystemTypeDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {type.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                            onClick={async () => {
                              try {
                                await systemTypesAPI.delete(type.id);
                                toast({
                                  title: "Успешно",
                                  description: `Системный тип "${type.label}" отключен`
                                });
                                loadSystemTypes();
                              } catch (error) {
                                toast({
                                  title: "Ошибка",
                                  description: "Не удалось отключить системный тип",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                            onClick={async () => {
                              try {
                                await systemTypesAPI.restore(type.id);
                                toast({
                                  title: "Успешно",
                                  description: `Системный тип "${type.label}" восстановлен`
                                });
                                loadSystemTypes();
                              } catch (error) {
                                toast({
                                  title: "Ошибка",
                                  description: "Не удалось восстановить системный тип",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Диалог создания/редактирования системного типа */}
        <SystemTypeDialog
          open={isSystemTypeDialogOpen}
          onOpenChange={setIsSystemTypeDialogOpen}
          systemType={editingSystemType}
          onSuccess={() => {
            loadSystemTypes();
            // Обновляем основной список после изменений в системных типах
            loadEquipmentTypes();
          }}
        />
      </div>
    </MainLayout>
  );
}