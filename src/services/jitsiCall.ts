/**
 * Звонки в чате (Фаза 6, §6a ТЗ chat-matrix-AGENT-TASK.md).
 *
 * Backend (POST /api/chat/matrix/call) гарантирует Jitsi-виджет в Matrix-комнате и
 * уведомляет команду (@room-упоминание → push в Element). Фронт открывает ту же
 * конференцию через Jitsi IFrame API (external_api.js с meet.dataworker.ru).
 *
 * external_api.js НЕ входит в bundle — грузится динамическим <script> с домена Jitsi
 * (R5: bundle не растёт; настройки Jitsi-сервера всегда актуальны).
 */
import { apiRequest } from './apiClient';

export interface CallSession {
  domain: string;        // например meet.dataworker.ru
  conferenceId: string;  // tf-<hex> — неугадываемое имя комнаты Jitsi
  displayName: string;   // имя текущего пользователя для конференции
  jwt?: string;          // Jitsi-JWT: инициатор = организатор (без него — гость, ждёт организатора)
}

/** Запросить звонок в комнате: backend вернёт конференцию и уведомит участников. */
export async function requestCall(roomId: string): Promise<CallSession> {
  return apiRequest('/chat/matrix/call', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });
}

// JitsiMeetExternalAPI приходит из external_api.js (без типов).
type JitsiApi = {
  dispose: () => void;
  addListener: (event: string, cb: (...args: unknown[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadExternalApi(domain: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  let p = scriptPromises.get(domain);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://${domain}/external_api.js`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromises.delete(domain); // даём шанс повторной загрузке
        reject(new Error(`Не удалось загрузить Jitsi с ${domain}`));
      };
      document.head.appendChild(s);
    });
    scriptPromises.set(domain, p);
  }
  return p;
}

export interface StartConferenceOptions {
  session: CallSession;
  parentNode: HTMLElement;
  audioOnly?: boolean;
  onClose?: () => void; // пользователь вышел из конференции (hangup)
}

/** Открыть конференцию в указанном контейнере. Вернувшийся объект — dispose() при закрытии. */
export async function startConference({ session, parentNode, audioOnly, onClose }: StartConferenceOptions): Promise<JitsiApi> {
  await loadExternalApi(session.domain);
  if (!window.JitsiMeetExternalAPI) throw new Error('Jitsi API недоступен');
  const api = new window.JitsiMeetExternalAPI(session.domain, {
    roomName: session.conferenceId,
    ...(session.jwt ? { jwt: session.jwt } : {}),
    parentNode,
    width: '100%',
    height: '100%',
    userInfo: { displayName: session.displayName },
    configOverwrite: {
      prejoinConfig: { enabled: false },
      startWithVideoMuted: !!audioOnly,
      disableDeepLinking: true,
    },
    interfaceConfigOverwrite: {
      MOBILE_APP_PROMO: false,
    },
  });
  if (onClose) api.addListener('readyToClose', onClose);
  return api;
}
