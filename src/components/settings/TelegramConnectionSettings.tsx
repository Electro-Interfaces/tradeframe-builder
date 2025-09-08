import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Copy, 
  ExternalLink,
  Clock,
  AlertTriangle,
  Bot,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { telegramVerificationService } from "@/services/telegramVerificationService";
import { getSystemConfig, isGlobalTelegramConfigured } from "@/config/system";

export const TelegramConnectionSettings: React.FC = () => {
  const { user } = useAuth();
  
  // Состояние компонента
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [verifiedAt, setVerifiedAt] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Состояние верификации
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // UI состояние
  const [copied, setCopied] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Конфигурация системы
  const systemConfig = getSystemConfig();
  const telegramConfigured = isGlobalTelegramConfigured();
  const botUsername = systemConfig?.telegram?.botUsername || 'TradeControl_DW_Export_Bot';

  // Загрузка статуса при монтировании компонента
  useEffect(() => {
    if (user?.id) {
      loadVerificationStatus();
    }
  }, [user?.id]);

  // Таймер для обратного отсчета
  useEffect(() => {
    if (verificationCode && expiresAt) {
      const timer = setInterval(() => {
        const remaining = telegramVerificationService.constructor.formatTimeRemaining(expiresAt);
        setTimeRemaining(remaining);
        
        if (remaining === 'Истек') {
          setVerificationCode('');
          setExpiresAt('');
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [verificationCode, expiresAt]);

  // Автоматическое обновление статуса (polling)
  useEffect(() => {
    if (verificationCode && !isConnected) {
      const statusTimer = setInterval(() => {
        loadVerificationStatus();
      }, 3000); // Проверяем каждые 3 секунды

      return () => clearInterval(statusTimer);
    }
  }, [verificationCode, isConnected]);

  /**
   * Загрузка текущего статуса верификации
   */
  const loadVerificationStatus = async () => {
    if (!user?.id) return;

    try {
      const status = await telegramVerificationService.getVerificationStatus(user.id);
      
      setIsConnected(status.isConnected);
      setTelegramChatId(status.telegramChatId || '');
      setVerifiedAt(status.verifiedAt || '');
      setNotificationsEnabled(status.notificationsEnabled);
      
      // Если есть активный код, показываем его
      if (status.hasActiveCode && status.activeCode && !status.isConnected) {
        setVerificationCode(status.activeCode);
        setExpiresAt(status.expiresAt || '');
      } else if (status.isConnected) {
        // Если подключен, очищаем код
        setVerificationCode('');
        setExpiresAt('');
      }

    } catch (error) {
      console.error('Ошибка загрузки статуса:', error);
    }
  };

  /**
   * Генерация нового кода верификации
   */
  const handleGenerateCode = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await telegramVerificationService.generateVerificationCode(user.id);
      
      if (result.success && result.verificationCode) {
        setVerificationCode(result.verificationCode);
        setExpiresAt(result.expiresAt || '');
        setSuccess('Код создан! Скопируйте его и отправьте боту.');
      } else {
        setError(result.error || 'Ошибка создания кода');
      }

    } catch (error: any) {
      setError(error.message || 'Ошибка генерации кода');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Копирование кода в буфер обмена
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Отправка тестового уведомления
   */
  const handleTestNotification = async () => {
    if (!user?.id) return;

    setTestingNotification(true);
    setError('');
    setSuccess('');

    try {
      const result = await telegramVerificationService.sendTestNotification(user.id);
      
      if (result.success) {
        setSuccess('Тестовое уведомление отправлено!');
      } else {
        setError(result.error || 'Ошибка отправки уведомления');
      }

    } catch (error: any) {
      setError(error.message || 'Ошибка отправки уведомления');
    } finally {
      setTestingNotification(false);
    }
  };

  /**
   * Отключение Telegram
   */
  const handleDisconnect = async () => {
    if (!user?.id) return;

    if (!confirm('Вы уверены, что хотите отключить Telegram уведомления?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await telegramVerificationService.disconnectTelegram(user.id);
      
      if (result.success) {
        setIsConnected(false);
        setTelegramChatId('');
        setVerifiedAt('');
        setNotificationsEnabled(false);
        setVerificationCode('');
        setExpiresAt('');
        setSuccess('Telegram отключен');
      } else {
        setError(result.error || 'Ошибка отключения');
      }

    } catch (error: any) {
      setError(error.message || 'Ошибка отключения Telegram');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обновление настроек уведомлений
   */
  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user?.id) return;

    try {
      const result = await telegramVerificationService.updateNotificationSettings(user.id, enabled);
      
      if (result.success) {
        setNotificationsEnabled(enabled);
      } else {
        setError(result.error || 'Ошибка обновления настроек');
      }

    } catch (error: any) {
      setError(error.message || 'Ошибка обновления настроек');
    }
  };

  /**
   * Открытие Telegram бота
   */
  const openTelegramBot = () => {
    const telegramUrl = verificationCode 
      ? `https://t.me/${botUsername}?start=${verificationCode}`
      : `https://t.me/${botUsername}`;
      
    window.open(telegramUrl, '_blank');
  };

  // Проверка доступности функции
  if (!telegramConfigured) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Telegram уведомления
            <Badge variant="secondary">Недоступно</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-600">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              Telegram интеграция не настроена администратором.<br />
              Обратитесь к системному администратору для настройки.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Telegram уведомления
          {isConnected ? (
            <Badge className="bg-green-600">Подключен</Badge>
          ) : verificationCode ? (
            <Badge className="bg-blue-600">Ожидание подключения</Badge>
          ) : (
            <Badge variant="secondary">Не подключен</Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Информация о преимуществах */}
        {!isConnected && !verificationCode && (
          <Alert className="border-blue-600">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              Подключите Telegram для получения мгновенных уведомлений о важных событиях системы.
            </AlertDescription>
          </Alert>
        )}

        {/* Статус подключения */}
        {isConnected && (
          <Alert className="border-green-600">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="space-y-2">
              <div>
                <strong>Telegram успешно подключен!</strong>
              </div>
              <div className="text-sm text-slate-400">
                <strong>Chat ID:</strong> {telegramChatId}<br />
                <strong>Подключен:</strong> {verifiedAt ? new Date(verifiedAt).toLocaleString('ru-RU') : 'Неизвестно'}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Процесс верификации */}
        {verificationCode && !isConnected && (
          <Alert className="border-green-600 bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="space-y-4">
              
              {/* Заголовок */}
              <div className="font-semibold text-green-300">
                Код для подключения Telegram:
              </div>
              
              {/* Код с кнопкой копирования */}
              <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-600">
                <code className="text-2xl font-mono text-green-400 tracking-wider font-bold">
                  {verificationCode}
                </code>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(verificationCode)}
                  className="flex-shrink-0"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Скопировано!' : 'Скопировать'}
                </Button>
              </div>
              
              {/* Инструкция */}
              <div className="space-y-2 text-sm">
                <div>📱 <strong>Следующие шаги:</strong></div>
                <div>1. Скопируйте код выше</div>
                <div>2. Откройте Telegram и найдите нашего бота</div>
                <div>3. Отправьте команду: <code className="bg-slate-700 px-1 rounded">/start {verificationCode}</code></div>
              </div>
              
              {/* Кнопка перехода в Telegram */}
              <Button 
                className="w-full"
                onClick={openTelegramBot}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Открыть @{botUsername} в Telegram
              </Button>
              
              {/* Таймер истечения */}
              {timeRemaining && (
                <div className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Код действителен: {timeRemaining}
                </div>
              )}
              
            </AlertDescription>
          </Alert>
        )}

        {/* Настройки уведомлений (если подключен) */}
        {isConnected && (
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <Label className="text-slate-300 text-base font-medium">
                Уведомления включены
              </Label>
              <p className="text-sm text-slate-400">
                Получать уведомления в Telegram
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex gap-2 flex-wrap">
          {!isConnected && !verificationCode && (
            <Button 
              onClick={handleGenerateCode} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>Создаем код...</>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Подключить Telegram
                </>
              )}
            </Button>
          )}

          {verificationCode && !isConnected && (
            <Button 
              variant="outline"
              onClick={handleGenerateCode}
              disabled={loading}
            >
              {loading ? 'Создаем...' : 'Новый код'}
            </Button>
          )}

          {isConnected && (
            <>
              <Button 
                variant="outline" 
                onClick={handleTestNotification} 
                disabled={testingNotification}
              >
                {testingNotification ? (
                  <>Отправляем...</>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Тест уведомления
                  </>
                )}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleDisconnect}
                disabled={loading}
              >
                Отключить
              </Button>
            </>
          )}
        </div>

        {/* Сообщения об ошибках и успехе */}
        {error && (
          <Alert className="border-red-600">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-200">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Справочная информация */}
        {!verificationCode && !isConnected && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Как это работает:</strong><br />
              1. Нажмите "Подключить Telegram"<br />
              2. Скопируйте появившийся код<br />
              3. Отправьте код боту @{botUsername}<br />
              4. Получите подтверждение о подключении
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};