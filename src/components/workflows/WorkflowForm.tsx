import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Settings, Clock, Target, Bell, AlertTriangle } from 'lucide-react';
import {
  Workflow,
  CreateWorkflowRequest,
  WorkflowType,
  ScheduleFrequency,
  TemplateScope,
  WORKFLOW_TYPE_CONFIGS,
  DEFAULT_RETRY_POLICY,
  DEFAULT_NOTIFICATION_CONFIG
} from '@/types/workflows';
import { currentNewTemplatesAPI } from '@/services/newConnectionsService';

interface WorkflowFormProps {
  initialData?: Partial<Workflow>;
  onSubmit: (data: CreateWorkflowRequest) => void;
  onCancel: () => void;
}

export function WorkflowForm({ initialData, onSubmit, onCancel }: WorkflowFormProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateWorkflowRequest>(() => ({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'custom',
    schedule: initialData?.schedule || { frequency: 'hours', interval: 1 },
    endpoints: initialData?.endpoints?.map(ep => ({
      template_id: ep.template_id,
      enabled: ep.enabled,
      priority: ep.priority,
      parameters: ep.parameters,
      conditions: ep.conditions
    })) || [],
    targets: initialData?.targets || {
      scope: 'network',
      include_all: true
    },
    retry_policy: { ...DEFAULT_RETRY_POLICY, ...initialData?.retry_policy },
    timeout_ms: initialData?.timeout_ms || 30000,
    max_concurrent_executions: initialData?.max_concurrent_executions || 1,
    notifications: { ...DEFAULT_NOTIFICATION_CONFIG, ...initialData?.notifications },
    tags: initialData?.tags || []
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await currentNewTemplatesAPI.list();
        setAvailableTemplates(response.data);
      } catch (error) {
        console.error('Failed to load templates:', error);
        setAvailableTemplates([]);
      }
    };
    loadTemplates();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }
    if (formData.endpoints.length === 0) {
      newErrors.endpoints = 'Должен быть выбран хотя бы один endpoint';
    }
    if (formData.schedule.interval <= 0) {
      newErrors.interval = 'Интервал должен быть больше 0';
    }

    // Performance warnings
    if (formData.schedule.frequency === 'minutes' && formData.schedule.interval < 5) {
      newWarnings.push('Частое выполнение может создать нагрузку на систему');
    }
    if (formData.endpoints.length > 3) {
      newWarnings.push('Большое количество endpoints может увеличить время выполнения');
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleTypeChange = (type: WorkflowType) => {
    const config = WORKFLOW_TYPE_CONFIGS[type];
    const defaultEndpoints = config.default_endpoints.map((templateId, index) => ({
      template_id: templateId,
      enabled: true,
      priority: index + 1,
      parameters: {},
      conditions: []
    }));

    setFormData(prev => ({
      ...prev,
      type,
      schedule: config.default_schedule,
      endpoints: type === 'custom' ? prev.endpoints : defaultEndpoints
    }));
  };

  const addEndpoint = () => {
    setFormData(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, {
        template_id: '',
        enabled: true,
        priority: prev.endpoints.length + 1,
        parameters: {},
        conditions: []
      }]
    }));
  };

  const updateEndpoint = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      endpoints: prev.endpoints.map((ep, i) => 
        i === index ? { ...ep, ...updates } : ep
      )
    }));
  };

  const removeEndpoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter((_, i) => i !== index)
    }));
  };

  const getAvailableTemplates = () => {
    return availableTemplates.filter(template => 
      !formData.endpoints.some(ep => ep.template_id === template.id)
    );
  };

  return (
    <div className="max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Общие
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Расписание
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Название регламента</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Ежедневная синхронизация цен"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание назначения регламента"
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div>
                <Label htmlFor="type">Тип регламента</Label>
                <Select value={formData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип регламента" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKFLOW_TYPE_CONFIGS).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.type !== 'custom' && (
                  <p className="text-slate-400 text-sm mt-1">
                    {WORKFLOW_TYPE_CONFIGS[formData.type]?.description}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="tags">Теги (через запятую)</Label>
                <Input
                  id="tags"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  }))}
                  placeholder="производство, мониторинг, критичный"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки расписания</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Частота</Label>
                  <Select 
                    value={formData.schedule.frequency} 
                    onValueChange={(freq: ScheduleFrequency) => 
                      setFormData(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, frequency: freq }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Минуты</SelectItem>
                      <SelectItem value="hours">Часы</SelectItem>
                      <SelectItem value="days">Дни</SelectItem>
                      <SelectItem value="weeks">Недели</SelectItem>
                      <SelectItem value="months">Месяцы</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="interval">Интервал</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={formData.schedule.interval}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, interval: parseInt(e.target.value) || 1 }
                    }))}
                    className={errors.interval ? 'border-red-500' : ''}
                  />
                  {errors.interval && <p className="text-red-500 text-sm mt-1">{errors.interval}</p>}
                </div>
              </div>

              <div className="text-sm text-slate-400">
                Выполнение: каждые {formData.schedule.interval} {
                  formData.schedule.frequency === 'minutes' ? 'минут' :
                  formData.schedule.frequency === 'hours' ? 'часов' :
                  formData.schedule.frequency === 'days' ? 'дней' :
                  formData.schedule.frequency === 'weeks' ? 'недель' : 'месяцев'
                }
              </div>

              {formData.schedule.frequency === 'days' && (
                <div>
                  <Label htmlFor="start_time">Время запуска (ЧЧ:ММ)</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.schedule.start_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, start_time: e.target.value }
                    }))}
                  />
                </div>
              )}

              {formData.schedule.frequency === 'weeks' && (
                <div>
                  <Label>Дни недели</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
                      <label key={index} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.schedule.days_of_week?.includes(index + 1) || false}
                          onCheckedChange={(checked) => {
                            const days = formData.schedule.days_of_week || [];
                            setFormData(prev => ({
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                days_of_week: checked 
                                  ? [...days, index + 1]
                                  : days.filter(d => d !== index + 1)
                              }
                            }));
                          }}
                        />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeout">Таймаут выполнения (мс)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1000"
                    value={formData.timeout_ms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      timeout_ms: parseInt(e.target.value) || 30000
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="concurrent">Макс. параллельных выполнений</Label>
                  <Input
                    id="concurrent"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_concurrent_executions}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      max_concurrent_executions: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="timezone">Часовой пояс</Label>
                <Select
                  value={formData.schedule.timezone || 'Europe/Moscow'}
                  onValueChange={(timezone) =>
                    setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, timezone }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                    <SelectItem value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</SelectItem>
                    <SelectItem value="Asia/Krasnoyarsk">Красноярск (UTC+7)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Retry Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Политика повторных попыток</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_attempts">Максимум попыток</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.retry_policy?.max_attempts || DEFAULT_RETRY_POLICY.max_attempts}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retry_policy: {
                        ...prev.retry_policy,
                        max_attempts: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="backoff">Стратегия задержки</Label>
                  <Select
                    value={formData.retry_policy?.backoff || DEFAULT_RETRY_POLICY.backoff}
                    onValueChange={(backoff: 'fixed' | 'exponential') =>
                      setFormData(prev => ({
                        ...prev,
                        retry_policy: { ...prev.retry_policy, backoff }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Фиксированная</SelectItem>
                      <SelectItem value="exponential">Экспоненциальная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initial_delay">Начальная задержка (мс)</Label>
                  <Input
                    id="initial_delay"
                    type="number"
                    min="100"
                    value={formData.retry_policy?.initial_delay_ms || DEFAULT_RETRY_POLICY.initial_delay_ms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retry_policy: {
                        ...prev.retry_policy,
                        initial_delay_ms: parseInt(e.target.value) || 1000
                      }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="max_delay">Максимальная задержка (мс)</Label>
                  <Input
                    id="max_delay"
                    type="number"
                    min="1000"
                    value={formData.retry_policy?.max_delay_ms || DEFAULT_RETRY_POLICY.max_delay_ms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retry_policy: {
                        ...prev.retry_policy,
                        max_delay_ms: parseInt(e.target.value) || 30000
                      }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Configuration */}
        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Выбор и настройка endpoints</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addEndpoint}
                disabled={getAvailableTemplates().length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить endpoint
              </Button>
            </CardHeader>
            <CardContent>
              {formData.endpoints.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Endpoints не добавлены</p>
                  <Button
                    variant="outline"
                    onClick={addEndpoint}
                    className="mt-4"
                    disabled={getAvailableTemplates().length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить первый endpoint
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.endpoints.map((endpoint, index) => {
                    const template = availableTemplates.find(t => t.id === endpoint.template_id);
                    return (
                      <Card key={index} className="border-slate-600">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{endpoint.priority}</Badge>
                              <span className="font-medium">
                                {template?.name || 'Шаблон не выбран'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={endpoint.enabled}
                                onCheckedChange={(checked) => 
                                  updateEndpoint(index, { enabled: checked })
                                }
                              />
                              <span className="text-sm">Включен</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEndpoint(index)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Template</Label>
                              <Select
                                value={endpoint.template_id}
                                onValueChange={(templateId) => 
                                  updateEndpoint(index, { template_id: templateId })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите template" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTemplates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Приоритет</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={endpoint.priority}
                                onChange={(e) => 
                                  updateEndpoint(index, { priority: parseInt(e.target.value) || 1 })
                                }
                              />
                            </div>
                          </div>

                          {template && (
                            <div className="mt-4">
                              <p className="text-sm text-slate-400">{template.description}</p>
                              <div className="text-xs text-slate-500 mt-1">
                                Scope: {template.scope} | Метод: {template.http_method} {template.endpoint}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {errors.endpoints && <p className="text-red-500 text-sm mt-2">{errors.endpoints}</p>}
            </CardContent>
          </Card>

          {/* Target Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Настройка целей выполнения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Область применения</Label>
                <Select
                  value={formData.targets.scope}
                  onValueChange={(scope: TemplateScope) =>
                    setFormData(prev => ({
                      ...prev,
                      targets: { ...prev.targets, scope }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">Сеть</SelectItem>
                    <SelectItem value="trading_point">Торговая точка</SelectItem>
                    <SelectItem value="equipment">Оборудование</SelectItem>
                    <SelectItem value="component">Компонент</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="include_all"
                  checked={formData.targets.include_all || false}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({
                      ...prev,
                      targets: { ...prev.targets, include_all: !!checked }
                    }))
                  }
                />
                <Label htmlFor="include_all">
                  Применять ко всем объектам выбранной области
                </Label>
              </div>

              {!formData.targets.include_all && (
                <div className="text-sm text-slate-400 p-3 bg-slate-700 rounded">
                  При снятии галочки появятся поля для выбора конкретных объектов.
                  В текущей версии поддерживается только режим "все объекты".
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки уведомлений</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notifications_enabled"
                  checked={formData.notifications?.enabled || false}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        enabled: !!checked
                      }
                    }))
                  }
                />
                <Label htmlFor="notifications_enabled">Включить уведомления</Label>
              </div>

              {formData.notifications?.enabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="on_success"
                        checked={formData.notifications?.on_success || false}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              on_success: !!checked
                            }
                          }))
                        }
                      />
                      <Label htmlFor="on_success">При успешном выполнении</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="on_failure"
                        checked={formData.notifications?.on_failure || false}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              on_failure: !!checked
                            }
                          }))
                        }
                      />
                      <Label htmlFor="on_failure">При ошибке</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="on_critical_failure"
                        checked={formData.notifications?.on_critical_failure || false}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              on_critical_failure: !!checked
                            }
                          }))
                        }
                      />
                      <Label htmlFor="on_critical_failure">При критической ошибке</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email_recipients">Email получатели (через запятую)</Label>
                    <Input
                      id="email_recipients"
                      value={formData.notifications?.email_recipients?.join(', ') || ''}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            email_recipients: e.target.value
                              .split(',')
                              .map(email => email.trim())
                              .filter(email => email)
                          }
                        }))
                      }
                      placeholder="admin@example.com, operator@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="webhook_url">Webhook URL (опционально)</Label>
                    <Input
                      id="webhook_url"
                      value={formData.notifications?.webhook_url || ''}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            webhook_url: e.target.value
                          }
                        }))
                      }
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="mt-6 border-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-400">Предупреждения</h4>
                <ul className="text-sm text-slate-400 mt-1 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-600">
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSubmit} disabled={Object.keys(errors).length > 0}>
          {initialData ? 'Обновить регламент' : 'Создать регламент'}
        </Button>
      </div>
    </div>
  );
}