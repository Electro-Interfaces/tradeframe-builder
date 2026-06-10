/**
 * Оверлей нативного 1:1 звонка Matrix (Фаза 6b, ТЗ chat-matrix-AGENT-TASK.md).
 * Состояния: исходящий (вызов…), входящий (принять/отклонить), активный (медиа + контролы).
 * Медиа ходит по WebRTC через TURN; собеседник отвечает из Element / Element X.
 */
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import type { MatrixCall } from '@/services/matrixCall';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MatrixCallOverlay({
  call,
  direction,
  video,
  peerName,
  onClose,
}: {
  call: MatrixCall;
  direction: 'in' | 'out';
  video: boolean;
  peerName: string;
  onClose: () => void;
}) {
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<string>(call.state);
  const [micMuted, setMicMuted] = useState(false);
  const [camMuted, setCamMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const connected = state === 'connected';
  const ringing = !connected && state !== 'ended';

  // Слушатели событий звонка
  useEffect(() => {
    const attachFeeds = () => {
      for (const feed of call.getFeeds()) {
        const el = feed.isLocal() ? localRef.current : remoteRef.current;
        if (el && el.srcObject !== feed.stream) el.srcObject = feed.stream;
      }
    };
    const onState = (newState: string) => {
      setState(newState);
      if (newState === 'connected') attachFeeds();
    };
    const onHangup = () => {
      onClose();
    };
    const onError = (err: Error) => {
      toast.error(`Ошибка звонка: ${err.message}`);
      onClose();
    };
    // строковые имена событий = публичные значения CallEvent.* (стабильны в matrix-js-sdk)
    const on = call.on.bind(call) as (ev: string, fn: (...a: never[]) => void) => void;
    const off = call.removeListener.bind(call) as typeof on;
    on('state', onState as never);
    on('feeds_changed', attachFeeds as never);
    on('hangup', onHangup as never);
    on('error', onError as never);
    attachFeeds();
    return () => {
      off('state', onState as never);
      off('feeds_changed', attachFeeds as never);
      off('hangup', onHangup as never);
      off('error', onError as never);
    };
    // onClose намеренно вне deps — пересоздание слушателей на каждый рендер не нужно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  // Таймер длительности
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const hangup = () => {
    try {
      call.hangup('user_hangup' as Parameters<MatrixCall['hangup']>[0], false);
    } catch { /* уже завершён */ }
    onClose();
  };
  const reject = () => {
    try { call.reject(); } catch { /* уже завершён */ }
    onClose();
  };
  const answer = async () => {
    try { await call.answer(); } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось ответить');
      onClose();
    }
  };
  const toggleMic = async () => {
    const next = !micMuted;
    await call.setMicrophoneMuted(next);
    setMicMuted(next);
  };
  const toggleCam = async () => {
    const next = !camMuted;
    await call.setLocalVideoMuted(next);
    setCamMuted(next);
  };

  const title = direction === 'in'
    ? `${video ? '🎥' : '📞'} Входящий звонок — ${peerName}`
    : connected
      ? `${video ? '🎥' : '📞'} ${peerName} · ${formatDuration(seconds)}`
      : `${video ? '🎥' : '📞'} Вызов — ${peerName}…`;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) hangup(); }}>
      <DialogContent className="max-w-2xl w-[92vw] p-0 gap-0 flex flex-col bg-background border-border overflow-hidden">
        <DialogHeader className="px-4 py-2 shrink-0 border-b border-border/50">
          <DialogTitle className="text-sm text-foreground">{title}</DialogTitle>
        </DialogHeader>

        {/* Медиа-зона: удалённый поток (видео или аватар-заглушка) + локальное превью */}
        <div className="relative bg-black/90 aspect-video">
          <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-contain" />
          {!connected && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
              {direction === 'in' ? 'Вам звонят…' : 'Ожидание ответа…'}
            </div>
          )}
          {video && (
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-2 right-2 w-32 rounded-md border border-white/20 shadow"
            />
          )}
        </div>

        {/* Контролы */}
        <div className="flex items-center justify-center gap-3 p-3">
          {direction === 'in' && ringing ? (
            <>
              <Button onClick={answer} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Phone className="h-4 w-4 mr-1.5" /> Принять
              </Button>
              <Button variant="destructive" onClick={reject}>
                <PhoneOff className="h-4 w-4 mr-1.5" /> Отклонить
              </Button>
            </>
          ) : (
            <>
              <Button variant={micMuted ? 'secondary' : 'outline'} size="icon" title="Микрофон" onClick={toggleMic}>
                {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              {video && (
                <Button variant={camMuted ? 'secondary' : 'outline'} size="icon" title="Камера" onClick={toggleCam}>
                  {camMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="destructive" onClick={hangup}>
                <PhoneOff className="h-4 w-4 mr-1.5" /> Завершить
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
