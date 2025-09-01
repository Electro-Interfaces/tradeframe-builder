import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft,
  ChevronRight,
  Check,
  Settings,
  Layers3,
  AlertCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

import { 
  ComponentTemplate,
  CreateComponentRequest,
  ComponentInput
} from "@/types/component";
import { componentTemplatesStore } from "@/mock/componentTemplatesStore";

interface ComponentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentTemplateId?: string;
  tradingPointId: string;
  onSubmit: (data: CreateComponentRequest) => Promise<void>;
  loading?: boolean;
}

// Схемы валидации
const templateSelectionSchema = z.object({
  template_id: z.string().min(1, "Выберите шаблон компонента")
});

const componentDetailsSchema = z.object({
  display_name: z.string().min(1, "Название обязательно"),
  serial_number: z.string().optional(),
  params: z.record(z.any()).optional()
});

type TemplateSelectionData = z.infer<typeof templateSelectionSchema>;
type ComponentDetailsData = z.infer<typeof componentDetailsSchema>;

type WizardStep = 1 | 2 | 3;

export function ComponentWizard({
  open,
  onOpenChange,
  equipmentId,
  equipmentTemplateId,
  tradingPointId,
  onSubmit,
  loading = false
}: ComponentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null);
  const [compatibleTemplates, setCompatibleTemplates] = useState<ComponentTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Формы для каждого шага
  const templateForm = useForm<TemplateSelectionData>({
    resolver: zodResolver(templateSelectionSchema)
  });

  const detailsForm = useForm<ComponentDetailsData>({
    resolver: zodResolver(componentDetailsSchema),
    defaultValues: {
      display_name: "",
      serial_number: "",
      params: {}
    }
  });

  // Загружаем совместимые шаблоны при открытии
  useEffect(() => {
    if (open && equipmentTemplateId) {
      const templates = componentTemplatesStore.getCompatibleTemplates(equipmentTemplateId);
      setCompatibleTemplates(templates);
    } else if (open) {
      // Если нет template_id оборудования, показываем все шаблоны
      setCompatibleTemplates(componentTemplatesStore.getAll());
    }
  }, [open, equipmentTemplateId]);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setSelectedTemplate(null);
      templateForm.reset();
      detailsForm.reset();
    }
  }, [open, templateForm, detailsForm]);

  // Обновляем defaults при выборе шаблона
  useEffect(() => {
    if (selectedTemplate) {
      detailsForm.reset({
        display_name: selectedTemplate.name,
        serial_number: "",
        params: { ...selectedTemplate.defaults }
      });
    }
  }, [selectedTemplate, detailsForm]);

  const handleTemplateSelect = (data: TemplateSelectionData) => {
    const template = componentTemplatesStore.getById(data.template_id);
    setSelectedTemplate(template);
    setCurrentStep(2);
  };

  const handleDetailsSubmit = (data: ComponentDetailsData) => {
    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!selectedTemplate) return;

    const detailsData = detailsForm.getValues();
    
    const createRequest: CreateComponentRequest = {
      trading_point_id: tradingPointId,
      equipment_id: equipmentId,
      template_id: selectedTemplate.id,
      overrides: {
        display_name: detailsData.display_name,
        serial_number: detailsData.serial_number,
        params: detailsData.params
      }
    };

    setIsSubmitting(true);
    try {
      await onSubmit(createRequest);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const goNext = () => {
    if (currentStep === 1) {
      templateForm.handleSubmit(handleTemplateSelect)();
    } else if (currentStep === 2) {
      detailsForm.handleSubmit(handleDetailsSubmit)();
    }
  };

  const getStepTitle = (step: WizardStep) => {
    switch (step) {
      case 1: return "Выбор шаблона";
      case 2: return "Параметры компонента";
      case 3: return "Подтверждение";
    }
  };

  const getStepDescription = (step: WizardStep) => {
    switch (step) {
      case 1: return "Выберите тип компонента из совместимых шаблонов";
      case 2: return "Настройте параметры и укажите детали";
      case 3: return "Проверьте данные и подтвердите создание";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-blue-600" />
              Добавление компонента (ДЕМО)
            </DialogTitle>
            <DialogDescription>
              {getStepDescription(currentStep)}
            </DialogDescription>
            <div className="mt-2 text-xs text-amber-500 bg-amber-900/20 px-2 py-1 rounded border border-amber-500/20">
              ⚠️ ДЕМО РЕЖИМ: Данные не сохранятся на сервере
            </div>
          </DialogHeader>

          {/* Прогресс-бар */}
          <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Шаг {currentStep} из 3</span>
            <span className="font-medium">{getStepTitle(currentStep)}</span>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </div>

        {/* Шаг 1: Выбор шаблона */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleTemplateSelect)}>
                <FormField
                  control={templateForm.control}
                  name="template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Выберите тип компонента</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-3"
                        >
                          {compatibleTemplates.length === 0 ? (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Для данного типа оборудования нет совместимых компонентов
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-3">
                                {compatibleTemplates.map((template) => (
                                  <div key={template.id} className="flex items-start space-x-3">
                                    <RadioGroupItem 
                                      value={template.id} 
                                      id={template.id}
                                      className="mt-2"
                                    />
                                    <Card 
                                      className={cn(
                                        "flex-1 cursor-pointer transition-colors hover:bg-accent",
                                        field.value === template.id && "border-primary bg-accent"
                                      )}
                                      onClick={() => field.onChange(template.id)}
                                    >
                                      <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <CardTitle className="text-base">{template.name}</CardTitle>
                                            <CardDescription className="mt-1">
                                              Код: {template.code}
                                            </CardDescription>
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            {template.id.split('_')[1]?.toUpperCase()}
                                          </Badge>
                                        </div>
                                      </CardHeader>
                                      {Object.keys(template.defaults).length > 0 && (
                                        <CardContent className="pt-0">
                                          <div className="text-xs text-muted-foreground">
                                            <strong>Параметры по умолчанию:</strong>
                                            <div className="mt-1 space-y-1">
                                              {Object.entries(template.defaults).slice(0, 3).map(([key, value]) => (
                                                <div key={key} className="flex justify-between">
                                                  <span>{key}:</span>
                                                  <span>{String(value)}</span>
                                                </div>
                                              ))}
                                              {Object.keys(template.defaults).length > 3 && (
                                                <div className="text-muted-foreground">
                                                  ... и еще {Object.keys(template.defaults).length - 3}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      )}
                                    </Card>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        )}

        {/* Шаг 2: Параметры компонента */}
        {currentStep === 2 && selectedTemplate && (
          <div className="space-y-6">
            <Form {...detailsForm}>
              <form onSubmit={detailsForm.handleSubmit(handleDetailsSubmit)}>
                <div className="space-y-6">
                  {/* Базовая информация */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Основная информация</CardTitle>
                      <CardDescription>
                        Шаблон: {selectedTemplate.name} ({selectedTemplate.code})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={detailsForm.control}
                        name="display_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Название компонента *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Введите название" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={detailsForm.control}
                        name="serial_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Серийный номер</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Введите серийный номер" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Параметры из шаблона */}
                  {selectedTemplate.params_schema && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Параметры</CardTitle>
                        <CardDescription>
                          Настройте параметры компонента согласно шаблону
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Alert className="mb-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Детальное управление параметрами будет добавлено в следующей версии.
                            Пока используются значения по умолчанию.
                          </AlertDescription>
                        </Alert>

                        {/* Показываем defaults */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Параметры по умолчанию:</Label>
                          <div className="bg-muted rounded-lg p-3">
                            <pre className="text-xs text-muted-foreground">
                              {JSON.stringify(selectedTemplate.defaults, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Шаг 3: Подтверждение */}
        {currentStep === 3 && selectedTemplate && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  Подтверждение создания
                </CardTitle>
                <CardDescription>
                  Проверьте данные перед созданием компонента
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Название
                    </Label>
                    <p className="mt-1">{detailsForm.getValues('display_name')}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Тип компонента
                    </Label>
                    <p className="mt-1">{selectedTemplate.name}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Серийный номер
                    </Label>
                    <p className="mt-1">{detailsForm.getValues('serial_number') || "—"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Технический код
                    </Label>
                    <p className="mt-1">{selectedTemplate.code}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Параметры компонента
                  </Label>
                  <div className="mt-2 bg-muted rounded-lg p-3">
                    <pre className="text-xs text-muted-foreground">
                      {JSON.stringify(detailsForm.getValues('params') || selectedTemplate.defaults, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Кнопки навигации */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={goNext}
                disabled={compatibleTemplates.length === 0 || loading}
              >
                Далее
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                {isSubmitting ? "Создание..." : "Создать компонент"}
              </Button>
            )}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}