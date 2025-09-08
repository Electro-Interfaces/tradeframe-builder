import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SystemType, SystemTypeInput, systemTypesAPI } from "@/services/systemTypesSupabaseService";

const systemTypeSchema = z.object({
  label: z.string().min(1, "Название обязательно"),
  value: z.string()
    .min(1, "Технический код обязателен")
    .regex(/^[a-z0-9_]+$/, "Код должен содержать только строчные латинские буквы, цифры и _"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type SystemTypeFormData = z.infer<typeof systemTypeSchema>;

interface SystemTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemType?: SystemType | null;
  onSuccess: () => void;
}

export function SystemTypeDialog({
  open,
  onOpenChange,
  systemType,
  onSuccess,
}: SystemTypeDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SystemTypeFormData>({
    resolver: zodResolver(systemTypeSchema),
    defaultValues: {
      label: systemType?.label || "",
      value: systemType?.value || "",
      description: systemType?.description || "",
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
        isActive: systemType?.isActive ?? true,
      });
    }
  }, [open, systemType, reset]);

  const onSubmit = async (data: SystemTypeFormData) => {
    try {
      setIsSubmitting(true);

      if (systemType) {
        // Редактирование
        await systemTypesAPI.update(systemType.id, data);
        toast({
          title: "Успешно",
          description: "Системный тип обновлен",
        });
      } else {
        // Создание
        await systemTypesAPI.create(data);
        toast({
          title: "Успешно", 
          description: "Системный тип создан",
        });
      }

      onOpenChange(false);
      onSuccess();
      reset();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить системный тип",
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
              {systemType ? "Редактировать системный тип" : "Создать системный тип"}
            </DialogTitle>
            <DialogDescription>
              {systemType
                ? "Измените параметры системного типа"
                : "Создайте новый системный тип для оборудования"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Название *</Label>
              <Input
                id="label"
                {...register("label")}
                placeholder="Топливный резервуар"
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
                placeholder="fuel_tank"
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
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Подробное описание системного типа..."
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