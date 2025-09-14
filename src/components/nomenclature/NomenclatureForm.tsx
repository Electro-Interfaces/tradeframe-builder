import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { Plus, X, ExternalLink, Save, AlertCircle } from "lucide-react";
import { FuelNomenclature, FuelNomenclatureFormData, ExternalCodeMapping } from '@/types/nomenclature';
import { nomenclatureService } from '@/services/nomenclatureService';
import { useSelection } from "@/contexts/SelectionContext";

const externalCodeSchema = z.object({
  systemType: z.enum(['CRM', '1C', 'PROCESSING', 'OTHER'] as const),
  externalCode: z.string().min(1, 'Код обязателен'),
  description: z.string().optional()
});

const formSchema = z.object({
  networkId: z.string().min(1, 'Выберите сеть'),
  name: z.string().min(1, 'Название обязательно').max(100, 'Максимум 100 символов'),
  internalCode: z.string().min(1, 'Внутренний код обязателен').max(20, 'Максимум 20 символов'),
  networkApiCode: z.string().max(50, 'Максимум 50 символов').optional(),
  networkApiEnabled: z.boolean().optional(),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
  status: z.enum(['active', 'archived']),
  externalCodes: z.array(externalCodeSchema)
});

type FormData = z.infer<typeof formSchema>;

interface NomenclatureFormProps {
  open: boolean;
  onClose: () => void;
  item?: FuelNomenclature;
  onSave: () => void;
}

const networkOptions = [
  { value: '1', label: 'Демо сеть АЗС' },
  { value: '2', label: 'БТО' }
];

const systemTypeLabels = {
  'CRM': 'CRM система',
  '1C': '1С:Предприятие',
  'PROCESSING': 'Процессинг',
  'OTHER': 'Другое'
};

export const NomenclatureForm: React.FC<NomenclatureFormProps> = ({
  open,
  onClose,
  item,
  onSave
}) => {
  const isMobile = useIsMobile();
  const { selectedNetwork } = useSelection();
  const [saving, setSaving] = useState(false);
  const isEdit = !!item;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      networkId: selectedNetwork?.id || '',
      name: '',
      internalCode: '',
      networkApiCode: '',
      networkApiEnabled: false,
      description: '',
      status: 'active',
      externalCodes: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "externalCodes"
  });

  useEffect(() => {
    if (item && open) {
      form.reset({
        networkId: item.networkId,
        name: item.name,
        internalCode: item.internalCode,
        networkApiCode: item.networkApiCode || '',
        networkApiEnabled: item.networkApiSettings?.enabled || false,
        description: item.description || '',
        status: item.status,
        externalCodes: item.externalCodes.map(code => ({
          systemType: code.systemType,
          externalCode: code.externalCode,
          description: code.description || ''
        }))
      });
    } else if (open && !item) {
      form.reset({
        networkId: selectedNetwork?.id || '',
        name: '',
        internalCode: '',
        networkApiCode: '',
        networkApiEnabled: false,
        description: '',
        status: 'active',
        externalCodes: []
      });
    }
  }, [item, open, form, selectedNetwork?.id]);

  const onSubmit = async (data: FormData) => {
    try {
      setSaving(true);
      
      if (isEdit && item) {
        await nomenclatureService.updateNomenclature(item.id, data);
        toast({
          title: "Успешно",
          description: "Номенклатура обновлена"
        });
      } else {
        await nomenclatureService.createNomenclature(data);
        toast({
          title: "Успешно", 
          description: "Номенклатура создана"
        });
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save nomenclature:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить номенклатуру",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addExternalCode = () => {
    append({
      systemType: 'OTHER',
      externalCode: '',
      description: ''
    });
  };

  const generateInternalCode = () => {
    const name = form.getValues('name');
    if (!name) return;
    
    const code = name
      .toUpperCase()
      .replace(/[^А-ЯA-Z0-9]/g, '')
      .slice(0, 10);
    
    form.setValue('internalCode', code);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редактирование номенклатуры' : 'Добавление номенклатуры'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Основная информация */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Показываем информацию о выбранной сети */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Торговая сеть:</strong> {selectedNetwork?.name}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="АИ-95, ДТ, и т.д."
                            onBlur={(e) => {
                              field.onBlur();
                              if (!form.getValues('internalCode')) {
                                generateInternalCode();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internalCode"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Внутренний код *</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={generateInternalCode}
                            disabled={!form.getValues('name')}
                          >
                            Сгенерировать
                          </Button>
                        </div>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="AI95, DT, и т.д."
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Дополнительное описание топлива"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Активен</SelectItem>
                          <SelectItem value="archived">Архив</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* API торговой сети */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  API торговой сети
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Настройки для интеграции с API торговой сети
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="networkApiEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Включить интеграцию с API торговой сети
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Автоматическая синхронизация данных номенклатуры
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('networkApiEnabled') && (
                  <FormField
                    control={form.control}
                    name="networkApiCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Код в API торговой сети</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Например: FUEL_AI95_PREMIUM"
                            className="font-mono"
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Уникальный код для идентификации номенклатуры в API торговой сети
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Внешние коды */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Внешние коды</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Коды для интеграции с внешними системами
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addExternalCode}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить код
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Внешние коды не добавлены</p>
                    <p className="text-sm">Добавьте коды для интеграции с 1С, CRM или другими системами</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="border-dashed">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {systemTypeLabels[form.watch(`externalCodes.${index}.systemType`)]}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`externalCodes.${index}.systemType`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Тип системы *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(systemTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`externalCodes.${index}.externalCode`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Внешний код *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Код в внешней системе"
                                      className="font-mono"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`externalCodes.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Описание</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Дополнительное описание"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Кнопки управления */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};