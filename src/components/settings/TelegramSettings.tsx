import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Send, Settings, CheckCircle, XCircle, Info, Copy, Bot } from "lucide-react";
import { getUserSettings, saveUserSettings, UserSettings } from "@/config/userSettings";
import { getSystemConfig, isGlobalTelegramConfigured } from "@/config/system";
import { telegramService } from "@/services/telegramService";

export const TelegramSettings: React.FC = () => {
  const [userSettings, setUserSettings] = useState<UserSettings>(getUserSettings());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);

  const systemConfig = getSystemConfig();
  const isGlobalBotConfigured = isGlobalTelegramConfigured();

  // Загрузка сохраненных настроек
  useEffect(() => {
    const settings = getUserSettings();
    setUserSettings(settings);
  }, []);

  // Сохранение настроек пользователя
  const handleSave = async () => {
    if (!isGlobalBotConfigured) {
      setTestResult({ success: false, message: 'Глобальный бот не настроен администратором' });
      return;
    }

    if (userSettings.telegram.enabled && !userSettings.telegram.chatId.trim()) {
      setTestResult({ success: false, message: 'Введите ваш Chat ID' });
      return;
    }

    saveUserSettings(userSettings);
    setTestResult({ success: true, message: 'Настройки сохранены' });
    
    // Попробуем получить информацию о боте
    if (isGlobalBotConfigured) {
      try {
        const info = await telegramService.getBotInfo();
        setBotInfo(info);
      } catch (error) {
        console.log('Не удалось получить информацию о боте');
      }
    }
  };

  // Тестирование соединения
  const handleTest = async () => {
    if (!isGlobalBotConfigured) {
      setTestResult({ success: false, message: 'Глобальный бот не настроен' });
      return;
    }

    if (!userSettings.telegram.enabled || !userSettings.telegram.chatId.trim()) {
      setTestResult({ success: false, message: 'Сначала включите Telegram и введите Chat ID' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Тестируем отправку сообщения в чат пользователя
      await telegramService.sendMessage(
        '🤖 <b>Тест соединения TradeFrame</b>\n\nВаш Telegram успешно настроен!\nТеперь вы будете получать отчеты и файлы.',
        userSettings.telegram.chatId
      );
      
      setTestResult({ success: true, message: 'Тест прошел успешно! Проверьте Telegram.' });
      
      // Получаем информацию о боте
      const info = await telegramService.getBotInfo();
      setBotInfo(info);

    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Ошибка: ${error.message || 'Неизвестная ошибка'}` 
      });
    } finally {
      setTesting(false);
    }
  };

  // Получение chat_id (помощь пользователю)
  const handleGetChatId = async () => {
    if (!isGlobalBotConfigured) {
      setTestResult({ success: false, message: 'Глобальный бот не настроен администратором' });
      return;
    }

    try {
      const updatesData = await telegramService.getUpdates();
      setUpdates(updatesData);
      
      if (updatesData.length === 0) {
        setTestResult({ 
          success: false, 
          message: 'Обновлений не найдено. Напишите боту любое сообщение и повторите попытку.' 
        });
      } else {
        setTestResult({ 
          success: true, 
          message: `Найдено ${updatesData.length} обновлений. Выберите ваш chat_id из списка ниже.` 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Ошибка получения chat_id: ${error.message}` 
      });
    }
  };

  // Очистка настроек пользователя
  const handleClear = () => {
    const clearedSettings = {
      ...userSettings,
      telegram: {
        enabled: false,
        chatId: '',
        sendReports: true
      }
    };
    setUserSettings(clearedSettings);
    saveUserSettings(clearedSettings);
    setBotInfo(null);
    setTestResult(null);
    setUpdates([]);
  };

  // Копирование chat_id
  const copyChatId = (chatId: string) => {
    navigator.clipboard.writeText(chatId);
    setUserSettings(prev => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        chatId
      }
    }));
    setTestResult({ success: true, message: `Chat ID ${chatId} скопирован` });
  };

  const isUserTelegramConfigured = userSettings.telegram.enabled && !!userSettings.telegram.chatId;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Send className="w-5 h-5" />
          Уведомления Telegram
          {isUserTelegramConfigured && <Badge className="bg-green-600">Включен</Badge>}
          {!isGlobalBotConfigured && <Badge variant="destructive">Бот не настроен</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Информация о боте */}
        {botInfo && isGlobalBotConfigured && (
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertDescription>
              <strong>Корпоративный бот:</strong> @{botInfo.username} ({botInfo.first_name})
            </AlertDescription>
          </Alert>
        )}

        {/* Статус глобального бота */}
        {!isGlobalBotConfigured && (
          <Alert className="border-yellow-600">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-200">
              <strong>Telegram бот не настроен администратором.</strong><br />
              Обратитесь к администратору для настройки корпоративного бота.
            </AlertDescription>
          </Alert>
        )}

        {/* Инструкция для пользователя */}
        {isGlobalBotConfigured && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Настройка уведомлений:</strong><br />
              1. Найдите бота @{botInfo?.username || 'трекфрейм_бот'} в Telegram<br />
              2. Напишите боту любое сообщение<br />
              3. Используйте кнопку "Получить Chat ID"<br />
              4. Включите уведомления переключателем
            </AlertDescription>
          </Alert>
        )}

        {/* Пользовательские настройки */}
        <div className="space-y-4">
          {/* Включение/выключение Telegram */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300 text-base font-medium">Получать уведомления в Telegram</Label>
              <p className="text-sm text-slate-400">Включите для получения отчетов и файлов в Telegram</p>
            </div>
            <Switch
              checked={userSettings.telegram.enabled}
              onCheckedChange={(enabled) => 
                setUserSettings(prev => ({
                  ...prev,
                  telegram: { ...prev.telegram, enabled }
                }))
              }
              disabled={!isGlobalBotConfigured}
            />
          </div>

          {/* Chat ID - показываем только если Telegram включен */}
          {userSettings.telegram.enabled && (
            <div>
              <Label className="text-slate-300">Ваш Chat ID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="123456789 или -123456789"
                  value={userSettings.telegram.chatId}
                  onChange={(e) => setUserSettings(prev => ({
                    ...prev,
                    telegram: { ...prev.telegram, chatId: e.target.value }
                  }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button 
                  variant="outline" 
                  onClick={handleGetChatId}
                  disabled={!isGlobalBotConfigured}
                >
                  Получить Chat ID
                </Button>
              </div>
            </div>
          )}

          {/* Дополнительные настройки */}
          {userSettings.telegram.enabled && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300">Отправлять отчеты автоматически</Label>
                <p className="text-sm text-slate-400">Получать файлы экспорта в Telegram</p>
              </div>
              <Switch
                checked={userSettings.telegram.sendReports}
                onCheckedChange={(sendReports) => 
                  setUserSettings(prev => ({
                    ...prev,
                    telegram: { ...prev.telegram, sendReports }
                  }))
                }
              />
            </div>
          )}
        </div>

        {/* Доступные chat_id */}
        {updates.length > 0 && (
          <div>
            <Label className="text-slate-300">Доступные Chat ID:</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {updates.slice(-10).map((update, index) => {
                const chat = update.message?.chat || update.channel_post?.chat;
                if (!chat) return null;

                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-700 rounded border border-slate-600"
                  >
                    <div className="text-sm">
                      <div className="text-white font-mono">{chat.id}</div>
                      <div className="text-slate-400">
                        {chat.type} • {chat.title || chat.first_name || 'Без названия'}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyChatId(chat.id.toString())}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSave}
            disabled={!isGlobalBotConfigured || (userSettings.telegram.enabled && !userSettings.telegram.chatId.trim())}
          >
            <Settings className="w-4 h-4 mr-2" />
            Сохранить настройки
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={!isGlobalBotConfigured || !isUserTelegramConfigured || testing}
          >
            {testing ? (
              <>Тестирую...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Тест соединения
              </>
            )}
          </Button>
          
          {userSettings.telegram.enabled && (
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