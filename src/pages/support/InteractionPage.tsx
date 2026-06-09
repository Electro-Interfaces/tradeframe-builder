/**
 * «Взаимодействие» — единая страница общения с поддержкой: Чат / Заявки / Помощь.
 * Верхних табов НЕТ — переключение идёт кнопками (мобайл: нижнее меню; десктоп: шапка),
 * активный раздел задаётся ?tab (chat по умолчанию). Чат и Заявки переиспользуют
 * существующие страницы во встроенном режиме (PageShell без MainLayout).
 */
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import ChatPage from './ChatPage';
import TicketsPage from './TicketsPage';

export default function InteractionPage() {
  const [params] = useSearchParams();
  const tab = params.get('tab') || 'chat';

  return (
    <MainLayout fullWidth>
      <Tabs value={tab} className="flex flex-col h-full min-h-0">
        <TabsContent value="chat" className="flex-1 min-h-0 mt-0 outline-none">
          <ChatPage embedded />
        </TabsContent>
        <TabsContent value="tickets" className="flex-1 min-h-0 mt-0 outline-none">
          <TicketsPage embedded />
        </TabsContent>
        <TabsContent value="help" className="flex-1 min-h-0 mt-0 outline-none">
          <div className="flex h-full items-center justify-center text-center p-8">
            <div>
              <HelpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Помощь</p>
              <p className="text-xs text-muted-foreground mt-1">Раздел в разработке</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
