import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, X, AlertTriangle, Clock, Users } from "lucide-react";
import { 
  CommandTemplate, 
  CommandCategory, 
  TargetType, 
  CreateCommandTemplateRequest,
  UpdateCommandTemplateRequest
} from "@/types/commandTemplate";
import { COMMAND_CATEGORIES } from "@/mock/commandTemplatesStore";

const commandTemplateSchema = z.object({
  name: z.string().min(1, "Техническое название обязательно").max(100),
  display_name: z.string().min(1, "Отображаемое название обязательно").max(255),
  description: z.string().min(1, "Описание обязательно").max(1000),
  category: z.enum([
    'shift_operations', 'pricing', 'reporting', 'maintenance', 'backup',
    'system', 'fuel_operations', 'equipment_control', 'pos_operations',
    'security', 'custom'
  ] as const),
  execution_timeout: z.number().min(10).max(3600).optional(),
  retry_count: z.number().min(0).max(10).optional(),
  is_dangerous: z.boolean().default(false),
  requires_confirmation: z.boolean().default(false),
  supports_scheduling: z.boolean().default(true),
  supports_batch_execution: z.boolean().default(false),
  documentation_url: z.string().url().optional().or(z.literal("")),
});

type CommandTemplateFormData = z.infer<typeof commandTemplateSchema>;

interface CommandTemplateFormProps {
  initialData?: CommandTemplate;
  onSubmit: (data: CreateCommandTemplateRequest | UpdateCommandTemplateRequest) => void;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'view';
}

export function CommandTemplateForm({ initialData, onSubmit, onCancel, mode }: CommandTemplateFormProps) {
  const [currentTab, setCurrentTab] = useState("basic");
  const [allowedTargets, setAllowedTargets] = useState<TargetType[]>(
    initialData?.allowed_targets || ['all_trading_points']
  );
  const [requiredParams, setRequiredParams] = useState<string[]>(
    initialData?.required_params || []
  );
  const [paramSchema, setParamSchema] = useState<string>(
    initialData?.param_schema ? JSON.stringify(initialData.param_schema, null, 2) : 
    JSON.stringify({
      type: "object",
      properties: {},
      required: []
    }, null, 2)
  );
  const [defaultParams, setDefaultParams] = useState<string>(
    initialData?.default_params ? JSON.stringify(initialData.default_params, null, 2) : "{}"
  );
  const [requiredPermissions, setRequiredPermissions] = useState<string[]>(
    initialData?.required_permissions || []
  );
  const [newPermission, setNewPermission] = useState("");
  const [newParam, setNewParam] = useState("");

  const isReadOnly = mode === 'view';

  const form = useForm<CommandTemplateFormData>({
    resolver: zodResolver(commandTemplateSchema),
    defaultValues: {
      name: initialData?.name || "",
      display_name: initialData?.display_name || "",
      description: initialData?.description || "",
      category: initialData?.category || 'custom',
      execution_timeout: initialData?.execution_timeout || 60,
      retry_count: initialData?.retry_count || 1,
      is_dangerous: initialData?.is_dangerous || false,
      requires_confirmation: initialData?.requires_confirmation || false,
      supports_scheduling: initialData?.supports_scheduling ?? true,
      supports_batch_execution: initialData?.supports_batch_execution || false,
      documentation_url: initialData?.documentation_url || "",
    },
  });

  const targetTypeOptions: Array<{value: TargetType, label: string}> = [
    { value: 'all_networks', label: 'Все сети' },
    { value: 'specific_network', label: 'Конкретная сеть' },
    { value: 'all_trading_points', label: 'Все торговые точки' },
    { value: 'specific_trading_point', label: 'Конкретная торговая точка' },
    { value: 'equipment_type', label: 'Тип оборудования' },
    { value: 'specific_equipment', label: 'Конкретное оборудование' },
    { value: 'component_type', label: 'Тип компонента' },
    { value: 'specific_component', label: 'Конкретный компонент' },
  ];

  const handleSubmit = (data: CommandTemplateFormData) => {
    let parsedParamSchema;
    let parsedDefaultParams;
    
    try {
      parsedParamSchema = JSON.parse(paramSchema);
    } catch (error) {
      form.setError("root", { message: "Некорректная схема параметров JSON" });
      return;
    }

    try {
      parsedDefaultParams = JSON.parse(defaultParams);
    } catch (error) {
      form.setError("root", { message: "Некорректные параметры по умолчанию JSON" });
      return;
    }

    const submitData = {
      ...data,
      param_schema: parsedParamSchema,
      default_params: parsedDefaultParams,
      allowed_targets: allowedTargets,
      required_params: requiredParams,
      required_permissions: requiredPermissions,
    };

    onSubmit(submitData);
  };

  const addPermission = () => {
    if (newPermission.trim() && !requiredPermissions.includes(newPermission.trim())) {
      setRequiredPermissions([...requiredPermissions, newPermission.trim()]);
      setNewPermission("");
    }
  };

  const removePermission = (permission: string) => {
    setRequiredPermissions(requiredPermissions.filter(p => p !== permission));
  };

  const addRequiredParam = () => {
    if (newParam.trim() && !requiredParams.includes(newParam.trim())) {
      setRequiredParams([...requiredParams, newParam.trim()]);
      setNewParam("");
    }
  };

  const removeRequiredParam = (param: string) => {
    setRequiredParams(requiredParams.filter(p => p !== param));
  };

  const toggleAllowedTarget = (target: TargetType) => {
    if (allowedTargets.includes(target)) {
      setAllowedTargets(allowedTargets.filter(t => t !== target));
    } else {
      setAllowedTargets([...allowedTargets, target]);
    }
  };

  const isFormValid = () => {
    const formData = form.getValues();
    return formData.name.trim() !== "" && 
           formData.display_name.trim() !== "" && 
           formData.description.trim() !== "" &&
           allowedTargets.length > 0;
  };

  if (mode === 'view') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-slate-300">Техническое название</Label>
            <p className="text-white mt-1">{initialData?.name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-300">Отображаемое название</Label>
            <p className="text-white mt-1">{initialData?.display_name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-300">Категория</Label>
            <p className="text-white mt-1">{COMMAND_CATEGORIES[initialData?.category || 'custom']?.name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-300">Версия</Label>
            <p className="text-white mt-1">{initialData?.version}</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-300">Описание</Label>
          <p className="text-white mt-1">{initialData?.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium text-slate-300">Таймаут (сек)</Label>
            <p className="text-white mt-1">{initialData?.execution_timeout || 'Не задан'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-300">Повторы</Label>
            <p className="text-white mt-1">{initialData?.retry_count || 0}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-300">Подтверждение</Label>
            <p className="text-white mt-1">{initialData?.requires_confirmation ? 'Требуется' : 'Не требуется'}</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-300">Возможности</Label>
          <div className="flex gap-4 mt-2">
            {initialData?.supports_scheduling && (
              <Badge variant="outline" className="text-slate-400">
                <Clock className="w-3 h-3 mr-1" />
                Планирование
              </Badge>
            )}
            {initialData?.supports_batch_execution && (
              <Badge variant="outline" className="text-slate-400">
                <Users className="w-3 h-3 mr-1" />
                Пакетное выполнение
              </Badge>
            )}
            {initialData?.is_dangerous && (
              <Badge variant="outline" className="text-orange-400 border-orange-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Опасная команда
              </Badge>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-300">Допустимые цели</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {initialData?.allowed_targets.map(target => (
              <Badge key={target} variant="outline" className="text-slate-400">
                {targetTypeOptions.find(opt => opt.value === target)?.label || target}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-300">Схема параметров</Label>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs mt-2 overflow-auto max-h-40">
            {JSON.stringify(initialData?.param_schema, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="targets">Цели</TabsTrigger>
              <TabsTrigger value="params">Параметры</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Техническое название</FormLabel>
                      <FormControl>
                        <Input 
                          className="bg-slate-700 border-slate-600" 
                          placeholder="shift_close" 
                          {...field} 
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        Уникальное имя для API (только латиница и подчеркивания)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отображаемое название</FormLabel>
                      <FormControl>
                        <Input 
                          className="bg-slate-700 border-slate-600" 
                          placeholder="Закрыть смену" 
                          {...field} 
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(COMMAND_CATEGORIES).map(([key, category]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="bg-slate-700 border-slate-600" 
                        placeholder="Подробное описание того, что делает эта команда"
                        rows={3}
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="targets" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Допустимые цели выполнения</Label>
                <p className="text-sm text-slate-400 mb-4">
                  Выберите типы объектов, к которым может применяться эта команда
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {targetTypeOptions.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={value}
                        checked={allowedTargets.includes(value)}
                        onCheckedChange={() => toggleAllowedTarget(value)}
                        disabled={isReadOnly}
                      />
                      <Label htmlFor={value} className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="params" className="space-y-4">
              <div>
                <Label htmlFor="paramSchema">Схема параметров (JSON Schema)</Label>
                <Textarea
                  id="paramSchema"
                  value={paramSchema}
                  onChange={(e) => setParamSchema(e.target.value)}
                  className="bg-slate-700 border-slate-600 font-mono text-sm"
                  rows={10}
                  placeholder='{"type": "object", "properties": {}, "required": []}'
                  disabled={isReadOnly}
                />
                <p className="text-xs text-slate-400 mt-1">
                  JSON Schema для валидации параметров команды
                </p>
              </div>

              <div>
                <Label htmlFor="defaultParams">Параметры по умолчанию (JSON)</Label>
                <Textarea
                  id="defaultParams"
                  value={defaultParams}
                  onChange={(e) => setDefaultParams(e.target.value)}
                  className="bg-slate-700 border-slate-600 font-mono text-sm"
                  rows={5}
                  placeholder='{}'
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label>Обязательные параметры</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newParam}
                    onChange={(e) => setNewParam(e.target.value)}
                    placeholder="Название параметра"
                    className="bg-slate-700 border-slate-600"
                    disabled={isReadOnly}
                  />
                  <Button type="button" onClick={addRequiredParam} disabled={isReadOnly}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredParams.map((param) => (
                    <Badge key={param} variant="outline" className="text-slate-400">
                      {param}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeRequiredParam(param)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="execution_timeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Таймаут выполнения (секунды)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          className="bg-slate-700 border-slate-600" 
                          placeholder="60" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retry_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Количество повторов</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          className="bg-slate-700 border-slate-600" 
                          placeholder="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="supports_scheduling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Поддержка планирования</FormLabel>
                        <FormDescription>
                          Команда может выполняться по расписанию
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supports_batch_execution"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Пакетное выполнение</FormLabel>
                        <FormDescription>
                          Команда может выполняться для нескольких объектов одновременно
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_dangerous"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          Потенциально опасная команда
                        </FormLabel>
                        <FormDescription>
                          Команда может привести к нарушению работы системы
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requires_confirmation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Требует подтверждения</FormLabel>
                        <FormDescription>
                          Перед выполнением команды требуется подтверждение пользователя
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <Label>Необходимые права доступа</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value)}
                    placeholder="Название права (например: shift_management)"
                    className="bg-slate-700 border-slate-600"
                    disabled={isReadOnly}
                  />
                  <Button type="button" onClick={addPermission} disabled={isReadOnly}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredPermissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-slate-400">
                      {permission}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removePermission(permission)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="documentation_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ссылка на документацию (опционально)</FormLabel>
                    <FormControl>
                      <Input 
                        type="url"
                        className="bg-slate-700 border-slate-600" 
                        placeholder="https://docs.example.com/commands/shift-close" 
                        {...field} 
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          {!isReadOnly && (
            <div className="flex justify-between pt-6 border-t border-slate-600">
              <Button type="button" variant="outline" onClick={onCancel}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={!isFormValid()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {mode === 'edit' ? "Сохранить изменения" : "Создать шаблон"}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}