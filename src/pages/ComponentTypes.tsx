import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2, X, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { componentTemplatesAPI } from "@/services/componentTemplatesService";
import type { ComponentTemplate } from "@/types/componentTemplate";

// Схема валидации
const componentTypeSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  code: z.string()
    .min(1, "Технический код обязателен")
    .regex(/^[A-Z0-9_-]+$/, "Код должен содержать только латинские буквы, цифры, _ и -"),
  description: z.string().min(1, "Описание обязательно"),
  systemType: z.string().min(1, "Системный тип обязателен"),
  statusValues: z.array(z.string()).min(1, "Необходимо указать хотя бы одно значение статуса"),
  isActive: z.boolean(),
});

type ComponentTypeFormData = z.infer<typeof componentTypeSchema>;

// Системные типы компонентов
const systemTypes = [
  { value: "SENSOR", label: "Датчик" },
  { value: "CONTROLLER", label: "Контроллер" },
  { value: "INTERFACE", label: "Интерфейс" },
  { value: "PAYMENT", label: "Платежная система" },
  { value: "DISPLAY", label: "Дисплей" },
  { value: "PUMP", label: "Насос" },
  { value: "VALVE", label: "Клапан" },
  { value: "METER", label: "Счетчик" },
  { value: "OTHER", label: "Другое" },
];

// Предустановленные значения статусов
const defaultStatusValues = [
  "OK",
  "WARNING", 
  "ERROR",
  "OFFLINE",
  "MAINTENANCE",
  "DISABLED"
];

export default function ComponentTypes() {
  const [componentTypes, setComponentTypes] = useState<ComponentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ComponentTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ComponentTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusInputValue, setStatusInputValue] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ComponentTypeFormData>({
    resolver: zodResolver(componentTypeSchema),
    defaultValues: {
      isActive: true,
      statusValues: ["OK", "ERROR", "OFFLINE"],
    },
  });

  const watchStatusValues = watch("statusValues") || [];

  // Загрузка типов компонентов
  const loadComponentTypes = async () => {
    setLoading(true);
    try {
      const types = await componentTemplatesAPI.list();
      setComponentTypes(types);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить типы компонентов",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComponentTypes();
  }, []);

  // Фильтрация типов компонентов
  const filteredTypes = componentTypes.filter((type) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      type.name.toLowerCase().includes(query) ||
      type.code.toLowerCase().includes(query) ||
      type.description.toLowerCase().includes(query)
    );
  });

  // Открытие диалога для создания
  const handleCreate = () => {
    setIsEditMode(false);
    setSelectedType(null);
    reset({
      name: "",
      code: "",
      description: "",
      systemType: "",
      statusValues: ["OK", "ERROR", "OFFLINE"],
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  // Открытие диалога для редактирования
  const handleEdit = (type: ComponentTemplate) => {
    setIsEditMode(true);
    setSelectedType(type);
    reset({
      name: type.name,
      code: type.code,
      description: type.description,
      systemType: type.systemType,
      statusValues: type.statusValues,
      isActive: type.isActive,
    });
    setIsDialogOpen(true);
  };

  // Дублирование типа
  const handleDuplicate = (type: ComponentTemplate) => {
    setIsEditMode(false);
    setSelectedType(null);
    reset({
      name: `${type.name} (копия)`,
      code: `${type.code}_COPY`,
      description: type.description,
      systemType: type.systemType,
      statusValues: [...type.statusValues],
      isActive: type.isActive,
    });
    setIsDialogOpen(true);
  };

  // Сохранение типа компонента
  const onSubmit = async (data: ComponentTypeFormData) => {
    try {
      if (isEditMode && selectedType) {
        await componentTemplatesAPI.update(selectedType.id, data);
        toast({
          title: "Успешно",
          description: "Тип компонента обновлен",
        });
      } else {
        await componentTemplatesAPI.create(data);
        toast({
          title: "Успешно",
          description: "Тип компонента создан",
        });
      }
      setIsDialogOpen(false);
      loadComponentTypes();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить тип компонента",
        variant: "destructive",
      });
    }
  };

  // Удаление типа компонента
  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      await componentTemplatesAPI.delete(typeToDelete.id);
      toast({
        title: "Успешно",
        description: "Тип компонента удален",
      });
      setIsDeleteDialogOpen(false);
      setTypeToDelete(null);
      loadComponentTypes();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить тип компонента",
        variant: "destructive",
      });
    }
  };

  // Добавление значения статуса
  const handleAddStatus = () => {
    const value = statusInputValue.trim().toUpperCase();
    if (value && !watchStatusValues.includes(value)) {
      setValue("statusValues", [...watchStatusValues, value]);
      setStatusInputValue("");
    }
  };

  // Удаление значения статуса
  const handleRemoveStatus = (status: string) => {
    setValue("statusValues", watchStatusValues.filter(s => s !== status));
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-2xl font-semibold text-white">Справочник типов компонентов</h1>
          <p className="text-slate-400 mt-2">Создавайте и управляйте шаблонами компонентов для POS-терминалов</p>
        </div>

        {/* Панель типов компонентов */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700 mx-4 md:mx-6 lg:mx-8">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⚙️</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Типы компонентов</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                >
                  + Добавить тип
                </Button>
              </div>
            </div>
            
            {/* Поиск компонентов */}
            <div className="mt-4">
              <Input
                placeholder="Поиск по названию, коду или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>

        {/* Список типов компонентов */}
        {loading ? (
          <div className="mx-4 md:mx-6 lg:mx-8 pb-6 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-slate-400">Загрузка типов компонентов...</p>
            </div>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
            <EmptyState 
              title="Типы компонентов не найдены" 
              description={searchQuery ? "Попробуйте изменить параметры поиска" : "Создайте первый тип компонента"}
              cta={
                !searchQuery && (
                  <Button 
                    onClick={handleCreate}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    + Добавить тип
                  </Button>
                )
              }
              className="py-16"
            />
          </div>
        ) : (
          <>
            {/* Десктоп: таблица на всю ширину */}
            <div className="hidden md:block mx-4 md:mx-6 lg:mx-8">
              <div className="overflow-x-auto rounded-lg border border-slate-600">
                <table className="w-full text-sm min-w-full table-fixed">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '30%'}}>НАЗВАНИЕ КОМПОНЕНТА</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '20%'}}>ТЕХНИЧЕСКИЙ КОД</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СИСТЕМНЫЙ ТИП</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СТАТУС</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '20%'}}>ДЕЙСТВИЯ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800">
                    {filteredTypes.map((type) => (
                      <tr
                        key={type.id}
                        className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <td className="px-4 md:px-6 py-4">
                          <div>
                            <div className="font-medium text-white text-base">{type.name}</div>
                            <div className="text-sm text-slate-400">{type.description}</div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                            {type.code}
                          </code>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                            {type.systemType}
                          </Badge>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <Badge variant={type.isActive ? "default" : "secondary"}>
                            {type.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleEdit(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleDuplicate(type)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              onClick={() => {
                                setTypeToDelete(type);
                                setIsDeleteDialogOpen(true);
                              }}
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
            <div className="md:hidden space-y-3 pb-6 mx-4 md:mx-6 lg:mx-8">
              {filteredTypes.map((type) => (
                <div
                  key={type.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{type.name}</div>
                      <div className="text-sm text-slate-400 mb-2">{type.description}</div>
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Код:</span>
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                            {type.code}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Тип:</span>
                          <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                            {type.systemType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Статус:</span>
                          <Badge variant={type.isActive ? "default" : "secondary"}>
                            {type.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Статусы:</span>
                          <div className="flex flex-wrap gap-1">
                            {type.statusValues.map((status) => (
                              <Badge key={status} variant="secondary" className="text-xs bg-slate-600 text-slate-200">
                                {status}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleEdit(type)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleDuplicate(type)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => {
                          setTypeToDelete(type);
                          setIsDeleteDialogOpen(true);
                        }}
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
      </div>

      {/* Диалог создания/редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Редактировать тип компонента" : "Новый тип компонента"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Измените параметры типа компонента"
                : "Заполните параметры нового типа компонента"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Например: Датчик уровня"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Технический код</Label>
                <Input
                  id="code"
                  {...register("code")}
                  placeholder="Например: CMP_SENSOR_LEVEL"
                  disabled={isEditMode}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Опишите назначение и функции компонента"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systemType">Системный тип</Label>
                <Select
                  value={watch("systemType")}
                  onValueChange={(value) => setValue("systemType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
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
                  <p className="text-sm text-red-500">{errors.systemType.message}</p>
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
            </div>

            <div className="space-y-2">
              <Label>Возможные статусы</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={statusInputValue}
                  onChange={(e) => setStatusInputValue(e.target.value)}
                  placeholder="Добавить статус"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddStatus();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddStatus} variant="outline">
                  Добавить
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {watchStatusValues.map((status) => (
                  <Badge key={status} variant="secondary" className="py-1">
                    {status}
                    <button
                      type="button"
                      onClick={() => handleRemoveStatus(status)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {errors.statusValues && (
                <p className="text-sm text-red-500">{errors.statusValues.message}</p>
              )}
              <div className="text-sm text-muted-foreground">
                Предустановленные:{" "}
                {defaultStatusValues.map((status, idx) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      if (!watchStatusValues.includes(status)) {
                        setValue("statusValues", [...watchStatusValues, status]);
                      }
                    }}
                    className="text-primary hover:underline"
                  >
                    {status}{idx < defaultStatusValues.length - 1 ? ", " : ""}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">
                {isEditMode ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип компонента?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить тип компонента "{typeToDelete?.name}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}