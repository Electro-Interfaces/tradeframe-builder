import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ArrowLeft, ArrowRight, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { EquipmentTemplate, CreateEquipmentRequest } from "@/types/equipment";

// Схема валидации для шага 2
const equipmentFormSchema = z.object({
  display_name: z.string().min(1, "Название обязательно"),
  serial_number: z.string().optional(),
  external_id: z.string().optional(),
  installation_date: z.date().optional(),
  description: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

interface EquipmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradingPointId: string;
  templates: EquipmentTemplate[];
  onSubmit: (data: CreateEquipmentRequest) => Promise<void>;
  loading?: boolean;
}

type WizardStep = 1 | 2 | 3 | 4;

export function EquipmentWizard({
  open,
  onOpenChange,
  tradingPointId,
  templates,
  onSubmit,
  loading = false
}: EquipmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<EquipmentTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string | number | boolean | null>>({});

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      display_name: "",
      serial_number: "",
      external_id: "",
      description: "",
    },
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedTemplate(null);
    setTemplateParams({});
    form.reset();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      resetWizard();
    }
  };

  const handleTemplateSelect = (template: EquipmentTemplate) => {
    setSelectedTemplate(template);
    // Предзаполняем название на основе шаблона
    const defaultName = `${template.name} #${Date.now().toString().slice(-4)}`;
    form.setValue("display_name", defaultName);
    // Инициализируем параметры из шаблона
    if (template.default_params) {
      setTemplateParams({ ...template.default_params });
    }
    
    // Для резервуаров дополнительно инициализируем системные поля
    if (template.system_type === "fuel_tank" && template.default_params) {
      const now = new Date().toISOString();
      const enhancedParams = {
        ...template.default_params,
        // Добавляем системные поля если их нет
        trading_point_id: template.default_params.trading_point_id || tradingPointId,
        created_at: template.default_params.created_at || now,
        updated_at: template.default_params.updated_at || now,
        installationDate: template.default_params.installationDate || new Date().toISOString().split('T')[0],
        // Инициализируем сложные объекты если они не определены
        sensors: template.default_params.sensors || [
          { name: "Уровень", status: "ok" },
          { name: "Температура", status: "ok" }
        ],
        linkedPumps: template.default_params.linkedPumps || [],
        notifications: template.default_params.notifications || {
          enabled: true,
          drainAlerts: true,
          levelAlerts: true
        },
        thresholds: template.default_params.thresholds || {
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
        }
      };
      setTemplateParams(enhancedParams);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleFormSubmit = async (data: EquipmentFormData) => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      const createRequest: CreateEquipmentRequest = {
        trading_point_id: tradingPointId,
        template_id: selectedTemplate.id,
        overrides: {
          display_name: data.display_name,
          serial_number: data.serial_number || undefined,
          external_id: data.external_id || undefined,
          installation_date: data.installation_date?.toISOString(),
        },
        custom_params: templateParams
      };

      await onSubmit(createRequest);
      handleClose();
    } catch (error) {
      console.error('Failed to create equipment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormData = () => form.getValues();

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step < currentStep
                ? "bg-blue-600 text-white"
                : step === currentStep
                ? "bg-blue-100 text-blue-600 border-2 border-blue-600"
                : "bg-gray-100 text-gray-400"
            )}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < 4 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-2",
                step < currentStep ? "bg-blue-600" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Выбор шаблона оборудования</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Выберите тип оборудования из доступных шаблонов
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md bg-slate-800 border-slate-700",
              selectedTemplate?.id === template.id
                ? "ring-2 ring-blue-500 bg-slate-700 border-blue-500"
                : "hover:bg-slate-700 hover:border-slate-600"
            )}
            onClick={() => handleTemplateSelect(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <Settings className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{template.name}</h4>
                      <p className="text-sm text-slate-400 mt-1">
                        {template.description || "Описание не указано"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2 bg-slate-600 text-slate-200">
                      {template.system_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Код: {template.technical_code}</span>
                    {template.allow_component_template_ids && 
                     template.allow_component_template_ids.length > 0 && (
                      <span>
                        Компонентов: {template.allow_component_template_ids.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={!selectedTemplate || loading}
        >
          Далее
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Параметры экземпляра</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Укажите данные конкретного экземпляра оборудования
        </p>
      </div>

      {selectedTemplate && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Выбранный шаблон</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{selectedTemplate.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.technical_code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Название *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Например: ТРК-1 у въезда"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Серийный номер</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Серийный номер"
                      {...field}
                    />
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
                    <Input
                      placeholder="ID во внешней системе"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Описание</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Дополнительное описание или примечания"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePrevStep} disabled={loading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={!form.watch("display_name") || loading}
          >
            Далее
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Параметры резервуара</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Настройте специфические параметры резервуара
        </p>
      </div>

      {selectedTemplate && selectedTemplate.system_type === "fuel_tank" && (
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {/* Базовые характеристики */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Базовые характеристики</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuelType">Тип топлива *</Label>
                <Input
                  id="fuelType"
                  value={templateParams.fuelType || ""}
                  onChange={(e) => setTemplateParams({...templateParams, fuelType: e.target.value})}
                  placeholder="Например: АИ-95"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentLevelLiters">Текущий уровень (л)</Label>
                <Input
                  id="currentLevelLiters"
                  type="number"
                  value={templateParams.currentLevelLiters || 0}
                  onChange={(e) => setTemplateParams({...templateParams, currentLevelLiters: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacityLiters">Объем резервуара (л) *</Label>
                <Input
                  id="capacityLiters"
                  type="number"
                  value={templateParams.capacityLiters || 50000}
                  onChange={(e) => setTemplateParams({...templateParams, capacityLiters: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Материал</Label>
                <Input
                  id="material"
                  value={templateParams.material || "steel"}
                  onChange={(e) => setTemplateParams({...templateParams, material: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLevelPercent">Мин. уровень (%)</Label>
                <Input
                  id="minLevelPercent"
                  type="number"
                  value={templateParams.minLevelPercent || 20}
                  onChange={(e) => setTemplateParams({...templateParams, minLevelPercent: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticalLevelPercent">Крит. уровень (%)</Label>
                <Input
                  id="criticalLevelPercent"
                  type="number"
                  value={templateParams.criticalLevelPercent || 10}
                  onChange={(e) => setTemplateParams({...templateParams, criticalLevelPercent: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>

          {/* Физические параметры */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Физические параметры</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Температура (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={templateParams.temperature || ""}
                  onChange={(e) => setTemplateParams({...templateParams, temperature: e.target.value ? Number(e.target.value) : null})}
                  placeholder="15.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waterLevelMm">Уровень воды (мм)</Label>
                <Input
                  id="waterLevelMm"
                  type="number"
                  step="0.1"
                  value={templateParams.waterLevelMm || ""}
                  onChange={(e) => setTemplateParams({...templateParams, waterLevelMm: e.target.value ? Number(e.target.value) : null})}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="density">Плотность</Label>
                <Input
                  id="density"
                  type="number"
                  step="0.001"
                  value={templateParams.density || ""}
                  onChange={(e) => setTemplateParams({...templateParams, density: e.target.value ? Number(e.target.value) : null})}
                  placeholder="0.725"
                />
              </div>
            </div>
          </div>

          {/* Статус и местоположение */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Статус и местоположение</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <select
                  id="status"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  value={templateParams.status || "active"}
                  onChange={(e) => setTemplateParams({...templateParams, status: e.target.value})}
                >
                  <option value="active">Активен</option>
                  <option value="maintenance">Техобслуживание</option>
                  <option value="offline">Не в сети</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Местоположение</Label>
                <Input
                  id="location"
                  value={templateParams.location || ""}
                  onChange={(e) => setTemplateParams({...templateParams, location: e.target.value})}
                  placeholder="Зона не указана"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Поставщик</Label>
                <Input
                  id="supplier"
                  value={templateParams.supplier || ""}
                  onChange={(e) => setTemplateParams({...templateParams, supplier: e.target.value})}
                  placeholder="Не указан"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastCalibration">Последняя калибровка</Label>
                <Input
                  id="lastCalibration"
                  type="date"
                  value={templateParams.lastCalibration || ""}
                  onChange={(e) => setTemplateParams({...templateParams, lastCalibration: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Пороговые значения */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Пороговые значения</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="criticalTempMin">Мин. температура (°C)</Label>
                <Input
                  id="criticalTempMin"
                  type="number"
                  value={templateParams.thresholds?.criticalTemp?.min || -10}
                  onChange={(e) => setTemplateParams({
                    ...templateParams, 
                    thresholds: {
                      ...templateParams.thresholds,
                      criticalTemp: {
                        ...(templateParams.thresholds?.criticalTemp || {}),
                        min: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticalTempMax">Макс. температура (°C)</Label>
                <Input
                  id="criticalTempMax"
                  type="number"
                  value={templateParams.thresholds?.criticalTemp?.max || 40}
                  onChange={(e) => setTemplateParams({
                    ...templateParams, 
                    thresholds: {
                      ...templateParams.thresholds,
                      criticalTemp: {
                        ...(templateParams.thresholds?.criticalTemp || {}),
                        max: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWaterLevel">Макс. уровень воды (мм)</Label>
                <Input
                  id="maxWaterLevel"
                  type="number"
                  value={templateParams.thresholds?.maxWaterLevel || 15}
                  onChange={(e) => setTemplateParams({
                    ...templateParams, 
                    thresholds: {
                      ...templateParams.thresholds,
                      maxWaterLevel: Number(e.target.value)
                    }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Уведомления */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Настройки уведомлений</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notificationsEnabled"
                  checked={templateParams.notifications?.enabled !== false}
                  onChange={(e) => setTemplateParams({
                    ...templateParams,
                    notifications: {
                      ...templateParams.notifications,
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <Label htmlFor="notificationsEnabled">Уведомления включены</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="drainAlerts"
                  checked={templateParams.notifications?.drainAlerts !== false}
                  onChange={(e) => setTemplateParams({
                    ...templateParams,
                    notifications: {
                      ...templateParams.notifications,
                      drainAlerts: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <Label htmlFor="drainAlerts">Оповещения о сливе</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="levelAlerts"
                  checked={templateParams.notifications?.levelAlerts !== false}
                  onChange={(e) => setTemplateParams({
                    ...templateParams,
                    notifications: {
                      ...templateParams.notifications,
                      levelAlerts: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <Label htmlFor="levelAlerts">Оповещения об уровне</Label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={handlePrevStep} disabled={loading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <Button onClick={handleNextStep} disabled={loading}>
          Далее
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const formData = getFormData();
    
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Подтверждение</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Проверьте данные перед созданием оборудования
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Тип оборудования</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedTemplate && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Settings className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedTemplate.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.technical_code} • {selectedTemplate.system_type}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Параметры экземпляра</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Название:</span>
                  <p className="font-medium">{formData.display_name}</p>
                </div>
                {formData.serial_number && (
                  <div>
                    <span className="text-muted-foreground">Серийный номер:</span>
                    <p className="font-medium">{formData.serial_number}</p>
                  </div>
                )}
                {formData.external_id && (
                  <div>
                    <span className="text-muted-foreground">Внешний ID:</span>
                    <p className="font-medium">{formData.external_id}</p>
                  </div>
                )}
                {formData.installation_date && (
                  <div>
                    <span className="text-muted-foreground">Дата установки:</span>
                    <p className="font-medium">
                      {format(formData.installation_date, "dd.MM.yyyy")}
                    </p>
                  </div>
                )}
              </div>
              {formData.description && (
                <div>
                  <span className="text-muted-foreground">Описание:</span>
                  <p className="font-medium text-sm mt-1">{formData.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTemplate && selectedTemplate.system_type === "fuel_tank" && Object.keys(templateParams).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Параметры резервуара</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {templateParams.fuelType && (
                    <div>
                      <span className="text-muted-foreground">Тип топлива:</span>
                      <p className="font-medium">{templateParams.fuelType}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Объем резервуара:</span>
                    <p className="font-medium">{templateParams.capacityLiters?.toLocaleString() || 0} л</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Текущий уровень:</span>
                    <p className="font-medium">{templateParams.currentLevelLiters?.toLocaleString() || 0} л</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Материал:</span>
                    <p className="font-medium">{templateParams.material || "steel"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Мин. уровень:</span>
                    <p className="font-medium">{templateParams.minLevelPercent || 20}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Крит. уровень:</span>
                    <p className="font-medium">{templateParams.criticalLevelPercent || 10}%</p>
                  </div>
                  {templateParams.temperature !== null && templateParams.temperature !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Температура:</span>
                      <p className="font-medium">{templateParams.temperature}°C</p>
                    </div>
                  )}
                  {templateParams.waterLevelMm !== null && templateParams.waterLevelMm !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Уровень воды:</span>
                      <p className="font-medium">{templateParams.waterLevelMm} мм</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button
              onClick={form.handleSubmit(handleFormSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать оборудование"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить оборудование из шаблона</DialogTitle>
        </DialogHeader>
        
        {renderStepIndicator()}
        
        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
}