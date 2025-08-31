import React, { useState, useMemo } from 'react';
import { Plus, Edit, Copy, Trash2, Play, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';

// Types and schemas
const commandSchema = z.object({
  name: z.string().min(1, 'Название команды обязательно'),
  code: z.string().min(1, 'Код команды обязателен').regex(/^[A-Z_]+$/, 'Код должен содержать только заглавные буквы и подчеркивания'),
  description: z.string().optional(),
  targetType: z.enum(['trading_point', 'equipment', 'component']),
  isActive: z.boolean(),
  adapter: z.enum(['http', 'broker']),
  endpoint: z.string().min(1, 'Endpoint/Topic обязателен'),
  httpMethod: z.enum(['GET', 'POST', 'PUT']).optional(),
  httpHeaders: z.string().optional(),
  timeout: z.number().optional(),
  jsonSchema: z.string().optional(),
  jsonTemplate: z.string().optional(),
});

type Command = z.infer<typeof commandSchema> & {
  id: string;
  createdAt: string;
};

// Mock data
const mockCommands: Command[] = [
  {
    id: '1',
    name: 'Перезагрузить устройство',
    code: 'REBOOT_DEVICE',
    description: 'Команда для перезагрузки оборудования',
    targetType: 'equipment',
    isActive: true,
    adapter: 'http',
    endpoint: '{{target.external_api_url}}/reboot',
    httpMethod: 'POST',
    httpHeaders: '{"Authorization": "Bearer {{secrets.api_key}}"}',
    timeout: 5000,
    jsonSchema: '{"type": "object", "properties": {"force": {"type": "boolean"}}, "required": []}',
    jsonTemplate: '{"device": "{{target.external_id}}", "force": {{params.force}}}',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Установить цену топлива',
    code: 'SET_FUEL_PRICE',
    description: 'Команда для изменения цены топлива на ТРК',
    targetType: 'equipment',
    isActive: true,
    adapter: 'broker',
    endpoint: 'commands.fuel.price',
    timeout: 3000,
    jsonSchema: '{"type": "object", "properties": {"price": {"type": "number"}, "fuel_type": {"type": "string"}}, "required": ["price", "fuel_type"]}',
    jsonTemplate: '{"device": "{{target.external_id}}", "price": {{params.price}}, "fuel_type": "{{params.fuel_type}}"}',
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    name: 'Запуск диагностики',
    code: 'RUN_DIAGNOSTICS',
    description: 'Команда для запуска диагностики системы',
    targetType: 'equipment',
    isActive: false,
    adapter: 'http',
    endpoint: '{{target.external_api_url}}/diagnostics',
    httpMethod: 'POST',
    timeout: 10000,
    jsonSchema: '{"type": "object", "properties": {"deep": {"type": "boolean"}}, "required": []}',
    jsonTemplate: '{"device": "{{target.external_id}}", "deep": {{params.deep}}}',
    createdAt: '2024-01-12',
  },
  {
    id: '4',
    name: 'Обновить конфигурацию',
    code: 'UPDATE_CONFIG',
    description: 'Команда для обновления конфигурации устройства',
    targetType: 'trading_point',
    isActive: true,
    adapter: 'broker',
    endpoint: 'commands.config.update',
    timeout: 5000,
    jsonSchema: '{"type": "object", "properties": {"config": {"type": "object"}}, "required": ["config"]}',
    jsonTemplate: '{"point_id": "{{target.external_id}}", "config": {{params.config}}}',
    createdAt: '2024-01-08',
  },
];

const Commands = () => {
  const [commands, setCommands] = useState<Command[]>(mockCommands);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof commandSchema>>({
    resolver: zodResolver(commandSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      targetType: 'equipment',
      isActive: true,
      adapter: 'http',
      endpoint: '',
      httpMethod: 'POST',
      httpHeaders: '',
      timeout: 5000,
      jsonSchema: '',
      jsonTemplate: '',
    },
  });

  const handleCreateCommand = () => {
    setEditingCommand(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEditCommand = (command: Command) => {
    setEditingCommand(command);
    form.reset(command);
    setIsDialogOpen(true);
  };

  const handleCloneCommand = (command: Command) => {
    setEditingCommand(null);
    form.reset({
      ...command,
      name: `${command.name} (копия)`,
      code: `${command.code}_COPY`,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCommand = (commandId: string) => {
    setCommands(commands.filter(cmd => cmd.id !== commandId));
    toast({
      title: "Команда удалена",
      description: "Шаблон команды успешно удален из системы.",
    });
  };

  const onSubmit = (data: z.infer<typeof commandSchema>) => {
    if (editingCommand) {
      setCommands(commands.map(cmd => 
        cmd.id === editingCommand.id 
          ? { ...cmd, ...data }
          : cmd
      ));
      toast({
        title: "Команда обновлена",
        description: "Шаблон команды успешно обновлен.",
      });
    } else {
      const newCommand: Command = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCommands([...commands, newCommand]);
      toast({
        title: "Команда создана",
        description: "Новый шаблон команды успешно создан.",
      });
    }
    setIsDialogOpen(false);
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'trading_point': return 'Торговая точка';
      case 'equipment': return 'Оборудование';
      case 'component': return 'Компонент';
      default: return type;
    }
  };

  const getAdapterLabel = (adapter: string) => {
    switch (adapter) {
      case 'http': return 'Direct HTTP';
      case 'broker': return 'Broker (Очередь)';
      default: return adapter;
    }
  };

  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    const query = searchQuery.toLowerCase();
    return commands.filter(command => 
      command.name.toLowerCase().includes(query) ||
      command.code.toLowerCase().includes(query) ||
      command.description?.toLowerCase().includes(query) ||
      getTargetTypeLabel(command.targetType).toLowerCase().includes(query)
    );
  }, [commands, searchQuery]);

  return (
    <MainLayout>
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        {/* Заголовок страницы */}
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Команды</h1>
          <p className="text-slate-400 mt-2">Управление шаблонами команд для взаимодействия с оборудованием</p>
        </div>

        {/* Панель команд */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⚡</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Список команд</h2>
                <div className="text-sm text-slate-400">
                  {filteredCommands.length === commands.length 
                    ? `Всего команд: ${commands.length}`
                    : `Найдено: ${filteredCommands.length} из ${commands.length}`
                  }
                </div>
              </div>
              <Button 
                onClick={handleCreateCommand} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
              >
                + Создать команду
              </Button>
            </div>
            
            {/* Поиск команд */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Поиск по названию, коду или описанию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>
          </div>

        {commands.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="Нет команд" 
              description="Создайте первый шаблон команды для начала работы"
              cta={
                <Button 
                  onClick={handleCreateCommand}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Создать команду
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : filteredCommands.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="Ничего не найдено" 
              description="Попробуйте изменить условия поиска"
              className="py-16"
            />
          </div>
        ) : (
          <>
            {/* Десктопная таблица */}
          <div className="hidden md:block w-full">
            <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
              <table className="w-full text-sm min-w-full table-fixed">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '25%'}}>НАЗВАНИЕ КОМАНДЫ</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>КОД</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ОБЛАСТЬ</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>АДАПТЕР</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>СТАТУС</th>
                    <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '20%'}}>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800">
                  {filteredCommands.map((command) => (
                    <tr key={command.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white truncate" title={command.name}>{command.name}</div>
                        {command.description && (
                          <div className="text-sm text-slate-400 mt-1 line-clamp-2" title={command.description}>{command.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-sm font-mono">
                          {command.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {getTargetTypeLabel(command.targetType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {getAdapterLabel(command.adapter)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={command.isActive ? "success" : "secondary"}>
                          {command.isActive ? 'Активна' : 'Неактивна'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1 min-w-fit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCommand(command)}
                            className="h-8 w-8 min-w-[32px] p-0 flex-shrink-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center"
                            title="Редактировать"
                          >
                            <Edit className="h-4 w-4 flex-shrink-0" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloneCommand(command)}
                            className="h-8 w-8 min-w-[32px] p-0 flex-shrink-0 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 flex items-center justify-center"
                            title="Клонировать"
                          >
                            <Copy className="h-4 w-4 flex-shrink-0" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 min-w-[32px] p-0 flex-shrink-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10 flex items-center justify-center"
                            title="Запустить"
                          >
                            <Play className="h-4 w-4 flex-shrink-0" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 min-w-[32px] p-0 flex-shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4 flex-shrink-0" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-slate-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Удалить команду</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Вы уверены, что хотите удалить команду "{command.name}"? 
                                  Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                  Отмена
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteCommand(command.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Мобильные карточки */}
          <div className="md:hidden space-y-3">
            {filteredCommands.map((command) => (
              <div key={command.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-base mb-1">{command.name}</div>
                    {command.description && (
                      <div className="text-sm text-slate-300 mb-2">{command.description}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                      <code className="bg-slate-700 text-slate-300 px-2 py-1 rounded font-mono">
                        {command.code}
                      </code>
                      <span className="text-slate-400">{getTargetTypeLabel(command.targetType)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400">{getAdapterLabel(command.adapter)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={command.isActive ? "success" : "secondary"}>
                        {command.isActive ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCommand(command)}
                      className="h-9 w-9 min-w-[2.25rem] p-0 flex-shrink-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                    >
                      <Edit className="h-4 w-4 flex-shrink-0" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCloneCommand(command)}
                      className="h-9 w-9 min-w-[2.25rem] p-0 flex-shrink-0 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <Copy className="h-4 w-4 flex-shrink-0" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 min-w-[2.25rem] p-0 flex-shrink-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                    >
                      <Play className="h-4 w-4 flex-shrink-0" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 w-9 min-w-[2.25rem] p-0 flex-shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 flex-shrink-0" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] max-w-md bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Удалить команду</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Вы уверены, что хотите удалить команду "{command.name}"? 
                            Это действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            Отмена
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCommand(command.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto md:w-full bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingCommand ? 'Редактировать команду' : 'Создать команду'}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                    <TabsTrigger value="basic">Основное</TabsTrigger>
                    <TabsTrigger value="delivery">Доставка</TabsTrigger>
                    <TabsTrigger value="payload">Полезная нагрузка</TabsTrigger>
                    <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Название команды</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Перезагрузить устройство" 
                              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Код</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="REBOOT_DEVICE" 
                              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 font-mono"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Описание</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Описание команды..."
                              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Область применения</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Выберите область применения" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="trading_point">Торговая точка</SelectItem>
                              <SelectItem value="equipment">Оборудование</SelectItem>
                              <SelectItem value="component">Компонент</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base text-white">Статус</FormLabel>
                            <div className="text-sm text-slate-400">
                              Активные команды доступны для выполнения
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="delivery" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="adapter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Адаптер</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Выберите адаптер" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="http">Direct HTTP</SelectItem>
                              <SelectItem value="broker">Broker (Очередь)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endpoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Endpoint / Topic</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="{{target.external_api_url}}/reboot"
                              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('adapter') === 'http' && (
                      <FormField
                        control={form.control}
                        name="httpMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">HTTP Метод</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Выберите HTTP метод" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="httpHeaders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">HTTP Заголовки (JSON)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"Authorization": "Bearer {{secrets.api_key}}"}'
                              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 font-mono"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Таймаут (мс)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="5000"
                              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="payload" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="jsonSchema"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">JSON Schema (для валидации параметров)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"type": "object", "properties": {"price": {"type": "number"}}, "required": ["price"]}'
                              className="min-h-[150px] font-mono text-sm bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="jsonTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">JSON Template (шаблон)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"device": "{{target.external_id}}", "new_price": {{params.price}}}'
                              className="min-h-[150px] font-mono text-sm bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Форма для ввода параметров</Label>
                        <div className="mt-2 p-4 border border-slate-600 rounded-lg bg-slate-700/50">
                          <p className="text-sm text-slate-400">
                            Динамическая форма будет сгенерирована на основе JSON Schema
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-white">Выбор цели для теста</Label>
                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <Select>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Сеть" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="network1">Лукойл</SelectItem>
                              <SelectItem value="network2">Роснефть</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Точка" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="point1">АЗС-1</SelectItem>
                              <SelectItem value="point2">АЗС-5</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Оборудование" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="eq1">ТРК-1</SelectItem>
                              <SelectItem value="eq2">Касса-1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-white">Предпросмотр Payload</Label>
                        <div className="mt-2">
                          <Textarea 
                            readOnly
                            value={form.watch('jsonTemplate') || ''}
                            className="min-h-[100px] font-mono text-sm bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>

                      <Button type="button" className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <Play className="mr-2 h-4 w-4" />
                        Запустить тест
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-slate-600">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {editingCommand ? 'Обновить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Commands;