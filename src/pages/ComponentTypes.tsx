import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Схема валидации
const componentTypeSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  code: z.string()
    .min(1, "Технический код обязателен")
    .regex(/^[A-Z0-9_-]+$/, "Код должен содержать только латинские буквы, цифры, _ и -"),
  description: z.string().optional(),
  systemType: z.string().min(1, "Системный тип обязателен"),
  statusValues: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

type ComponentType = z.infer<typeof componentTypeSchema>;

interface ComponentTypeWithId extends ComponentType {
  id: string;
}

// Mock данные
const mockComponentTypes: ComponentTypeWithId[] = [
  {
    id: "1",
    name: "Датчик уровня ПМП-201",
    code: "PMP_201_LEVEL_SENSOR",
    description: "Датчик измерения уровня топлива в резервуаре",
    systemType: "SENSOR",
    statusValues: ["OK", "ERROR", "OFFLINE"],
    isActive: true,
  },
  {
    id: "2",
    name: "Контроллер насоса КН-150",
    code: "KN_150_CONTROLLER",
    description: "Контроллер управления насосом подачи топлива",
    systemType: "CONTROLLER",
    statusValues: ["RUNNING", "STOPPED", "ERROR", "MAINTENANCE"],
    isActive: true,
  },
  {
    id: "3",
    name: "Дисплей ТРК 7-дюймовый",
    code: "TRK_DISPLAY_7",
    description: "Цветной дисплей для отображения информации на ТРК",
    systemType: "DISPLAY",
    statusValues: ["ON", "OFF", "DIMMED", "ERROR"],
    isActive: true,
  },
  {
    id: "4",
    name: "Принтер чеков Epson TM-T20",
    code: "EPSON_TM_T20",
    description: "Термопринтер для печати чеков",
    systemType: "PRINTER",
    statusValues: ["READY", "PRINTING", "NO_PAPER", "ERROR"],
    isActive: false,
  },
];

// Опции для системных типов
const systemTypeOptions = [
  { value: "SENSOR", label: "Датчик" },
  { value: "CONTROLLER", label: "Контроллер" },
  { value: "DISPLAY", label: "Дисплей" },
  { value: "PAYMENT_TERMINAL", label: "Платежный терминал" },
  { value: "PRINTER", label: "Принтер" },
  { value: "CAMERA", label: "Камера" },
];

export default function ComponentTypes() {
  const [componentTypes, setComponentTypes] = useState<ComponentTypeWithId[]>(mockComponentTypes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComponentTypeWithId | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ComponentTypeWithId | null>(null);
  const [statusInput, setStatusInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ComponentType>({
    resolver: zodResolver(componentTypeSchema),
    defaultValues: {
      isActive: true,
      statusValues: [],
    },
  });

  const watchedStatusValues = watch("statusValues") || [];

  // Фильтрация компонентов по поиску
  const filteredComponentTypes = componentTypes.filter(component =>
    component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    component.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    component.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getSystemTypeLabel(component.systemType).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      name: "",
      code: "",
      description: "",
      systemType: "",
      statusValues: [],
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: ComponentTypeWithId) => {
    setEditingItem(item);
    reset({
      name: item.name,
      code: item.code,
      description: item.description,
      systemType: item.systemType,
      statusValues: item.statusValues || [],
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleClone = (item: ComponentTypeWithId) => {
    setEditingItem(null);
    reset({
      name: `${item.name} (копия)`,
      code: `${item.code}_COPY`,
      description: item.description,
      systemType: item.systemType,
      statusValues: item.statusValues || [],
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = (item: ComponentTypeWithId) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: ComponentType) => {
    // Проверка уникальности кода (исключая редактируемый элемент)
    const isDuplicate = componentTypes.some(
      (item) => 
        item.code.toLowerCase() === data.code.toLowerCase() && 
        item.id !== editingItem?.id
    );

    if (isDuplicate) {
      toast({
        title: "Ошибка",
        description: "Компонент с таким техническим кодом уже существует",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      // Редактирование
      setComponentTypes((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, ...data }
            : item
        )
      );
      toast({
        title: "Успешно",
        description: "Шаблон компонента обновлен",
      });
    } else {
      // Создание
      const newItem: ComponentTypeWithId = {
        ...data,
        id: Date.now().toString(),
      };
      setComponentTypes((prev) => [...prev, newItem]);
      toast({
        title: "Успешно",
        description: "Шаблон компонента создан",
      });
    }

    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = () => {
    if (itemToDelete) {
      setComponentTypes((prev) =>
        prev.filter((item) => item.id !== itemToDelete.id)
      );
      toast({
        title: "Успешно",
        description: "Шаблон компонента удален",
      });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getSystemTypeLabel = (value: string) => {
    return systemTypeOptions.find(option => option.value === value)?.label || value;
  };

  const addStatusValue = () => {
    if (statusInput.trim() && !watchedStatusValues.includes(statusInput.trim())) {
      setValue("statusValues", [...watchedStatusValues, statusInput.trim()]);
      setStatusInput("");
    }
  };

  const removeStatusValue = (valueToRemove: string) => {
    setValue("statusValues", watchedStatusValues.filter(value => value !== valueToRemove));
  };

  const handleStatusInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStatusValue();
    }
  };

  return (
    <MainLayout>
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        {/* Заголовок страницы */}
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Справочник типов компонентов</h1>
          <p className="text-slate-400 mt-2">Создавайте и управляйте шаблонами компонентов оборудования с настройкой статусов и системных типов</p>
        </div>

      {/* Панель типов компонентов */}
      <div className="bg-slate-800 mb-6 w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Типы компонентов</h2>
            </div>
            <Button 
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
            >
              + Создать компонент
            </Button>
          </div>
          
          {/* Поиск компонентов */}
          <div className="mt-4">
            <Input
              placeholder="Поиск компонентов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>
        </div>

        {componentTypes.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="Нет типов компонентов" 
              description="Создайте первый шаблон компонента для начала работы"
              cta={
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Создать компонент
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : filteredComponentTypes.length === 0 ? (
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
                    {filteredComponentTypes.map((componentType) => (
                      <tr
                        key={componentType.id}
                        className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white text-base">{componentType.name}</div>
                            {componentType.description && (
                              <div className="text-sm text-slate-400">{componentType.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                            {componentType.code}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                            {getSystemTypeLabel(componentType.systemType)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={componentType.isActive ? "default" : "secondary"}>
                            {componentType.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleEdit(componentType)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleClone(componentType)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              onClick={() => handleDeleteConfirm(componentType)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 px-6 pb-6">
              {filteredComponentTypes.map((componentType) => (
                <div
                  key={componentType.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{componentType.name}</div>
                      {componentType.description && (
                        <div className="text-sm text-slate-400 mb-2">{componentType.description}</div>
                      )}
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Код:</span>
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                            {componentType.code}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Тип:</span>
                          <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                            {getSystemTypeLabel(componentType.systemType)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Статус:</span>
                          <Badge variant={componentType.isActive ? "default" : "secondary"}>
                            {componentType.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                        {componentType.statusValues && componentType.statusValues.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400">Значения статуса:</span>
                            <div className="flex flex-wrap gap-1">
                              {componentType.statusValues.slice(0, 3).map((value) => (
                                <Badge key={value} variant="outline" className="text-xs border-slate-500 text-slate-300">
                                  {value}
                                </Badge>
                              ))}
                              {componentType.statusValues.length > 3 && (
                                <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                                  +{componentType.statusValues.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleEdit(componentType)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleClone(componentType)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => handleDeleteConfirm(componentType)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

        {/* Диалог создания/редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto sm:w-full">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Редактировать шаблон компонента" : "Создать шаблон компонента"}
              </DialogTitle>
              <DialogDescription>
                {editingItem 
                  ? "Измените параметры шаблона компонента" 
                  : "Заполните информацию для создания нового шаблона компонента"
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название шаблона *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Датчик уровня ПМП-201"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Технический код *</Label>
                  <Input
                    id="code"
                    {...register("code")}
                    placeholder="PMP_201_LEVEL_SENSOR"
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemType">Системный тип *</Label>
                <Select
                  value={watch("systemType")}
                  onValueChange={(value) => setValue("systemType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите системный тип" />
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
                  <p className="text-sm text-destructive">{errors.systemType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Описание компонента..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Возможные значения статуса</Label>
                <div className="flex gap-2">
                  <Input
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    onKeyPress={handleStatusInputKeyPress}
                    placeholder="Введите значение статуса (например, OK)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStatusValue}
                    disabled={!statusInput.trim() || watchedStatusValues.includes(statusInput.trim())}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {watchedStatusValues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchedStatusValues.map((value) => (
                      <Badge key={value} variant="secondary" className="flex items-center gap-1">
                        {value}
                        <button
                          type="button"
                          onClick={() => removeStatusValue(value)}
                          className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch("isActive")}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">Активен</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={!isValid}>
                  {editingItem ? "Сохранить" : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Диалог подтверждения удаления */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить шаблон компонента "{itemToDelete?.name}"?
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}