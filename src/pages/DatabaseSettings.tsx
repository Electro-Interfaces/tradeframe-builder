import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Plus, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  Trash2,
  Edit,
  Download,
  Upload,
  RotateCcw,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { apiConfigServiceDB, DatabaseConnection } from '@/services/apiConfigServiceDB';
import { SystemTelegramSettings } from '@/components/admin/SystemTelegramSettings';
import { TradingNetworkSettings } from '@/components/settings/TradingNetworkSettings';

export default function DatabaseSettings() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [currentConnectionId, setCurrentConnectionId] = useState<string>('');
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Форма для нового подключения
  const [newConnection, setNewConnection] = useState({
    name: '',
    url: '',
    type: 'postgresql' as const,
    description: '',
    timeout: 5000,
    retryAttempts: 3,
    poolSize: 10,
    ssl: false,
    authType: 'none' as const,
    username: '',
    password: '',
    apiKey: ''
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const config = await apiConfigServiceDB.getCurrentConfig();
      if (config) {
        setConnections(config.availableConnections);
        setCurrentConnectionId(config.currentConnectionId);
      }
    } catch (error) {
      console.error('Ошибка загрузки подключений:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить конфигурацию подключений",
        variant: "destructive"
      });
    }
  };

  const handleSwitchConnection = async (connectionId: string) => {
    setLoading(true);
    try {
      const result = await apiConfigServiceDB.switchConnection(connectionId);
      if (result.success) {
        setCurrentConnectionId(connectionId);
        toast({
          title: "Подключение переключено",
          description: `Активировано: ${result.connection?.name}`,
        });
        
        // Предупреждение о необходимости перезагрузки
        toast({
          title: "Требуется перезагрузка",
          description: "Перезагрузите страницу для применения изменений",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Ошибка переключения",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setTestResults(prev => ({ ...prev, [connectionId]: { testing: true } }));
    
    try {
      const result = await apiConfigServiceDB.testConnection(connectionId);
      setTestResults(prev => ({ ...prev, [connectionId]: result }));
      
      toast({
        title: result.success ? "Подключение успешно" : "Ошибка подключения",
        description: result.success 
          ? `Время ответа: ${result.responseTime}мс` 
          : result.error,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [connectionId]: { success: false, error: error.message } 
      }));
    }
  };

  const handleTestAllConnections = async () => {
    setIsTestingAll(true);
    setTestResults({});
    
    try {
      const results = await apiConfigServiceDB.testAllConnections();
      setTestResults(results);
      
      const successful = Object.values(results).filter(r => r.success).length;
      const total = Object.keys(results).length;
      
      toast({
        title: "Тестирование завершено",
        description: `${successful}/${total} подключений доступны`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка тестирования",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  const handleAddConnection = async () => {
    try {
      await apiConfigServiceDB.addConnection({
        name: newConnection.name,
        url: newConnection.url,
        type: newConnection.type,
        description: newConnection.description,
        isActive: false,
        isDefault: false,
        settings: {
          timeout: newConnection.timeout,
          retryAttempts: newConnection.retryAttempts,
          poolSize: newConnection.poolSize,
          ssl: newConnection.ssl,
          authType: newConnection.authType,
          username: newConnection.username,
          password: newConnection.password,
          apiKey: newConnection.apiKey
        }
      });

      loadConnections();
      setIsAddDialogOpen(false);
      setNewConnection({
        name: '',
        url: '',
        type: 'postgresql',
        description: '',
        timeout: 5000,
        retryAttempts: 3,
        poolSize: 10,
        ssl: false,
        authType: 'none',
        username: '',
        password: '',
        apiKey: ''
      });

      toast({
        title: "Подключение добавлено",
        description: `${newConnection.name} успешно создано`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка создания",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteConnection = async () => {
    if (!deleteConnectionId) return;
    
    try {
      await apiConfigServiceDB.deleteConnection(deleteConnectionId);
      loadConnections();
      setDeleteConnectionId(null);
      
      toast({
        title: "Подключение удалено",
        description: "Подключение успешно удалено",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getConnectionStatusIcon = (connectionId: string) => {
    const result = testResults[connectionId];
    
    if (result?.testing) {
      return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    
    if (result?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (result?.success === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'mock': return 'bg-gray-500';
      case 'postgresql': return 'bg-blue-500';
      case 'mysql': return 'bg-orange-500';
      case 'sqlite': return 'bg-green-500';
      case 'supabase': return 'bg-emerald-500';
      case 'external-api': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const [stats, setStats] = useState<any>({
    currentConnection: 'Загрузка...',
    connectionType: 'Загрузка...',
    mockMode: false,
    totalConnections: 0,
    lastUpdated: new Date().toISOString(),
    debugMode: false
  });

  // Загружаем статистику
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await apiConfigServiceDB.getUsageStats();
        setStats(statsData);
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
      }
    };
    loadStats();
  }, [connections, currentConnectionId]);

  return (
    <MainLayout fullWidth={true}>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="px-4 md:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-semibold text-white">
            Обмен данными
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Настройка подключений к внешним системам и управление обменом данными
          </p>
        </div>

        {/* Статистика */}
        <div className="grid gap-4 md:grid-cols-4 px-4 md:px-6 lg:px-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Активное подключение</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.currentConnection}</div>
              <p className="text-xs text-muted-foreground">
                Тип: {stats.connectionType}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Режим работы</CardTitle>
              {stats.mockMode ? <WifiOff className="h-4 w-4 text-yellow-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.mockMode ? 'MOCK' : 'DATABASE'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.mockMode ? 'Демо данные' : 'Реальная БД'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Всего подключений</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalConnections}</div>
              <p className="text-xs text-muted-foreground">
                Настроенных подключений
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Последнее обновление</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-white">
                {new Date(stats.lastUpdated).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.lastUpdated).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Панель управления */}
        <Card className="mx-4 md:mx-6 lg:mx-8 bg-slate-800 border-slate-700 rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Подключения к базам данных</CardTitle>
                <CardDescription>
                  Управляйте подключениями и переключайтесь между разными источниками данных
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestAllConnections} 
                  variant="outline"
                  disabled={isTestingAll}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingAll ? 'Тестирую...' : 'Тест всех'}
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить подключение
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Новое подключение к БД</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Название *</Label>
                          <Input
                            id="name"
                            value={newConnection.name}
                            onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Моя БД"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Тип БД *</Label>
                          <Select 
                            value={newConnection.type} 
                            onValueChange={(value: any) => setNewConnection(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="postgresql">PostgreSQL</SelectItem>
                              <SelectItem value="mysql">MySQL</SelectItem>
                              <SelectItem value="sqlite">SQLite</SelectItem>
                              <SelectItem value="supabase">Supabase</SelectItem>
                              <SelectItem value="external-api">External API</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="url">URL подключения *</Label>
                        <Input
                          id="url"
                          value={newConnection.url}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="http://localhost:5432/api/v1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Описание</Label>
                        <Textarea
                          id="description"
                          value={newConnection.description}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Описание подключения..."
                        />
                      </div>

                      <Separator />
                      
                      {/* Настройки аутентификации для External API */}
                      {newConnection.type === 'external-api' && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Настройки аутентификации</h4>
                          
                          <div className="space-y-2">
                            <Label htmlFor="authType">Тип аутентификации</Label>
                            <Select 
                              value={newConnection.authType} 
                              onValueChange={(value: any) => setNewConnection(prev => ({ ...prev, authType: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Без аутентификации</SelectItem>
                                <SelectItem value="basic">Basic Auth</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {newConnection.authType === 'basic' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="username">Логин</Label>
                                <Input
                                  id="username"
                                  value={newConnection.username}
                                  onChange={(e) => setNewConnection(prev => ({ ...prev, username: e.target.value }))}
                                  placeholder="UserApi"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="password">Пароль</Label>
                                <Input
                                  id="password"
                                  type="password"
                                  value={newConnection.password}
                                  onChange={(e) => setNewConnection(prev => ({ ...prev, password: e.target.value }))}
                                  placeholder="••••••••"
                                />
                              </div>
                            </div>
                          )}

                          {newConnection.authType === 'bearer' && (
                            <div className="space-y-2">
                              <Label htmlFor="apiKey">API Ключ / Token</Label>
                              <Textarea
                                id="apiKey"
                                value={newConnection.apiKey}
                                onChange={(e) => setNewConnection(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="Введите API ключ или Bearer токен"
                              />
                            </div>
                          )}
                          
                          <Separator />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="timeout">Timeout (мс)</Label>
                          <Input
                            id="timeout"
                            type="number"
                            value={newConnection.timeout}
                            onChange={(e) => setNewConnection(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="retryAttempts">Попытки</Label>
                          <Input
                            id="retryAttempts"
                            type="number"
                            value={newConnection.retryAttempts}
                            onChange={(e) => setNewConnection(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="poolSize">Размер пула</Label>
                          <Input
                            id="poolSize"
                            type="number"
                            value={newConnection.poolSize}
                            onChange={(e) => setNewConnection(prev => ({ ...prev, poolSize: parseInt(e.target.value) }))}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ssl"
                          checked={newConnection.ssl}
                          onCheckedChange={(checked) => setNewConnection(prev => ({ ...prev, ssl: checked }))}
                        />
                        <Label htmlFor="ssl">Использовать SSL</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button onClick={handleAddConnection}>
                        Создать подключение
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className={`p-4 border rounded-lg transition-all bg-slate-700/50 border-slate-600 hover:bg-slate-700 ${
                    connection.id === currentConnectionId 
                      ? 'ring-2 ring-blue-500' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        {getConnectionStatusIcon(connection.id)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white">{connection.name}</h3>
                            <Badge className={`text-xs text-white ${getConnectionTypeColor(connection.type)}`}>
                              {connection.type.toUpperCase()}
                            </Badge>
                            {connection.id === currentConnectionId && (
                              <Badge className="text-xs bg-green-600 text-white">
                                АКТИВНО
                              </Badge>
                            )}
                            {connection.isDefault && (
                              <Badge variant="outline" className="text-xs border-gray-400 text-gray-300">
                                СИСТЕМНОЕ
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {connection.description || connection.url}
                          </p>
                          {testResults[connection.id] && (
                            <p className="text-xs text-gray-500 mt-1">
                              {testResults[connection.id].success 
                                ? `Время ответа: ${testResults[connection.id].responseTime}мс`
                                : `Ошибка: ${testResults[connection.id].error}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(connection.id)}
                        disabled={testResults[connection.id]?.testing}
                        className="hover:bg-slate-600 text-gray-300 hover:text-white"
                        title="Тестировать подключение"
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      
                      {/* Кнопки редактирования и удаления для всех подключений кроме системных без возможности удаления */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingConnection(connection)}
                        className="hover:bg-slate-600 text-gray-300 hover:text-white"
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {!connection.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConnectionId(connection.id)}
                          className="hover:bg-red-500/20 text-red-400 hover:text-red-300"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Дополнительные настройки */}
        <Card className="mx-4 md:mx-6 lg:mx-8 bg-slate-800 border-slate-700 rounded-lg">
          <CardHeader>
            <CardTitle className="text-white">Дополнительные настройки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Режим отладки API</h4>
                  <p className="text-sm text-muted-foreground">
                    Включает подробное логирование API запросов
                  </p>
                </div>
                <Switch
                  checked={stats.debugMode}
                  onCheckedChange={async (checked) => {
                    await apiConfigServiceDB.setDebugMode(checked);
                    setStats(prev => ({ ...prev, debugMode: checked }));
                  }}
                />
              </div>
              
              <Separator />
              
              {/* Telegram интеграция */}
              <SystemTelegramSettings />
              
              <Separator />
              
              {/* Настройки торговой сети */}
              <TradingNetworkSettings />
              
              <Separator />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={async () => {
                  try {
                    const config = await apiConfigServiceDB.exportConfig();
                    const blob = new Blob([config], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'database-config.json';
                    a.click();
                    toast({ title: "Конфигурация экспортирована" });
                  } catch (error: any) {
                    toast({
                      title: "Ошибка экспорта",
                      description: error.message,
                      variant: "destructive"
                    });
                  }
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт конфигурации
                </Button>
                
                <Button variant="outline" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (e: any) => {
                        try {
                          const success = await apiConfigServiceDB.importConfig(e.target.result);
                          if (success) {
                            await loadConnections();
                            toast({ title: "Конфигурация импортирована" });
                          } else {
                            toast({ title: "Ошибка импорта", variant: "destructive" });
                          }
                        } catch (error: any) {
                          toast({
                            title: "Ошибка импорта",
                            description: error.message,
                            variant: "destructive"
                          });
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Импорт конфигурации
                </Button>
                
                <Button variant="outline" onClick={async () => {
                  if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
                    try {
                      await apiConfigServiceDB.resetToDefault();
                      await loadConnections();
                      toast({ title: "Настройки сброшены" });
                    } catch (error: any) {
                      toast({
                        title: "Ошибка сброса",
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                  }
                }}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Сбросить настройки
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Диалог редактирования подключения */}
        <Dialog open={!!editingConnection} onOpenChange={() => setEditingConnection(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактирование подключения</DialogTitle>
            </DialogHeader>
            {editingConnection && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Название</Label>
                  <Input
                    id="edit-name"
                    value={editingConnection.name}
                    onChange={(e) => setEditingConnection({
                      ...editingConnection,
                      name: e.target.value
                    })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-url">URL</Label>
                  <Input
                    id="edit-url"
                    value={editingConnection.url}
                    onChange={(e) => setEditingConnection({
                      ...editingConnection,
                      url: e.target.value
                    })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Описание</Label>
                  <Textarea
                    id="edit-description"
                    value={editingConnection.description || ''}
                    onChange={(e) => setEditingConnection({
                      ...editingConnection,
                      description: e.target.value
                    })}
                  />
                </div>
                
                {editingConnection.type === 'supabase' && (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-apikey">API Key</Label>
                    <Textarea
                      id="edit-apikey"
                      value={editingConnection.settings?.apiKey || ''}
                      onChange={(e) => setEditingConnection({
                        ...editingConnection,
                        settings: {
                          ...editingConnection.settings,
                          apiKey: e.target.value
                        }
                      })}
                      placeholder="Введите API ключ Supabase"
                    />
                  </div>
                )}
                
                {editingConnection.type === 'external-api' && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-authType">Тип аутентификации</Label>
                      <Select 
                        value={editingConnection.settings?.authType || 'none'} 
                        onValueChange={(value: any) => setEditingConnection({
                          ...editingConnection,
                          settings: {
                            ...editingConnection.settings,
                            authType: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Без аутентификации</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editingConnection.settings?.authType === 'basic' && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-username">Логин</Label>
                          <Input
                            id="edit-username"
                            value={editingConnection.settings?.username || ''}
                            onChange={(e) => setEditingConnection({
                              ...editingConnection,
                              settings: {
                                ...editingConnection.settings,
                                username: e.target.value
                              }
                            })}
                            placeholder="UserApi"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-password">Пароль</Label>
                          <Input
                            id="edit-password"
                            type="password"
                            value={editingConnection.settings?.password || ''}
                            onChange={(e) => setEditingConnection({
                              ...editingConnection,
                              settings: {
                                ...editingConnection.settings,
                                password: e.target.value
                              }
                            })}
                            placeholder="••••••••"
                          />
                        </div>
                      </>
                    )}

                    {editingConnection.settings?.authType === 'bearer' && (
                      <div className="grid gap-2">
                        <Label htmlFor="edit-apikey-bearer">API Ключ / Token</Label>
                        <Textarea
                          id="edit-apikey-bearer"
                          value={editingConnection.settings?.apiKey || ''}
                          onChange={(e) => setEditingConnection({
                            ...editingConnection,
                            settings: {
                              ...editingConnection.settings,
                              apiKey: e.target.value
                            }
                          })}
                          placeholder="Введите API ключ или Bearer токен"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingConnection(null)}>
                    Отмена
                  </Button>
                  <Button onClick={async () => {
                    try {
                      await apiConfigServiceDB.updateConnection(editingConnection.id, {
                        name: editingConnection.name,
                        url: editingConnection.url,
                        description: editingConnection.description,
                        settings: editingConnection.settings
                      });
                      setEditingConnection(null);
                      await loadConnections();
                      toast({ title: "Подключение обновлено" });
                    } catch (error: any) {
                      toast({
                        title: "Ошибка обновления",
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                  }}>
                    Сохранить
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Диалог подтверждения удаления */}
        <AlertDialog open={!!deleteConnectionId} onOpenChange={() => setDeleteConnectionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить подключение?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Подключение будет удалено навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConnection}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}