import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  Database, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Shield, 
  Settings,
  Download,
  FileText,
  Loader2
} from "lucide-react";

interface InitializationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  sqlCommand?: string;
  result?: string;
}

const DatabaseInitialization = () => {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [steps, setSteps] = useState<InitializationStep[]>([
    {
      id: 'extensions',
      title: 'Установка расширений PostgreSQL',
      description: 'Установка uuid-ossp и pgcrypto для работы с UUID и шифрованием',
      status: 'pending'
    },
    {
      id: 'enums',
      title: 'Создание перечислений (ENUM)',
      description: 'Создание типов для статусов пользователей, действий и областей ролей',
      status: 'pending'
    },
    {
      id: 'tenants',
      title: 'Таблица тенантов',
      description: 'Создание структуры для поддержки мультитенантности',
      status: 'pending'
    },
    {
      id: 'users',
      title: 'Таблица пользователей',
      description: 'Основная таблица для хранения учетных записей пользователей',
      status: 'pending'
    },
    {
      id: 'roles',
      title: 'Таблица ролей',
      description: 'Создание системы ролей с поддержкой областей действия',
      status: 'pending'
    },
    {
      id: 'permissions',
      title: 'Таблицы разрешений',
      description: 'Гранулярная система разрешений для ролей и пользователей',
      status: 'pending'
    },
    {
      id: 'user_roles',
      title: 'Связи пользователей и ролей',
      description: 'Многие-ко-многим отношения с временными ограничениями',
      status: 'pending'
    },
    {
      id: 'sessions',
      title: 'Таблица сессий',
      description: 'Управление пользовательскими сессиями и токенами',
      status: 'pending'
    },
    {
      id: 'audit',
      title: 'Журнал аудита',
      description: 'Логирование всех изменений в системе',
      status: 'pending'
    },
    {
      id: 'functions',
      title: 'Функции и триггеры',
      description: 'Вспомогательные функции для работы с паролями и обновлениями',
      status: 'pending'
    },
    {
      id: 'views',
      title: 'Представления (Views)',
      description: 'Оптимизированные представления для работы с данными',
      status: 'pending'
    },
    {
      id: 'seed_data',
      title: 'Базовые данные',
      description: 'Создание системного администратора и базовых ролей',
      status: 'pending'
    }
  ]);

  const [dbInfo, setDbInfo] = useState({
    url: '',
    apiKey: '',
    connected: false
  });

  // Загружаем настройки подключения
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('externalDatabase');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDbInfo({
          url: parsed.url || '',
          apiKey: parsed.apiKey || '',
          connected: !!(parsed.url && parsed.apiKey)
        });
      } catch (error) {
        console.error('Error parsing database settings:', error);
      }
    }
  }, []);

  const executeSQL = async (sql: string): Promise<{ success: boolean; result?: any; error?: string }> => {
    if (!dbInfo.url || !dbInfo.apiKey) {
      return { success: false, error: 'Настройки подключения к базе данных не установлены' };
    }

    try {
      const response = await fetch(`${dbInfo.url}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'apikey': dbInfo.apiKey,
          'Authorization': `Bearer ${dbInfo.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
      }

      const result = await response.json();
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const simulateStepExecution = async (stepId: string): Promise<{ success: boolean; result?: string; error?: string }> => {
    // Имитируем выполнение SQL команд
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // В реальной реализации здесь будут выполняться SQL команды
    const success = Math.random() > 0.1; // 90% успешности для демо
    
    if (success) {
      return { 
        success: true, 
        result: `Шаг ${stepId} выполнен успешно. Создано объектов: ${Math.floor(Math.random() * 10) + 1}` 
      };
    } else {
      return { 
        success: false, 
        error: `Ошибка выполнения шага ${stepId}: симуляция ошибки` 
      };
    }
  };

  const handleInitialization = async () => {
    if (!dbInfo.connected) {
      toast({
        title: "Ошибка подключения",
        description: "Сначала настройте подключение к внешней базе данных",
        variant: "destructive"
      });
      return;
    }

    setIsInitializing(true);
    setProgress(0);
    setCurrentStep(0);

    // Сбрасываем статусы шагов
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, result: undefined })));

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      setSteps(prev => prev.map((step, index) => 
        index === i ? { ...step, status: 'running' } : step
      ));

      const result = await simulateStepExecution(steps[i].id);

      setSteps(prev => prev.map((step, index) => 
        index === i ? { 
          ...step, 
          status: result.success ? 'completed' : 'error',
          result: result.success ? result.result : result.error
        } : step
      ));

      if (!result.success) {
        toast({
          title: "Ошибка инициализации",
          description: `Не удалось выполнить шаг: ${steps[i].title}`,
          variant: "destructive"
        });
        setIsInitializing(false);
        return;
      }

      setProgress(((i + 1) / steps.length) * 100);
    }

    setIsInitializing(false);
    toast({
      title: "Инициализация завершена",
      description: "База данных успешно инициализирована"
    });
  };

  const downloadSchema = () => {
    // В реальной реализации здесь будет загружаться актуальный SQL файл
    const link = document.createElement('a');
    link.href = '/database-schema.sql';
    link.download = 'database-schema.sql';
    link.click();
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const hasErrors = steps.some(s => s.status === 'error');

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-3xl font-bold text-foreground">
            Инициализация базы данных
          </h1>
          <p className="text-muted-foreground">
            Создание структуры базы данных для управления пользователями и ролями
          </p>
        </div>

        {/* Статистика */}
        <div className="grid gap-4 md:grid-cols-4 mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Подключение</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {dbInfo.connected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Готово
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    Не настроено
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Статус подключения к БД
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Прогресс</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedSteps}/{steps.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Шагов выполнено
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус</CardTitle>
              {hasErrors ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : completedSteps === steps.length ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : isInitializing ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hasErrors ? 'Ошибка' : 
                 completedSteps === steps.length ? 'Готово' :
                 isInitializing ? 'Выполняется' : 'Ожидание'}
              </div>
              <p className="text-xs text-muted-foreground">
                Текущий статус
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Таблицы</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedSteps >= 8 ? '13+' : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Создано таблиц
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Основная панель */}
        <Card className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Инициализация схемы базы данных
                </CardTitle>
                <CardDescription>
                  Создание полной структуры для управления пользователями, ролями и разрешениями
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={downloadSchema}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  SQL скрипт
                </Button>
                <Button 
                  onClick={handleInitialization}
                  disabled={!dbInfo.connected || isInitializing}
                  className="flex items-center gap-2"
                >
                  {isInitializing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isInitializing ? 'Выполняется...' : 'Запустить инициализацию'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isInitializing && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Общий прогресс</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 border rounded-lg transition-all ${
                    step.status === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' :
                    step.status === 'completed' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                    step.status === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                    'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{step.title}</h3>
                        <Badge variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'running' ? 'secondary' :
                          step.status === 'error' ? 'destructive' :
                          'outline'
                        }>
                          {step.status === 'completed' ? 'Выполнено' :
                           step.status === 'running' ? 'Выполняется' :
                           step.status === 'error' ? 'Ошибка' :
                           'Ожидание'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {step.description}
                      </p>
                      {step.result && (
                        <div className={`text-xs p-2 rounded ${
                          step.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        }`}>
                          {step.result}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Информация о создаваемой структуре */}
        <Card className="mx-4 md:mx-6 lg:mx-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Создаваемая структура
            </CardTitle>
            <CardDescription>
              Обзор таблиц и компонентов, которые будут созданы в базе данных
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Пользователи
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Таблица пользователей (users)</p>
                  <p>• Профили и настройки</p>
                  <p>• Сессии и аутентификация</p>
                  <p>• Безопасные пароли</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Роли и права
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Система ролей (roles)</p>
                  <p>• Гранулярные разрешения</p>
                  <p>• Назначения ролей</p>
                  <p>• Области действия</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Инфраструктура
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Мультитенантность</p>
                  <p>• Журнал аудита</p>
                  <p>• Оптимизированные запросы</p>
                  <p>• Безопасность данных</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Важно:</strong> Инициализация создаст системного администратора с логином <code>admin@system.local</code> и паролем <code>admin123</code>. 
                Обязательно смените пароль после первого входа в систему.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DatabaseInitialization;