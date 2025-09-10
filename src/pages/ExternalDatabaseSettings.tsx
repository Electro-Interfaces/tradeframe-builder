import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { Database, Save, TestTube, Eye, EyeOff, CheckCircle, XCircle, Clock, AlertTriangle, RotateCcw } from "lucide-react";

const ExternalDatabaseSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    url: "",
    apiKey: ""
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Загружаем настройки из localStorage при монтировании
  useEffect(() => {
    const savedSettings = localStorage.getItem('externalDatabase');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error parsing saved database settings:', error);
      }
    } else {
      // Устанавливаем и сохраняем значения по умолчанию
      const defaultSettings = {
        url: "https://ssvazdgnmatbdynkhkqo.supabase.co",
        apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0"
      };
      setSettings(defaultSettings);
      // Автоматически сохраняем в localStorage
      localStorage.setItem('externalDatabase', JSON.stringify(defaultSettings));
      // Уведомляем другие компоненты об изменении localStorage
      window.dispatchEvent(new CustomEvent('localStorageChanged'));
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem('externalDatabase', JSON.stringify(settings));
      // Уведомляем другие компоненты об изменении localStorage
      window.dispatchEvent(new CustomEvent('localStorageChanged'));
      toast({
        title: "Настройки сохранены",
        description: "Настройки подключения к внешней базе данных успешно сохранены"
      });
    } catch (error) {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки",
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async () => {
    if (!settings.url || !settings.apiKey) {
      toast({
        title: "Неполные данные",
        description: "Заполните все поля для тестирования подключения",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Простая проверка подключения
      const response = await fetch(`${settings.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': settings.apiKey,
          'Authorization': `Bearer ${settings.apiKey}`
        }
      });

      if (response.ok) {
        toast({
          title: "Подключение успешно",
          description: "Соединение с внешней базой данных установлено"
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Ошибка подключения",
        description: `Не удалось подключиться к базе данных: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRestoreDefaults = () => {
    const defaultSettings = {
      url: "https://ssvazdgnmatbdynkhkqo.supabase.co",
      apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0"
    };
    setSettings(defaultSettings);
    localStorage.setItem('externalDatabase', JSON.stringify(defaultSettings));
    // Уведомляем другие компоненты об изменении localStorage
    window.dispatchEvent(new CustomEvent('localStorageChanged'));
    toast({
      title: "Настройки восстановлены",
      description: "Восстановлены настройки по умолчанию"
    });
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-3xl font-bold text-foreground">
            Настройки внешней базы данных
          </h1>
          <p className="text-muted-foreground">
            Управление подключением к внешней базе данных Supabase
          </p>
        </div>

        {/* Статистика */}
        <div className="grid gap-4 md:grid-cols-3 mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус подключения</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {settings.url && settings.apiKey ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Настроено
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Не настроено
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Supabase подключение
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">URL базы данных</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">
                {settings.url || 'Не указан'}
              </div>
              <p className="text-xs text-muted-foreground">
                Адрес Supabase проекта
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API ключ</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {settings.apiKey ? 'Настроен' : 'Не настроен'}
              </div>
              <p className="text-xs text-muted-foreground">
                Service Role Key
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Основная панель настроек */}
        <Card className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Подключение к Supabase
                </CardTitle>
                <CardDescription>
                  Настройка подключения к внешней базе данных Supabase с использованием Service Role ключа
                </CardDescription>
              </div>
              <Badge variant={settings.url && settings.apiKey ? "default" : "secondary"}>
                {settings.url && settings.apiKey ? "Активно" : "Не настроено"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="database-url">URL базы данных</Label>
            <Input
              id="database-url"
              type="url"
              value={settings.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API ключ (Service Role)</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Separator />
          
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Сохранить настройки
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isConnecting || !settings.url || !settings.apiKey}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {isConnecting ? "Подключение..." : "Тестировать подключение"}
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleRestoreDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Восстановить по умолчанию
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Информация и безопасность */}
        <Card className="mx-4 md:mx-6 lg:mx-8">
          <CardHeader>
            <CardTitle>Информация о подключении</CardTitle>
            <CardDescription>
              Важная информация о настройке и использовании внешнего подключения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong>Service Role Key:</strong> Используется для полного доступа к базе данных Supabase
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Database className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong>Локальное хранение:</strong> Настройки сохраняются в браузере и не передаются на сервер
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong>Безопасность:</strong> Service Role Key предоставляет полные права администратора
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong>Применение изменений:</strong> Перезагрузите страницу после изменения настроек
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Примечание:</strong> Эти настройки используются для интеграции с внешней базой данных. 
                  Убедитесь, что URL и API ключ корректны перед сохранением.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ExternalDatabaseSettings;