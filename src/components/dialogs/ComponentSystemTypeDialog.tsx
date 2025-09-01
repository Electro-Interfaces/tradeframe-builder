import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ComponentSystemType, ComponentSystemTypeInput, componentSystemTypesAPI } from "@/services/componentSystemTypesService";

const componentSystemTypeSchema = z.object({
  label: z.string().min(1, "Название обязательно"),
  value: z.string()
    .min(1, "Технический код обязателен")
    .regex(/^[a-z0-9_]+$/, "Код должен содержать только строчные латинские буквы, цифры и _"),
  description: z.string().optional(),
  category: z.string().min(1, "Категория обязательна"),
  isActive: z.boolean(),
});

type ComponentSystemTypeFormData = z.infer<typeof componentSystemTypeSchema>;

interface ComponentSystemTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemType?: ComponentSystemType | null;
  onSuccess: () => void;
}

// Доступные категории компонентов
const categoryOptions = [
  { value: "sensor", label: "Датчики" },
  { value: "display", label: "Дисплеи" },
  { value: "output", label: "Вывод" },
  { value: "payment", label: "Платежные устройства" },
  { value: "fiscal", label: "Фискальные устройства" },
  { value: "software", label: "Программное обеспечение" },
  { value: "control", label: "Управление" },
  { value: "communication", label: "Связь" },
  { value: "security", label: "Безопасность" },
  { value: "mechanical", label: "Механические устройства" },
  { value: "safety", label: "Системы безопасности" },
  { value: "audio", label: "Аудиооборудование" },
  { value: "power", label: "Питание" },
];

export function ComponentSystemTypeDialog({
  open,
  onOpenChange,
  systemType,
  onSuccess,
}: ComponentSystemTypeDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ComponentSystemTypeFormData>({
    resolver: zodResolver(componentSystemTypeSchema),
    defaultValues: {
      label: systemType?.label || "",
      value: systemType?.value || "",
      description: systemType?.description || "",
      category: systemType?.category || "sensor",
      isActive: systemType?.isActive ?? true,
    },
  });

  // Сброс формы при открытии/закрытии диалога
  useEffect(() => {
    if (open) {
      reset({
        label: systemType?.label || "",
        value: systemType?.value || "",
        description: systemType?.description || "",
        category: systemType?.category || "sensor",
        isActive: systemType?.isActive ?? true,
      });
    }
  }, [open, systemType, reset]);

  const onSubmit = async (data: ComponentSystemTypeFormData) => {
    try {
      setIsSubmitting(true);

      if (systemType) {
        // Редактирование
        await componentSystemTypesAPI.update(systemType.id, data);
        toast({
          title: "Успешно",
          description: "Системный тип компонента обновлен",
        });
      } else {
        // Создание
        await componentSystemTypesAPI.create(data);
        toast({
          title: "Успешно", 
          description: "Системный тип компонента создан",
        });
      }

      onOpenChange(false);
      onSuccess();
      reset();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить системный тип компонента",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-md sm:w-full">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {systemType ? "Редактировать системный тип компонента" : "Создать системный тип компонента"}
            </DialogTitle>
            <DialogDescription>
              {systemType
                ? "Измените параметры системного типа компонента"
                : "Создайте новый системный тип для компонентов"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Название *</Label>
              <Input
                id="label"
                {...register("label")}
                placeholder="Датчик уровня"
                className="bg-slate-700 border-slate-600 text-white"
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Технический код *</Label>
              <Input
                id="value"
                {...register("value")}
                placeholder="sensor_level"
                className="bg-slate-700 border-slate-600 text-white font-mono"
                disabled={!!systemType} // Нельзя менять код у существующего типа
              />
              {errors.value && (
                <p className="text-sm text-destructive">{errors.value.message}</p>
              )}
              {systemType && (
                <p className="text-xs text-slate-400">
                  Технический код нельзя изменить у существующего типа
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Подробное описание системного типа компонента..."
                rows={3}
                className="bg-slate-700 border-slate-600 text-white"
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {systemType ? "Сохранение..." : "Создание..."}
                </div>
              ) : (
                systemType ? "Сохранить" : "Создать"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}