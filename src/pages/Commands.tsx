import React, { useState } from 'react';
import { Plus, Edit, Copy, Trash2, Play } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
];

const Commands = () => {
  const [commands, setCommands] = useState<Command[]>(mockCommands);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
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

  return (
    <MainLayout>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Конструктор Команд</h1>
          <Button onClick={handleCreateCommand}>
            <Plus className="mr-2 h-4 w-4" />
            Создать команду
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Шаблоны команд</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название команды</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Область применения</TableHead>
                  <TableHead>Адаптер</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell className="font-medium">{command.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {command.code}
                      </code>
                    </TableCell>
                    <TableCell>{getTargetTypeLabel(command.targetType)}</TableCell>
                    <TableCell>{getAdapterLabel(command.adapter)}</TableCell>
                    <TableCell>
                      <Badge variant={command.isActive ? "default" : "secondary"}>
                        {command.isActive ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCommand(command)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloneCommand(command)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить команду</AlertDialogTitle>
                              <AlertDialogDescription>
                                Вы уверены, что хотите удалить команду "{command.name}"? 
                                Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCommand(command.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCommand ? 'Редактировать команду' : 'Создать команду'}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
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
                          <FormLabel>Название команды</FormLabel>
                          <FormControl>
                            <Input placeholder="Перезагрузить устройство" {...field} />
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
                          <FormLabel>Код</FormLabel>
                          <FormControl>
                            <Input placeholder="REBOOT_DEVICE" {...field} />
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
                          <FormLabel>Описание</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Описание команды..."
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
                          <FormLabel>Область применения</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите область применения" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                            <FormLabel className="text-base">Статус</FormLabel>
                            <div className="text-sm text-muted-foreground">
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
                          <FormLabel>Адаптер</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите адаптер" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                          <FormLabel>Endpoint / Topic</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="{{target.external_api_url}}/reboot"
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
                            <FormLabel>HTTP Метод</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите HTTP метод" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                          <FormLabel>HTTP Заголовки (JSON)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"Authorization": "Bearer {{secrets.api_key}}"}'
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
                          <FormLabel>Таймаут (мс)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="5000"
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
                          <FormLabel>JSON Schema (для валидации параметров)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"type": "object", "properties": {"price": {"type": "number"}}, "required": ["price"]}'
                              className="min-h-[150px] font-mono text-sm"
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
                          <FormLabel>JSON Template (шаблон)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"device": "{{target.external_id}}", "new_price": {{params.price}}}'
                              className="min-h-[150px] font-mono text-sm"
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
                        <Label>Форма для ввода параметров</Label>
                        <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">
                            Динамическая форма будет сгенерирована на основе JSON Schema
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label>Выбор цели для теста</Label>
                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Сеть" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="network1">Лукойл</SelectItem>
                              <SelectItem value="network2">Роснефть</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Точка" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="point1">АЗС-1</SelectItem>
                              <SelectItem value="point2">АЗС-5</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Оборудование" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq1">ТРК-1</SelectItem>
                              <SelectItem value="eq2">Касса-1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Предпросмотр Payload</Label>
                        <div className="mt-2">
                          <Textarea 
                            readOnly
                            value={form.watch('jsonTemplate') || ''}
                            className="min-h-[100px] font-mono text-sm bg-muted"
                          />
                        </div>
                      </div>

                      <Button type="button" className="w-full">
                        <Play className="mr-2 h-4 w-4" />
                        Запустить тест
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">
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