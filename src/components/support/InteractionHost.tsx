/**
 * Глобальные модалки «Взаимодействие»: Связь / Чат / Заявки / Инфо.
 * - Связь / Чат / Заявки — поверх экрана (modal={false}, фон-кнопки кликабельны, toggle);
 *   приглушающую подложку рисуем сами (pointer-events-none).
 * - Инфо (InfoCenter) — отдельная модалка-destination (modal=true): Radix сам даёт overlay,
 *   focus-trap и блокировку скролла — важно для длинного чтения и доступности (§12.6 ТЗ).
 */
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSupportContext } from '@/contexts/SupportContext';
import StationsConnectionDialog from '@/components/operations/StationsConnectionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const ChatPage = lazy(() => import('@/pages/support/ChatPage'));
const TicketsPage = lazy(() => import('@/pages/support/TicketsPage'));
const InfoCenter = lazy(() => import('@/components/info/InfoCenter'));

const TITLES: Record<string, string> = { chat: 'Чат', tickets: 'Заявки' };

export default function InteractionHost() {
  const { interactionSection, closeInteraction } = useSupportContext();
  const section = interactionSection;
  const isPanel = section === 'chat' || section === 'tickets';

  return (
    <>
      {/* Приглушающая подложка под Связь/Чат/Заявки (modal={false} не рендерит overlay).
          pointer-events-none — клики проходят сквозь, фон-экран темнеет. Для «Инфо» НЕ рисуем:
          там modal=true и Radix даёт собственный overlay. */}
      {section && section !== 'help' &&
        createPortal(
          <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] pointer-events-none" aria-hidden />,
          document.body,
        )}

      <StationsConnectionDialog
        open={section === 'connection'}
        onOpenChange={(o) => { if (!o) closeInteraction(); }}
        modal={false}
      />

      <Dialog open={isPanel} onOpenChange={(o) => { if (!o) closeInteraction(); }} modal={false}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          className="p-0 gap-0 bg-card border-border text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10 w-screen h-[100dvh] max-w-none max-h-none rounded-none sm:w-[96vw] sm:max-w-5xl sm:h-[85vh] sm:max-h-[85vh] sm:rounded-lg overflow-hidden flex flex-col"
        >
          <DialogHeader className="px-4 py-2.5 border-b border-border/50 shrink-0 text-left">
            <DialogTitle className="text-foreground text-base">{section ? TITLES[section] : ''}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            >
              {section === 'chat' && <ChatPage embedded />}
              {section === 'tickets' && <TicketsPage embedded />}
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      {/* Инфо — модалка-destination (modal=true) */}
      <Dialog open={section === 'help'} onOpenChange={(o) => { if (!o) closeInteraction(); }}>
        <DialogContent className="p-0 gap-0 bg-card border-border text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10 w-screen h-[100dvh] max-w-none max-h-none rounded-none sm:w-[96vw] sm:max-w-6xl sm:h-[88vh] sm:max-h-[88vh] sm:rounded-lg overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-2.5 border-b border-border/50 shrink-0 text-left">
            <DialogTitle className="text-foreground text-base">Инфо — база знаний и инструкции</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            >
              {section === 'help' && <InfoCenter />}
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
