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
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2 } from "lucide-react";
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
});

type EquipmentType = z.infer<typeof equipmentTypeSchema>;

interface EquipmentTypeWithId extends EquipmentType {
  id: string;
}

// Mock данные
const mockEquipmentTypes: EquipmentTypeWithId[] = [
  {
    id: "1",
    name: "ТРК Tokheim Quantium 310",
    code: "TQK_Q310",
    description: "Топливораздаточная колонка Tokheim серии Quantium 310",
    systemType: "fuel_dispenser",
    isActive: true,
  },
  {
    id: "2",
    name: "Резервуар подземный 50м³",
    code: "TANK_UG_50",
    description: "Подземный топливный резервуар объемом 50 кубических метров",
    systemType: "fuel_tank",
    isActive: true,
  },
  {
    id: "3",
    name: "POS-терминал Ingenico iWL250",
    code: "POS_IWL250",
    description: "Беспроводной POS-терминал для приема платежей",
    systemType: "pos_system",
    isActive: false,
  },
  {
    id: "4",
    name: "Датчик уровня топлива Варта",
    code: "SENSOR_VARTA_LVL",
    description: "Датчик контроля уровня и качества топлива",
    systemType: "sensor",
    isActive: true,
  },
];

const systemTypeOptions = [
  { value: "fuel_dispenser", label: "Топливораздаточная колонка (ТРК)" },
  { value: "fuel_tank", label: "Топливный резервуар" },
  { value: "payment_terminal", label: "Платежный терминал" },
  { value: "pos_system", label: "POS-система" },
  { value: "sensor", label: "Датчик" },
];

export default function EquipmentTypes() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeWithId[]>(mockEquipmentTypes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentTypeWithId | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EquipmentTypeWithId | null>(null);
  const { toast } = useToast();

  const form = useForm<EquipmentType>({
    resolver: zodResolver(equipmentTypeSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      systemType: "",
      isActive: true,
    },
  });

  const handleCreate = () => {
    form.reset({
      name: "",
      code: "",
      description: "",
      systemType: "",
      isActive: true,
    });
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: EquipmentTypeWithId) => {
    form.reset(item);
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleClone = (item: EquipmentTypeWithId) => {
    form.reset({
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
      form.setError("code", { message: "Технический код должен быть уникальным" });
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
    form.reset();
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

  const getSystemTypeLabel = (value: string) => {
    return systemTypeOptions.find(option => option.value === value)?.label || value;
  };

  return (
    <MainLayout>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Справочник типов оборудования</h1>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить шаблон
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название шаблона</TableHead>
                <TableHead>Технический код</TableHead>
                <TableHead>Системный тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[120px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentTypes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                      {item.code}
                    </code>
                  </TableCell>
                  <TableCell>{getSystemTypeLabel(item.systemType)}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleClone(item)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteConfirm(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {equipmentTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Нет созданных шаблонов оборудования
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Диалог создания/редактирования */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={form.handleSubmit(onSubmit)}>
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

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Название шаблона *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="ТРК Tokheim Quantium 310"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="code">Технический код *</Label>
                  <Input
                    id="code"
                    {...form.register("code")}
                    placeholder="TQK_Q310"
                    className="font-mono"
                  />
                  {form.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="systemType">Системный тип *</Label>
                  <Select
                    value={form.watch("systemType")}
                    onValueChange={(value) => form.setValue("systemType", value)}
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
                  {form.formState.errors.systemType && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.systemType.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Подробное описание оборудования..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={form.watch("isActive")}
                    onCheckedChange={(checked) => form.setValue("isActive", checked)}
                  />
                  <Label htmlFor="isActive">Активен</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={!form.formState.isValid}
                >
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