/**
 * «Взаимодействие» — единая страница общения с поддержкой: табы Чат / Заявки / Помощь.
 * Чат и Заявки переиспользуют существующие страницы в embedded-режиме (без своего MainLayout).
 * Таб по ?tab= (chat по умолчанию — кнопка «Чат» открывает страницу сразу на чатах).
 */
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, LifeBuoy, HelpCircle } from 'lucide-react';
import ChatPage from './ChatPage';
import TicketsPage from './TicketsPage';

export default function InteractionPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'chat';
  const setTab = (v: string) => setParams({ tab: v }, { replace: true });

  return (
    <MainLayout fullWidth>
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full min-h-0">
        <div className="px-3 pt-3 pb-2 border-b border-border/50 shrink-0">
          <TabsList className="bg-card">
            <TabsTrigger value="chat" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white"><MessageCircle className="h-4 w-4" />Чат</TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white"><LifeBuoy className="h-4 w-4" />Заявки</TabsTrigger>
            <TabsTrigger value="help" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white"><HelpCircle className="h-4 w-4" />Помощь</TabsTrigger>
          </TabsList>
        </div>

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
