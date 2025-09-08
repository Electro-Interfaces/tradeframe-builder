import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Bot, Settings, CheckCircle, XCircle, Info } from "lucide-react";
import { getSystemConfig, saveSystemConfig, SystemConfig, isGlobalTelegramConfigured } from "@/config/system";
import { telegramService } from "@/services/telegramService";

export const SystemTelegramSettings: React.FC = () => {
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [botInfo, setBotInfo] = useState<any>(null);

  // Загрузка настроек при монтировании
  useEffect(() => {
    const config = getSystemConfig();
    setSystemConfig(config);
    
    // Если бот уже настроен, получаем информацию о нем
    if (isGlobalTelegramConfigured()) {
      loadBotInfo();
    }
  }, []);

  // Загрузка информации о боте
  const loadBotInfo = async () => {
    try {
      const info = await telegramService.getBotInfo();
      setBotInfo(info);
    } catch (error) {
      console.log('Не удалось загрузить информацию о боте');
    }
  };

  // Сохранение настроек
  const handleSave = async () => {
    if (systemConfig.telegram.enabled && !systemConfig.telegram.botToken.trim()) {
      setTestResult({ success: false, message: 'Введите токен бота' });
      return;
    }

    saveSystemConfig(systemConfig);
    setTestResult({ success: true, message: 'Системные настройки сохранены' });
    
    if (systemConfig.telegram.enabled && systemConfig.telegram.botToken) {
      await loadBotInfo();
    }
  };

  // Тестирование бота
  const handleTest = async () => {
    if (!systemConfig.telegram.enabled || !systemConfig.telegram.botToken.trim()) {
      setTestResult({ success: false, message: 'Сначала включите и настройте бота' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Временно сохраняем конфигурацию для теста
      saveSystemConfig(systemConfig);
      
      const info = await telegramService.getBotInfo();
      setBotInfo(info);
      
      setTestResult({ 
        success: true, 
        message: `Бот @${info.username} успешно подключен! Теперь пользователи могут настроить свои уведомления.` 
      });
      
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Ошибка подключения: ${error.message}` 
      });
    } finally {
      setTesting(false);
    }
  };

  // Очистка настроек
  const handleClear = () => {
    const clearedConfig = {
      ...systemConfig,
      telegram: {
        botToken: '',
        enabled: false
      }
    };
    setSystemConfig(clearedConfig);
    saveSystemConfig(clearedConfig);
    setBotInfo(null);
    setTestResult(null);
  };

  const isConfigured = isGlobalTelegramConfigured();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Корпоративный Telegram Bot
          {isConfigured && <Badge className="bg-green-600">Активен</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Информация о боте */}
        {botInfo && (
          <Alert className="border-green-600">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-200">
              <strong>Активный бот:</strong> @{botInfo.username} ({botInfo.first_name})<br />
              Пользователи могут настраивать свои уведомления в профиле.
            </AlertDescription>
          </Alert>
        )}

        {/* Описание */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Корпоративный бот</strong> используется всеми пользователями системы.<br />
            Каждый пользователь указывает свой Chat ID в настройках профиля.
          </AlertDescription>
        </Alert>

        {/* Настройки */}
        <div className="space-y-4">
          {/* Включение/выключение */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300 text-base font-medium">Включить Telegram интеграцию</Label>
              <p className="text-sm text-slate-400">Разрешить пользователям использовать Telegram уведомления</p>
            </div>
            <Switch
              checked={systemConfig.telegram.enabled}
              onCheckedChange={(enabled) => 
                setSystemConfig(prev => ({
                  ...prev,
                  telegram: { ...prev.telegram, enabled }
                }))
              }
            />
          </div>

          {/* Токен бота */}
          {systemConfig.telegram.enabled && (
            <div>
              <Label className="text-slate-300">Токен Telegram бота</Label>
              <Input
                type="password"
                placeholder="123456789:ABCdefGHijklMNopqrsTUvwxyz"
                value={systemConfig.telegram.botToken}
                onChange={(e) => setSystemConfig(prev => ({
                  ...prev,
                  telegram: { ...prev.telegram, botToken: e.target.value }
                }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                Получите токен у @BotFather в Telegram
              </p>
            </div>
          )}
        </div>

        {/* Инструкция */}
        {systemConfig.telegram.enabled && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Настройка корпоративного бота:</strong><br />
              1. Создайте бота через @BotFather<br />
              2. Скопируйте токен и вставьте выше<br />
              3. Нажмите "Сохранить" и "Тест"<br />
              4. Пользователи смогут настроить уведомления в своих профилях
            </AlertDescription>
          </Alert>
        )}

        {/* Кнопки управления */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSave}
            disabled={systemConfig.telegram.enabled && !systemConfig.telegram.botToken.trim()}
          >
            <Settings className="w-4 h-4 mr-2" />
            Сохранить настройки
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={!systemConfig.telegram.enabled || !systemConfig.telegram.botToken.trim() || testing}
          >
            {testing ? (
              <>Тестирую...</>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Тест подключения
              </>
            )}
          </Button>
          
          {systemConfig.telegram.enabled && (
            <Button variant="destructive" onClick={handleClear}>
              Отключить
            </Button>
          )}
        </div>

        {/* Результат теста */}
        {testResult && (
          <Alert className={testResult.success ? "border-green-600" : "border-red-600"}>
            {testResult.success ? 
              <CheckCircle className="h-4 w-4 text-green-600" /> : 
              <XCircle className="h-4 w-4 text-red-600" />
            }
            <AlertDescription className={testResult.success ? "text-green-200" : "text-red-200"}>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};