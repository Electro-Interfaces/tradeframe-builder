/**
 * Глобальная модалка «Взаимодействие»: Связь / Чат / Заявки / Инфо.
 * Открывается поверх текущего экрана из шапки (десктоп) и нижнего меню (мобайл).
 * modal={false} — фон не блокируется, поэтому кнопки остаются кликабельными
 * (toggle: повторное нажатие закрывает; крестик в модалке — тоже).
 * Связь — отдельный диалог (StationsConnectionDialog), остальные — общий Dialog.
 */
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSupportContext } from '@/contexts/SupportContext';
import StationsConnectionDialog from '@/components/operations/StationsConnectionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, HelpCircle } from 'lucide-react';

const ChatPage = lazy(() => import('@/pages/support/ChatPage'));
const TicketsPage = lazy(() => import('@/pages/support/TicketsPage'));

const TITLES: Record<string, string> = { chat: 'Чат', tickets: 'Заявки', help: 'Инфо' };

export default function InteractionHost() {
  const { interactionSection, closeInteraction } = useSupportContext();
  const section = interactionSection;
  const isPanel = section === 'chat' || section === 'tickets' || section === 'help';

  return (
    <>
      {/* Приглушающая подложка под любой открытой панелью. modal={false} не рендерит
          overlay (чтобы кнопки-тогглы в шапке оставались кликабельными), поэтому рисуем
          свою: pointer-events-none — клики проходят сквозь, но фон-экран темнеет и
          модалка перестаёт сливаться с ним в обеих темах. */}
      {section &&
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
              {section === 'help' && (
                <div className="flex h-full items-center justify-center text-center p-8">
                  <div>
                    <HelpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Инфо</p>
                    <p className="text-xs text-muted-foreground mt-1">Раздел в разработке</p>
                  </div>
                </div>
              )}
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
