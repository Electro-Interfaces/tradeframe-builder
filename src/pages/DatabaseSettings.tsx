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
import { apiConfigService, DatabaseConnection } from '@/services/apiConfigService';

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
    ssl: false
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = () => {
    const config = apiConfigService.getCurrentConfig();
    setConnections(config.availableConnections);
    setCurrentConnectionId(config.currentConnectionId);
  };

  const handleSwitchConnection = async (connectionId: string) => {
    setLoading(true);
    try {
      const result = await apiConfigService.switchConnection(connectionId);
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
      const result = await apiConfigService.testConnection(connectionId);
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
      const results = await apiConfigService.testAllConnections();
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
      await apiConfigService.addConnection({
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
          ssl: newConnection.ssl
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
        ssl: false
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
      await apiConfigService.deleteConnection(deleteConnectionId);
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
      default: return 'bg-gray-500';
    }
  };

  const stats = apiConfigService.getUsageStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Заголовок */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Настройки подключения к БД
          </h1>
          <p className="text-muted-foreground">
            Управление подключениями к базам данных и переключение между ними
          </p>
        </div>

        {/* Статистика */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активное подключение</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentConnection}</div>
              <p className="text-xs text-muted-foreground">
                Тип: {stats.connectionType}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Режим работы</CardTitle>
              {stats.mockMode ? <WifiOff className="h-4 w-4 text-yellow-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mockMode ? 'MOCK' : 'DATABASE'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.mockMode ? 'Демо данные' : 'Реальная БД'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего подключений</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConnections}</div>
              <p className="text-xs text-muted-foreground">
                Настроенных подключений
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Последнее обновление</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {new Date(stats.lastUpdated).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.lastUpdated).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Панель управления */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Подключения к базам данных</CardTitle>
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
                  className={`p-4 border rounded-lg transition-all ${
                    connection.id === currentConnectionId 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getConnectionStatusIcon(connection.id)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{connection.name}</h3>
                            <Badge className={`text-xs ${getConnectionTypeColor(connection.type)}`}>
                              {connection.type.toUpperCase()}
                            </Badge>
                            {connection.id === currentConnectionId && (
                              <Badge variant="default" className="text-xs">
                                АКТИВНО
                              </Badge>
                            )}
                            {connection.isDefault && (
                              <Badge variant="outline" className="text-xs">
                                СИСТЕМНОЕ
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {connection.description || connection.url}
                          </p>
                          {testResults[connection.id] && (
                            <p className="text-xs text-muted-foreground">
                              {testResults[connection.id].success 
                                ? `Время ответа: ${testResults[connection.id].responseTime}мс`
                                : `Ошибка: ${testResults[connection.id].error}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(connection.id)}
                        disabled={testResults[connection.id]?.testing}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      
                      {connection.id !== currentConnectionId && (
                        <Button
                          size="sm"
                          onClick={() => handleSwitchConnection(connection.id)}
                          disabled={loading}
                        >
                          Переключиться
                        </Button>
                      )}
                      
                      {!connection.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConnectionId(connection.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
        <Card>
          <CardHeader>
            <CardTitle>Дополнительные настройки</CardTitle>
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
                  onCheckedChange={(checked) => apiConfigService.setDebugMode(checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  const config = apiConfigService.exportConfig();
                  const blob = new Blob([config], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'database-config.json';
                  a.click();
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт конфигурации
                </Button>
                
                <Button variant="outline" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e: any) => {
                        const success = apiConfigService.importConfig(e.target.result);
                        if (success) {
                          loadConnections();
                          toast({ title: "Конфигурация импортирована" });
                        } else {
                          toast({ title: "Ошибка импорта", variant: "destructive" });
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
                
                <Button variant="outline" onClick={() => {
                  if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
                    apiConfigService.resetToDefault();
                    loadConnections();
                    toast({ title: "Настройки сброшены" });
                  }
                }}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Сбросить настройки
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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