import { useState, useMemo } from "react";
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
import { Plus, Edit, Copy, Trash2, Command, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

// Mock данные
const mockEquipmentTypes: EquipmentTypeWithId[] = [
  {
    id: "1",
    name: "Резервуар",
    code: "EQP_RESERVOIR",
    description: "Топливный резервуар для хранения нефтепродуктов",
    systemType: "fuel_tank",
    isActive: true,
    availableCommandIds: ["1", "4"], // Привязанные команды
  },
  {
    id: "2",
    name: "Терминал самообслуживания",
    code: "EQP_TSO",
    description: "Автоматизированный терминал самообслуживания на АЗС",
    systemType: "self_service_terminal",
    isActive: true,
    availableCommandIds: ["1", "2", "3", "4", "5"], // Привязанные команды
  },
  {
    id: "3",
    name: "Система управления",
    code: "EQP_CONTROL_SYSTEM",
    description: "Центральная система управления АЗС",
    systemType: "control_system",
    isActive: true,
    availableCommandIds: ["1", "2", "3", "4"], // Привязанные команды
  },
  {
    id: "4",
    name: "Табло цен",
    code: "EQP_PRICE_BOARD",
    description: "Электронное табло для отображения цен на топливо",
    systemType: "price_display",
    isActive: true,
    availableCommandIds: ["1", "2", "4"], // Привязанные команды
  },
  {
    id: "5",
    name: "Видеонаблюдение",
    code: "EQP_CCTV",
    description: "Система видеонаблюдения для безопасности АЗС",
    systemType: "surveillance",
    isActive: true,
    availableCommandIds: ["1", "4"], // Привязанные команды
  },
  {
    id: "6",
    name: "Звуковое сопровождение",
    code: "EQP_AUDIO",
    description: "Система звукового сопровождения и оповещения",
    systemType: "audio_system",
    isActive: true,
    availableCommandIds: ["1", "4"], // Привязанные команды
  },
];

const systemTypeOptions = [
  { value: "fuel_tank", label: "Топливный резервуар" },
  { value: "self_service_terminal", label: "Терминал самообслуживания" },
  { value: "control_system", label: "Система управления" },
  { value: "price_display", label: "Табло цен" },
  { value: "surveillance", label: "Видеонаблюдение" },
  { value: "audio_system", label: "Звуковое сопровождение" },
];

export default function EquipmentTypes() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeWithId[]>(mockEquipmentTypes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentTypeWithId | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EquipmentTypeWithId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Функция получения метки системного типа
  const getSystemTypeLabel = (value: string) => {
    if (!value || typeof value !== 'string') {
      return '';
    }
    const option = systemTypeOptions.find(option => option.value === value);
    return option?.label || value;
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
    formState: { errors, isValid },
  } = useForm<EquipmentType>({
    resolver: zodResolver(equipmentTypeSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      systemType: "",
      isActive: true,
      availableCommandIds: [],
    },
  });

  const handleCreate = () => {
    reset({
      name: "",
      code: "",
      description: "",
      systemType: "",
      isActive: true,
      availableCommandIds: [],
    });
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: EquipmentTypeWithId) => {
    reset(item);
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

  const onSubmit = (data: EquipmentType) => {
    // Проверка уникальности кода
    const isDuplicateCode = equipmentTypes.some(
      (item) => item.code === data.code && item.id !== editingItem?.id
    );

    if (isDuplicateCode) {
      setError("code", { message: "Технический код должен быть уникальным" });
      return;
    }

    if (editingItem) {
      // Редактирование
      setEquipmentTypes(prev =>
        prev.map(item =>
          item.id === editingItem.id ? { ...data, id: editingItem.id } : item
        )
      );
      toast({
        title: "Шаблон обновлен",
        description: `Шаблон "${data.name}" успешно обновлен.`,
      });
    } else {
      // Создание
      const newItem: EquipmentTypeWithId = {
        ...data,
        id: Date.now().toString(),
      };
      setEquipmentTypes(prev => [...prev, newItem]);
      toast({
        title: "Шаблон создан",
        description: `Шаблон "${data.name}" успешно создан.`,
      });
    }

    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = () => {
    if (!itemToDelete) return;

    setEquipmentTypes(prev => prev.filter(item => item.id !== itemToDelete.id));
    toast({
      title: "Шаблон удален",
      description: `Шаблон "${itemToDelete.name}" успешно удален.`,
    });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <MainLayout>
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        {/* Заголовок страницы */}
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Справочник типов оборудования</h1>
          <p className="text-slate-400 mt-2">Создавайте и управляйте шаблонами оборудования с настройкой команд и системных типов</p>
        </div>

        {/* Панель типов оборудования */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🔧</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Типы оборудования</h2>
              </div>
              <Button 
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
              >
                + Создать оборудование
              </Button>
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

        {equipmentTypes.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="Нет типов оборудования" 
              description="Создайте первый шаблон оборудования для начала работы"
              cta={
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Создать оборудование
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : filteredEquipmentTypes.length === 0 ? (
          <div className="px-6 pb-6">
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
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white text-base">{equipmentType.name}</div>
                        {equipmentType.description && (
                          <div className="text-sm text-slate-400">{equipmentType.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                        {equipmentType.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                        {getSystemTypeLabel(equipmentType.systemType)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
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

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 px-6 pb-6">
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
          </>
        )}
        </div>

        {/* Диалог создания/редактирования */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto sm:w-full">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
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

              <Tabs defaultValue="basic" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Основные параметры</TabsTrigger>
                  <TabsTrigger value="commands">Доступные команды</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-6">
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
                      onValueChange={(value) => setValue("systemType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип оборудования" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                </TabsContent>

                <TabsContent value="commands" className="space-y-4 mt-6">
                  <div className="space-y-4">
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
              </Tabs>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid}
                >
                  {editingItem ? "Сохранить" : "Создать"}
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
      </div>
    </MainLayout>
  );
}