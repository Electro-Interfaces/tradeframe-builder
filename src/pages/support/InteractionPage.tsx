/**
 * «Взаимодействие» — единая страница общения с поддержкой: Чат / Заявки / Инфо.
 * Верхних табов НЕТ — переключение идёт кнопками (мобайл: нижнее меню; десктоп: шапка),
 * активный раздел задаётся ?tab (chat по умолчанию). Чат/Заявки/Инфо переиспользуют
 * существующие компоненты во встроенном режиме.
 */
import { lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ChatPage from './ChatPage';
import TicketsPage from './TicketsPage';

const InfoCenter = lazy(() => import('@/components/info/InfoCenter'));

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
          <Suspense
            fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          >
            <InfoCenter />
          </Suspense>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
