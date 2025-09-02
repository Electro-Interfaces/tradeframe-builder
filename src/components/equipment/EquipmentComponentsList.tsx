import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, CircleCheck, XCircle, Power, Archive, Layers3, Edit, Trash2, Settings, Play, Terminal, Plus, X } from 'lucide-react';
import { currentComponentsAPI } from '@/services/components';
import { Component, ComponentStatus } from '@/types/component';
import { CommandInstance, CreateCommandInstanceRequest } from '@/types/commandTemplate';
import { NewCommandTemplate } from '@/types/connections';
import { currentNewTemplatesAPI } from '@/services/newConnectionsService';
import { commandsAPI } from '@/services/commandsService';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { CommandParametersEditor } from './CommandParametersEditor';

interface EquipmentComponentsListProps {
  equipmentId: string;
  onEditComponent?: (component: Component) => void;
  onDeleteComponent?: (component: Component) => void;
}

const getStatusConfig = (status: ComponentStatus) => {
  switch (status) {
    case 'online':
      return {
        icon: CircleCheck,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badgeColor: 'bg-green-500/20 text-green-400',
        text: 'Работает'
      };
    case 'error':
      return {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeColor: 'bg-red-500/20 text-red-400',
        text: 'Ошибка'
      };
    case 'offline':
      return {
        icon: AlertCircle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        text: 'Офлайн'
      };
    case 'disabled':
      return {
        icon: Power,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeColor: 'bg-gray-500/20 text-gray-400',
        text: 'Отключен'
      };
    case 'archived':
      return {
        icon: Archive,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        text: 'Архив'
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeColor: 'bg-gray-500/20 text-gray-400',
        text: 'Неизвестно'
      };
  }
};

export const EquipmentComponentsList: React.FC<EquipmentComponentsListProps> = ({ 
  equipmentId,
  onEditComponent,
  onDeleteComponent
}) => {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandTemplates, setCommandTemplates] = useState<NewCommandTemplate[]>([]);
  const [componentCommands, setComponentCommands] = useState<Record<string, CommandInstance[]>>({});
  const [addCommandDialogOpen, setAddCommandDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [executingCommands, setExecutingCommands] = useState<Set<string>>(new Set());
  const [commandParams, setCommandParams] = useState<Record<string, any>>({});
  const [showParamsForm, setShowParamsForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandInstance | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NewCommandTemplate | null>(null);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [showParametersEditor, setShowParametersEditor] = useState(false);
  const [componentCommandsData, setComponentCommandsData] = useState<Record<string, CommandInstance[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    const loadComponents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await currentComponentsAPI.list({ 
          equipment_id: equipmentId 
        });
        
        setComponents(response.data);
      } catch (err) {
        console.error('Failed to load components for equipment:', equipmentId, err);
        setError('Не удалось загрузить компоненты');
      } finally {
        setLoading(false);
      }
    };

    if (equipmentId) {
      loadComponents();
    }
  }, [equipmentId]);

  // Загрузка шаблонов команд
  useEffect(() => {
    const loadCommandTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await currentNewTemplatesAPI.list({ 
          status: 'active',
          limit: 100 
        });
        
        // Фильтруем шаблоны для компонентов
        const componentTemplates = response.data.filter(template => 
          template.scope === 'component' ||
          template.scope === 'equipment' ||
          template.scope === 'trading_point'
        );
        
        setCommandTemplates(componentTemplates);
      } catch (err) {
        console.error('Failed to load command templates:', err);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить шаблоны команд",
          variant: "destructive"
        });
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadCommandTemplates();
  }, []);

  // Обработка выбора шаблона
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = commandTemplates.find(t => t.template_id === templateId || t.id === templateId);
    if (template) {
      // Инициализируем параметры значениями по умолчанию
      setCommandParams({});
      setShowParamsForm(true);
    }
  };

  // Открытие редактора параметров для компонента
  const openParametersEditor = (component: Component, template: NewCommandTemplate) => {
    setEditingComponent(component);
    setEditingTemplate(template);
    setShowParametersEditor(true);
  };

  // Обработка успешного выполнения команды из редактора
  const handleComponentCommandSuccess = () => {
    setEditingComponent(null);
    setEditingTemplate(null);
    setShowParametersEditor(false);
    // Можно добавить обновление истории команд компонента
  };

  // Добавление команды к компоненту
  const handleAddCommand = async () => {
    if (!selectedComponent || !selectedTemplateId) return;

    try {
      const template = commandTemplates.find(t => t.id === selectedTemplateId);
      if (!template) return;

      // Создаем экземпляр команды с параметрами
      const newCommand: CommandInstance = {
        id: `cmd_inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: template.name,
        display_name: template.display_name,
        category: template.category,
        params: { ...commandParams },
        target: {
          type: 'specific_component',
          value: selectedComponent.id,
          description: `Компонент: ${selectedComponent.display_name}`
        },
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_from_template: template.id
      };

      // Сохраняем команду для компонента
      setComponentCommandsData(prev => ({
        ...prev,
        [selectedComponent.id]: [...(prev[selectedComponent.id] || []), newCommand]
      }));

      toast({
        title: "Команда добавлена",
        description: `Команда "${template.display_name}" добавлена к компоненту "${selectedComponent.display_name}"`
      });

      // Сброс состояния
      setAddCommandDialogOpen(false);
      setSelectedTemplateId('');
      setSelectedComponent(null);
      setCommandParams({});
      setShowParamsForm(false);
    } catch (err) {
      console.error('Failed to add command:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить команду",
        variant: "destructive"
      });
    }
  };

  // Выполнение команды
  const handleExecuteCommand = async (component: Component, template: CommandTemplate) => {
    const commandKey = `${component.id}-${template.id}`;
    
    try {
      setExecutingCommands(prev => new Set(prev).add(commandKey));
      
      // Симуляция выполнения команды
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Команда выполнена",
        description: `Команда "${template.display_name}" успешно выполнена для компонента "${component.display_name}"`
      });
    } catch (err) {
      console.error('Failed to execute command:', err);
      toast({
        title: "Ошибка выполнения",
        description: `Не удалось выполнить команду "${template.display_name}"`,
        variant: "destructive"
      });
    } finally {
      setExecutingCommands(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandKey);
        return newSet;
      });
    }
  };

  // Открытие диалога добавления команды
  const openAddCommandDialog = (component: Component) => {
    setSelectedComponent(component);
    setEditingCommand(null);
    setSelectedTemplateId('');
    setCommandParams({});
    setShowParamsForm(false);
    setAddCommandDialogOpen(true);
  };

  // Редактирование команды
  const handleEditCommand = (command: CommandInstance) => {
    setSelectedComponent(components.find(c => c.id === command.target.value) || null);
    setEditingCommand(command);
    setSelectedTemplateId(command.created_from_template || '');
    setCommandParams(command.params || {});
    setShowParamsForm(true);
    setAddCommandDialogOpen(true);
  };

  // Обновление параметров команды
  const handleUpdateCommand = async () => {
    if (!editingCommand || !selectedComponent) return;

    try {
      const updatedCommand: CommandInstance = {
        ...editingCommand,
        params: { ...commandParams },
        updated_at: new Date().toISOString()
      };

      // Обновляем команду в списке
      setComponentCommandsData(prev => ({
        ...prev,
        [selectedComponent.id]: (prev[selectedComponent.id] || []).map(cmd => 
          cmd.id === editingCommand.id ? updatedCommand : cmd
        )
      }));

      toast({
        title: "Команда обновлена",
        description: `Параметры команды "${editingCommand.display_name}" обновлены`
      });

      // Сброс состояния
      setAddCommandDialogOpen(false);
      setEditingCommand(null);
      setSelectedTemplateId('');
      setSelectedComponent(null);
      setCommandParams({});
      setShowParamsForm(false);
    } catch (err) {
      console.error('Failed to update command:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить команду",
        variant: "destructive"
      });
    }
  };

  // Удаление команды
  const handleDeleteCommand = (commandId: string, componentId: string) => {
    setComponentCommandsData(prev => ({
      ...prev,
      [componentId]: (prev[componentId] || []).filter(cmd => cmd.id !== commandId)
    }));

    toast({
      title: "Команда удалена",
      description: "Команда была успешно удалена"
    });
  };

  // Обработка изменения параметра
  const handleParamChange = (paramName: string, value: any) => {
    setCommandParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // Рендер формы параметров
  const renderParamInput = (paramName: string, schema: any, value: any) => {
    const paramSchema = schema.properties?.[paramName];
    if (!paramSchema) return null;

    const inputProps = {
      id: paramName,
      value: value || '',
      onChange: (e: any) => handleParamChange(paramName, e.target.value)
    };

    switch (paramSchema.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={paramName}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleParamChange(paramName, checked)}
            />
            <Label htmlFor={paramName} className="text-white">{paramSchema.title || paramName}</Label>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            min={paramSchema.minimum}
            max={paramSchema.maximum}
            className="bg-slate-700 border-slate-600 text-white"
            {...inputProps}
            onChange={(e) => handleParamChange(paramName, Number(e.target.value))}
          />
        );

      case 'string':
        if (paramSchema.enum) {
          return (
            <Select value={value || ''} onValueChange={(val) => handleParamChange(paramName, val)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder={`Выберите ${paramSchema.title || paramName}`} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {paramSchema.enum.map((option: string, index: number) => (
                  <SelectItem key={option} value={option} className="text-white hover:bg-slate-700">
                    {paramSchema.enumNames?.[index] || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        } else {
          return (
            <Input
              className="bg-slate-700 border-slate-600 text-white"
              {...inputProps}
            />
          );
        }

      default:
        return (
          <Textarea
            className="bg-slate-700 border-slate-600 text-white min-h-20"
            {...inputProps}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-400">Загрузка компонентов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Layers3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            У этого оборудования нет компонентов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-white font-medium mb-4">
        Компоненты ({components.length})
      </h4>
      
      <div className="grid gap-3">
        {components.map((component) => {
          const config = getStatusConfig(component.status);
          const Icon = config.icon;
          
          return (
            <div
              key={component.id}
              className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "rounded-full border-2 p-1.5 flex-shrink-0",
                  "bg-slate-700 border-slate-600"
                )}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-white truncate">
                      {component.display_name}
                    </h5>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", config.badgeColor)}
                    >
                      {config.text}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{component.system_type}</span>
                    {component.serial_number && (
                      <span>S/N: {component.serial_number}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Commands dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-slate-300 hover:text-blue-400 hover:bg-blue-500/20 border border-slate-600"
                      title="Управление командами"
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 bg-slate-800 border-slate-600" side="left">
                    <div className="p-3 border-b border-slate-600 bg-slate-700">
                      <h4 className="font-semibold text-sm text-white">Команды компонента</h4>
                      <p className="text-xs text-slate-300">{component.display_name}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-2 text-slate-200 hover:text-white hover:bg-slate-700"
                        onClick={() => openAddCommandDialog(component)}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Добавить команду
                      </Button>
                      
                      {/* Существующие команды компонента */}
                      {componentCommandsData[component.id]?.length > 0 && (
                        <>
                          <div className="border-t border-slate-600 my-1"></div>
                          <div className="text-xs text-slate-400 px-2 py-1">Команды компонента:</div>
                          {componentCommandsData[component.id].map(command => (
                            <div key={command.id} className="flex items-center justify-between px-2 py-1 bg-slate-900/50 rounded">
                              <span className="text-xs text-slate-300 flex-1">{command.display_name}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400"
                                  onClick={() => handleEditCommand(command)}
                                  title="Редактировать"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                                  onClick={() => handleDeleteCommand(command.id, component.id)}
                                  title="Удалить"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {/* Quick execute common commands */}
                      {commandTemplates.slice(0, 2).map(template => {
                        const commandKey = `${component.id}-${template.id}`;
                        const isExecuting = executingCommands.has(commandKey);
                        
                        return (
                          <Button
                            key={template.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-slate-200 hover:text-white hover:bg-slate-700"
                            onClick={() => openParametersEditor(component, template)}
                            disabled={isExecuting}
                            title="Настроить и выполнить команду"
                          >
                            {isExecuting ? (
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                              <Settings className="h-3 w-3 mr-2" />
                            )}
                            {template.name}
                          </Button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {onEditComponent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditComponent(component);
                    }}
                    title="Редактировать компонент"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                {onDeleteComponent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComponent(component);
                    }}
                    title="Удалить компонент"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Диалог добавления/редактирования команды */}
      <Dialog open={addCommandDialogOpen} onOpenChange={setAddCommandDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-800 border-slate-600 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCommand ? 'Редактировать команду' : 'Добавить команду'}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {editingCommand 
                ? `Редактирование команды "${editingCommand.display_name}"` 
                : `Выберите шаблон команды для компонента "${selectedComponent?.display_name}"`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Выбор шаблона (только при добавлении) */}
            {!editingCommand && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-white">Шаблон команды</label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Выберите шаблон команды" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {commandTemplates.map(template => (
                      <SelectItem key={template.template_id || template.id} value={template.template_id || template.id} className="text-white hover:bg-slate-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-slate-400">{template.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Форма параметров */}
            {showParamsForm && selectedTemplateId && (
              <div className="space-y-4 border-t border-slate-600 pt-4">
                <h3 className="text-lg font-medium text-white">Параметры команды</h3>
                {(() => {
                  const template = commandTemplates.find(t => t.id === selectedTemplateId);
                  if (!template?.param_schema?.properties) {
                    return <p className="text-slate-400">У этой команды нет настраиваемых параметров.</p>;
                  }

                  return Object.entries(template.param_schema.properties).map(([paramName, paramSchema]: [string, any]) => (
                    <div key={paramName} className="space-y-2">
                      <Label htmlFor={paramName} className="text-white font-medium">
                        {paramSchema.title || paramName}
                        {template.required_params?.includes(paramName) && (
                          <span className="text-red-400 ml-1">*</span>
                        )}
                      </Label>
                      {paramSchema.description && (
                        <p className="text-xs text-slate-400">{paramSchema.description}</p>
                      )}
                      {renderParamInput(paramName, template.param_schema, commandParams[paramName])}
                    </div>
                  ));
                })()}
              </div>
            )}
            
            {/* Кнопки действий */}
            <div className="flex justify-end gap-2 border-t border-slate-600 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setAddCommandDialogOpen(false);
                  setEditingCommand(null);
                  setShowParamsForm(false);
                  setCommandParams({});
                  setSelectedTemplateId('');
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Отмена
              </Button>
              
              {editingCommand ? (
                <Button 
                  onClick={handleUpdateCommand}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Обновить
                </Button>
              ) : (
                <Button 
                  onClick={handleAddCommand}
                  disabled={!selectedTemplateId || !showParamsForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Добавить
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования параметров команды для компонента */}
      <CommandParametersEditor
        open={showParametersEditor}
        onClose={() => {
          setShowParametersEditor(false);
          setEditingTemplate(null);
          setEditingComponent(null);
        }}
        template={editingTemplate}
        targetType="component"
        targetId={editingComponent?.id || ''}
        targetName={editingComponent?.display_name}
        onSuccess={handleComponentCommandSuccess}
      />
    </div>
  );
};

export default EquipmentComponentsList;