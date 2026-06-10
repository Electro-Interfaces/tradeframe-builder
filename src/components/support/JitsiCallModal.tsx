/**
 * Модалка звонка/конференции в чате (Фаза 6, §6a ТЗ chat-matrix-AGENT-TASK.md).
 * Открывает Jitsi-конференцию комнаты поверх ChatPage (не уводя пользователя со страницы).
 * Команда поддержки входит в ту же конференцию из Element (плашка виджета в комнате).
 */
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestCall, startConference } from '@/services/jitsiCall';

export default function JitsiCallModal({
  roomId,
  roomName,
  audioOnly,
  onClose,
}: {
  roomId: string;
  roomName?: string;
  audioOnly?: boolean;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    let api: { dispose: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const session = await requestCall(roomId);
        if (cancelled || !containerRef.current) return;
        api = await startConference({
          session,
          parentNode: containerRef.current,
          audioOnly,
          onClose, // hangup внутри Jitsi закрывает модалку
        });
        if (!cancelled) setConnecting(false);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Не удалось начать звонок');
          onClose();
        }
      }
    })();
    return () => {
      cancelled = true;
      api?.dispose();
    };
    // onClose стабилен по месту использования; пересоздавать конференцию из-за него нельзя
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, audioOnly]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[82vh] p-0 gap-0 flex flex-col bg-background border-border overflow-hidden">
        <DialogHeader className="px-4 py-2 shrink-0 border-b border-border/50">
          <DialogTitle className="text-sm text-foreground">
            {audioOnly ? '📞 Звонок' : '🎥 Видеозвонок'}{roomName ? ` — ${roomName}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 min-h-0">
          {connecting && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Подключение…
            </div>
          )}
          <div ref={containerRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
