/**
 * Страница настроек уведомлений пользователя
 */

import { useState, useEffect } from 'react';
import { Bell, MessageCircle, MoonStar, Save, Link as LinkIcon, CheckCircle, Send } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useNewAuth } from '@/contexts/NewAuthContext';
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
  generateTelegramLinkCode,
  getUserNotificationSubscriptions,
  updateUserNotificationSubscription,
  sendTestNotification
} from '@/services/notificationService';
import type { UserNotificationSettings } from '@/types/notification';

export default function UserNotificationSettingsPage() {
  const { user } = useNewAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserNotificationSettings | null>(null);

  // Telegram настройки
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Режим "Не беспокоить"
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');

  // Подписки на типы событий (только реализованные)
  const [subscriptions, setSubscriptions] = useState({
    bill_acceptor_threshold: true,
    terminal_offline: true,
    low_fuel_level: true,
    unpunched_receipts: true
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await getUserNotificationSettings(user.id);

      if (data) {
        setSettings(data);
        setTelegramVerified(data.telegram_verified ?? false);
        setTelegramUsername(data.telegram_username || '');
        setDndEnabled(data.dnd_enabled ?? false);
        setDndStart(data.dnd_start || '22:00');
        setDndEnd(data.dnd_end || '08:00');
      } else {
        // Настройки ещё не созданы, используем defaults
      }

      // Загружаем подписки
      const subs = await getUserNotificationSubscriptions(user.id);
      const subsMap: any = {};
      subs.forEach(sub => {
        subsMap[sub.notification_type] = sub.enabled;
      });
      setSubscriptions(prev => ({ ...prev, ...subsMap }));

    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить настройки уведомлений',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await updateUserNotificationSettings(user.id, {
        dnd_enabled: dndEnabled,
        dnd_start: dndStart,
        dnd_end: dndEnd
      });

      // Сохраняем подписки
      for (const [type, enabled] of Object.entries(subscriptions)) {
        await updateUserNotificationSubscription(user.id, type, {
          enabled,
          channels: enabled ? ['telegram'] : [] // ✅ Только Telegram
        });
      }

      toast({
        title: 'Настройки сохранены',
        description: 'Ваши настройки уведомлений обновлены'
      });

      await loadSettings();
    } catch (error) {
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTelegramLink = async () => {
    if (!user?.id) return;

    setGeneratingLink(true);
    try {
      const result = await generateTelegramLinkCode(user.id);
      setTelegramLink(result.telegramLink);

      toast({
        title: 'Ссылка создана',
        description: 'Перейдите по ссылке и нажмите Start в Telegram боте'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать ссылку для привязки',
        variant: 'destructive'
      });
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!user?.id) return;

    setSendingTest(true);
    try {
      await sendTestNotification(user.id);

      toast({
        title: 'Уведомление отправлено',
        description: 'Проверьте Telegram - тестовое уведомление должно прийти'
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить тестовое уведомление',
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Загрузка настроек...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        {/* Заголовок */}
        <div>
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">
              Настройки уведомлений
            </h1>
          </div>
          <p className="text-slate-400 mt-2">
            Управляйте способами получения уведомлений и выберите интересующие события
          </p>
        </div>

        {/* Telegram настройки */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Telegram уведомления</h2>
          </div>

          <div className="space-y-4">
            {telegramVerified ? (
              <>
                <div className="p-4 bg-emerald-900/20 border border-green-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-400 font-medium">Telegram привязан</span>
                  </div>
                  {telegramUsername && (
                    <p className="text-slate-300 text-sm mt-2">
                      Аккаунт: @{telegramUsername}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSendTestNotification}
                  disabled={sendingTest}
                  variant="outline"
                  className="w-full border-blue-700 text-blue-400 hover:bg-blue-900/20"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingTest ? 'Отправка...' : 'Отправить тестовое уведомление'}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-slate-900 rounded-lg">
                  <p className="text-slate-300 text-sm">
                    Привяжите ваш Telegram аккаунт, чтобы получать мгновенные уведомления
                  </p>
                </div>

                <Button
                  onClick={handleGenerateTelegramLink}
                  disabled={generatingLink}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {generatingLink ? 'Создание ссылки...' : 'Привязать Telegram'}
                </Button>

                {telegramLink && (
                  <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <p className="text-blue-400 text-sm mb-2">
                      Перейдите по ссылке и нажмите "Start" в боте:
                    </p>
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline break-all"
                    >
                      {telegramLink}
                    </a>
                    <p className="text-slate-500 text-xs mt-2">
                      Ссылка действительна 24 часа
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Режим "Не беспокоить" */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <MoonStar className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Режим "Не беспокоить"</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
              <div>
                <Label className="text-slate-300">Включить режим</Label>
                <p className="text-xs text-slate-500">
                  Не получать уведомления в указанное время
                </p>
              </div>
              <Switch
                checked={dndEnabled}
                onCheckedChange={setDndEnabled}
              />
            </div>

            {dndEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dnd-start" className="text-slate-300">Начало</Label>
                  <Input
                    id="dnd-start"
                    type="time"
                    value={dndStart}
                    onChange={(e) => setDndStart(e.target.value)}
                    className="mt-2 bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="dnd-end" className="text-slate-300">Окончание</Label>
                  <Input
                    id="dnd-end"
                    type="time"
                    value={dndEnd}
                    onChange={(e) => setDndEnd(e.target.value)}
                    className="mt-2 bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Подписки на типы событий */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-2">Типы событий</h2>
            <p className="text-slate-400 text-sm">
              Выберите, о каких событиях вы хотите получать уведомления
            </p>
          </div>

          <Separator className="my-4 bg-slate-700" />

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg hover:bg-slate-900/70">
              <div>
                <Label className="text-slate-300">Пороги купюроприемника</Label>
                <p className="text-xs text-slate-500">
                  Когда купюроприемник заполнен или близок к заполнению
                </p>
              </div>
              <Switch
                checked={subscriptions.bill_acceptor_threshold}
                onCheckedChange={(checked) =>
                  setSubscriptions(prev => ({ ...prev, bill_acceptor_threshold: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg hover:bg-slate-900/70">
              <div>
                <Label className="text-slate-300">Проблемы с терминалом</Label>
                <p className="text-xs text-slate-500">
                  Когда терминал не передает данные или задержка передачи превышает порог
                </p>
              </div>
              <Switch
                checked={subscriptions.terminal_offline}
                onCheckedChange={(checked) =>
                  setSubscriptions(prev => ({ ...prev, terminal_offline: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg hover:bg-slate-900/70">
              <div>
                <Label className="text-slate-300">Низкий уровень топлива</Label>
                <p className="text-xs text-slate-500">
                  Когда уровень топлива в резервуаре критически низкий
                </p>
              </div>
              <Switch
                checked={subscriptions.low_fuel_level}
                onCheckedChange={(checked) =>
                  setSubscriptions(prev => ({ ...prev, low_fuel_level: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg hover:bg-slate-900/70">
              <div>
                <Label className="text-slate-300">Непробитые чеки</Label>
                <p className="text-xs text-slate-500">
                  Сводка по непробитым чекам, требующим пробития для корректировки кассы
                </p>
              </div>
              <Switch
                checked={subscriptions.unpunched_receipts}
                onCheckedChange={(checked) =>
                  setSubscriptions(prev => ({ ...prev, unpunched_receipts: checked }))
                }
              />
            </div>
          </div>
        </Card>

        {/* Кнопка сохранения */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
