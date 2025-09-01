import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Copy, Trash2, Play, Search, Settings, Cog } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';

// Import new types and services
import { 
  Command, 
  CommandTemplate, 
  CreateCommandRequest,
  CommandStatusAction 
} from '@/types/command';
import { commandsAPI, commandTemplatesStore } from '@/services/commandsService';

// Schema for creating command from template
const createCommandSchema = z.object({
  template_id: z.string().min(1, 'Выберите шаблон команды'),
  display_name: z.string().min(1, 'Название команды обязательно'),
  trading_point_id: z.string().optional(),
  custom_endpoint: z.string().optional(),
  custom_timeout: z.number().optional(),
  custom_json_template: z.string().optional(),
});

type CreateCommandForm = z.infer<typeof createCommandSchema>;

export default function Commands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandTemplates, setCommandTemplates] = useState<CommandTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const createForm = useForm<CreateCommandForm>({
    resolver: zodResolver(createCommandSchema),
    defaultValues: {
      template_id: '',
      display_name: '',
      trading_point_id: '',
      custom_endpoint: '',
      custom_timeout: undefined,
      custom_json_template: '',
    }
  });

  // Load commands and templates
  const loadData = async () => {
    try {
      setLoading(true);
      const [commandsResponse] = await Promise.all([
        commandsAPI.list({ limit: 100 })
      ]);
      
      setCommands(commandsResponse.data);
      setCommandTemplates(commandTemplatesStore.getAll());
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные команд",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered commands
  const filteredCommands = useMemo(() => {
    return commands.filter(command => {
      const matchesSearch = searchQuery === '' || 
        command.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        command.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || command.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || command.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [commands, searchQuery, statusFilter, categoryFilter]);

  const handleCreateCommand = async (data: CreateCommandForm) => {
    try {
      const request: CreateCommandRequest = {
        template_id: data.template_id,
        display_name: data.display_name,
        trading_point_id: data.trading_point_id || undefined,
        custom_params: {
          endpoint: data.custom_endpoint || undefined,
          timeout: data.custom_timeout || undefined,
          json_template: data.custom_json_template || undefined,
        }
      };

      const newCommand = await commandsAPI.create(request);
      setCommands(prev => [...prev, newCommand]);
      setIsCreateDialogOpen(false);
      createForm.reset();
      
      toast({
        title: "Команда создана",
        description: `Команда "${newCommand.display_name}" успешно создана`,
      });
    } catch (error) {
      toast({
        title: "Ошибка создания",
        description: error instanceof Error ? error.message : "Не удалось создать команду",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (commandId: string, action: CommandStatusAction) => {
    try {
      const updatedCommand = await commandsAPI.updateStatus(commandId, action);
      if (updatedCommand) {
        setCommands(prev => prev.map(cmd => 
          cmd.id === commandId ? updatedCommand : cmd
        ));
        
        const statusText = action === 'activate' ? 'активирована' : 
                          action === 'deactivate' ? 'деактивирована' : 'архивирована';
        
        toast({
          title: "Статус изменен",
          description: `Команда ${statusText}`,
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка изменения статуса",
        description: error instanceof Error ? error.message : "Не удалось изменить статус команды",
        variant: "destructive",
      });
    }
  };

  const executeCommand = async (commandId: string) => {
    try {
      await commandsAPI.execute({ command_id: commandId });
      toast({
        title: "Команда запущена",
        description: "Команда отправлена на выполнение",
      });
    } catch (error) {
      toast({
        title: "Ошибка выполнения",
        description: error instanceof Error ? error.message : "Не удалось выполнить команду",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'inactive': return 'Неактивна'; 
      case 'archived': return 'Архивирована';
      default: return status;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'system': return 'Система';
      case 'control': return 'Управление';
      case 'diagnostic': return 'Диагностика';
      case 'maintenance': return 'Обслуживание';
      default: return category;
    }
  };

  const getTargetTypeText = (targetType: string) => {
    switch (targetType) {
      case 'trading_point': return 'Торговая точка';
      case 'equipment': return 'Оборудование';
      case 'component': return 'Компонент';
      default: return targetType;
    }
  };

  // Selected template for form
  const selectedTemplate = commandTemplates.find(t => t.id === createForm.watch('template_id'));

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Команды</h1>
            <p className="text-gray-600">
              Управление командами для оборудования и торговых точек
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Добавить команду
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создать команду из шаблона</DialogTitle>
              </DialogHeader>
              
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateCommand)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={createForm.control}
                      name="template_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Шаблон команды</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите шаблон команды" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {commandTemplates
                                .filter(template => template.status)
                                .map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{template.display_name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {getCategoryText(template.category)}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {selectedTemplate && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Информация о шаблоне</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Описание:</span> {selectedTemplate.description}</p>
                          <p><span className="font-medium">Цель:</span> {getTargetTypeText(selectedTemplate.target_type)}</p>
                          <p><span className="font-medium">Адаптер:</span> {selectedTemplate.defaults.adapter}</p>
                          <p><span className="font-medium">Endpoint:</span> {selectedTemplate.defaults.endpoint}</p>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={createForm.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название команды</FormLabel>
                          <FormControl>
                            <Input placeholder="Например: Перезагрузить резервуар №1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="trading_point_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Торговая точка (опционально)</FormLabel>
                          <FormControl>
                            <Input placeholder="point1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom parameters section */}
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium text-sm">Настройка параметров (опционально)</h4>
                      
                      <FormField
                        control={createForm.control}
                        name="custom_endpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Свой Endpoint</FormLabel>
                            <FormControl>
                              <Input placeholder="Переопределить endpoint из шаблона" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="custom_timeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Таймаут (мс)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="30000" 
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="custom_json_template"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>JSON шаблон</FormLabel>
                            <FormControl>
                              <Input placeholder='{"action": "custom"}' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">
                      Создать команду
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск команд..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="inactive">Неактивные</SelectItem>
              <SelectItem value="archived">Архивированные</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="system">Система</SelectItem>
              <SelectItem value="control">Управление</SelectItem>
              <SelectItem value="diagnostic">Диагностика</SelectItem>
              <SelectItem value="maintenance">Обслуживание</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Commands List */}
        {filteredCommands.length === 0 ? (
          <EmptyState
            title="Команды не найдены"
            description="Нет команд, соответствующих выбранным фильтрам."
            action={
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать первую команду
                  </Button>
                </DialogTrigger>
              </Dialog>
            }
          />
        ) : (
          <div className="grid gap-4">
            {filteredCommands.map((command) => (
              <Card key={command.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{command.display_name}</CardTitle>
                        <Badge variant={getStatusBadgeVariant(command.status)}>
                          {getStatusText(command.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryText(command.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {command.name} • {getTargetTypeText(command.target_type)}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {command.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => executeCommand(command.id)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Выполнить
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(
                          command.id, 
                          command.status === 'active' ? 'deactivate' : 'activate'
                        )}
                      >
                        {command.status === 'active' ? 'Деактивировать' : 'Активировать'}
                      </Button>
                      
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Endpoint:</span>
                      <p className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                        {command.endpoint}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Адаптер:</span>
                      <p>{command.adapter}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Таймаут:</span>
                      <p>{command.timeout ? `${command.timeout}ms` : 'Не задан'}</p>
                    </div>
                  </div>
                  
                  {command.created_from_template && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Создано из шаблона: {commandTemplates.find(t => t.id === command.created_from_template)?.display_name || command.created_from_template}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}