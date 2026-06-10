/**
 * Нативные 1:1 звонки Matrix (Фаза 6b, §6a.4 ТЗ chat-matrix-AGENT-TASK.md).
 *
 * Для комнат РОВНО из 2 участников: WebRTC точка-точка (медиа через TURN, настроен 10.06),
 * у собеседника в Element / Element X — настоящий входящий звонок с рингтоном и push.
 * В комнатах с 3+ участниками Element звонилку не показывает — там Jitsi (jitsiCall.ts).
 *
 * Модуль грузится только на Matrix-бэкенде (динамический import из ChatPage) — R5 соблюдён.
 */
import { createNewMatrixCall } from 'matrix-js-sdk';
import type { MatrixCall } from 'matrix-js-sdk';
import { getMatrixClientForCalls } from './matrixChat';

export type { MatrixCall };

/** Исходящий звонок в комнате. Запрашивает микрофон/камеру — только по жесту пользователя. */
export async function placeCall(roomId: string, video: boolean): Promise<MatrixCall> {
  const client = await getMatrixClientForCalls();
  const call = createNewMatrixCall(client, roomId);
  if (!call) throw new Error('Звонок в этой комнате невозможен');
  if (video) await call.placeVideoCall();
  else await call.placeVoiceCall();
  return call;
}

/**
 * Подписка на входящие звонки. Возвращает отписку.
 * Клиент может ещё инициализироваться — подписка вешается после готовности.
 */
export function onIncomingCall(handler: (call: MatrixCall) => void): () => void {
  let active = true;
  let clientRef: Awaited<ReturnType<typeof getMatrixClientForCalls>> | null = null;
  const listener = (call: MatrixCall) => {
    if (active) handler(call);
  };
  getMatrixClientForCalls()
    .then((client) => {
      if (!active) return;
      clientRef = client;
      // CallEventHandlerEvent.Incoming = 'Call.incoming' (строкой — стабильный публичный event)
      client.on('Call.incoming' as Parameters<typeof client.on>[0], listener as never);
    })
    .catch(() => {
      /* чат не поднялся — входящие звонки недоступны, не ломаем страницу */
    });
  return () => {
    active = false;
    clientRef?.removeListener('Call.incoming' as Parameters<typeof clientRef.on>[0], listener as never);
  };
}

/** Имя собеседника для шапки звонка. */
export function getCallPeerName(call: MatrixCall): string {
  try {
    return call.getOpponentMember()?.name || 'Собеседник';
  } catch {
    return 'Собеседник';
  }
}
