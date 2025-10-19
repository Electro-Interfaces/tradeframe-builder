/**
 * Страница "Оповещения сети" (РЕФАКТОРИНГ)
 * Управление правилами уведомлений и просмотр истории
 */

import { useState } from 'react';
import { Bell, Plus, Settings2, AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSelection } from '@/contexts/SelectionContext';
import { RuleDialog } from '@/components/notifications/RuleDialog';
import { RuleCard } from '@/components/notifications/RuleCard';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import type { NotificationRule } from '@/types/notification';

export default function NetworkNotifications() {
  const { selectedNetwork } = useSelection();
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState('rules');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // Используем кастомный хук для управления состоянием
  const {
    rules,
    activeNotifications,
    historyNotifications,
    loading,
    refreshing,
    loadRules,
    toggleRule,
    removeRule,
    saveRule,
    markAsRead
  } = useNotifications({
    tenantId: selectedNetwork?.id,
    autoLoad: true
  });

  const handleCreateRule = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<NotificationRule>) => {
    await saveRule(ruleData, !!editingRule);
    setDialogOpen(false);
    setEditingRule(null);
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Заголовок */}
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
          <div>
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <Bell className={`text-yellow-400 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              <h1 className={`font-bold text-white ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Оповещения сети
              </h1>
            </div>
            <p className={`text-slate-400 ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
              Управление правилами уведомлений и автоматическими оповещениями
            </p>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRules}
              disabled={refreshing}
              className={isMobile ? 'flex-1' : ''}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              className={`bg-blue-600 hover:bg-blue-700 ${isMobile ? 'flex-1' : ''}`}
              onClick={handleCreateRule}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isMobile ? 'Правило' : 'Создать правило'}
            </Button>
          </div>
        </div>

        {/* Диалог создания/редактирования */}
        {selectedNetwork && (
          <RuleDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            rule={editingRule}
            tenantId={selectedNetwork.id}
            onSave={handleSaveRule}
          />
        )}

        {/* Табы */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="rules" className="data-[state=active]:bg-blue-600">
              <Settings2 className="w-4 h-4 mr-2" />
              Правила ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-blue-600">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Активные ({activeNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-600">
              <Clock className="w-4 h-4 mr-2" />
              История ({historyNotifications.length})
            </TabsTrigger>
          </TabsList>

          {/* Вкладка: Правила */}
          <TabsContent value="rules" className="space-y-4">
            {loading ? (
              <Card className="p-12 text-center bg-slate-800 border-slate-700">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Загрузка правил...
                </h3>
              </Card>
            ) : rules.length === 0 ? (
              <Card className="p-12 text-center bg-slate-800 border-slate-700">
                <Bell className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Нет настроенных правил
                </h3>
                <p className="text-slate-400 mb-6">
                  Создайте первое правило для автоматических оповещений
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateRule}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать правило
                </Button>
              </Card>
            ) : (
              rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={toggleRule}
                  onEdit={handleEditRule}
                  onDelete={removeRule}
                  isMobile={isMobile}
                />
              ))
            )}
          </TabsContent>

          {/* Вкладка: Активные уведомления */}
          <TabsContent value="active" className="space-y-4">
            {activeNotifications.length === 0 ? (
              <Card className="p-12 text-center bg-slate-800 border-slate-700">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Нет активных оповещений
                </h3>
                <p className="text-slate-400">
                  Все системы работают нормально
                </p>
              </Card>
            ) : (
              activeNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  isMobile={isMobile}
                />
              ))
            )}
          </TabsContent>

          {/* Вкладка: История */}
          <TabsContent value="history" className="space-y-4">
            {historyNotifications.length === 0 ? (
              <Card className="p-12 text-center bg-slate-800 border-slate-700">
                <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  История пуста
                </h3>
                <p className="text-slate-400">
                  История отправленных уведомлений появится здесь
                </p>
              </Card>
            ) : (
              historyNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  showReadStatus
                  isMobile={isMobile}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
