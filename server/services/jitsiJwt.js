/**
 * Подпись Jitsi-JWT для звонков из чата (Фаза 6, §6a ТЗ chat-matrix-AGENT-TASK.md).
 *
 * meet.dataworker.ru работает с ENABLE_AUTH=1 / AUTH_TYPE=jwt: комнату может начать только
 * владелец валидного токена, гости заходят в уже идущую конференцию. Токен инициатору выдаёт
 * этот модуль — клиент TradeFrame становится «организатором», команда присоединяется из
 * Element гостями. Издатель `tradeframe` добавлен в JWT_ACCEPTED_ISSUERS Jitsi (10.06.2026).
 *
 * Секрет = JWT_APP_SECRET Jitsi-стека (/opt/jitsi/.env на ai-core), в env как JITSI_JWT_SECRET.
 * Без секрета в env функция отдаёт null — фронт зайдёт гостем (поведение до фикса).
 * HS256 подписывается вручную через crypto — без новой зависимости.
 */
const crypto = require('crypto');

const b64u = (s) => Buffer.from(s).toString('base64url');

function signJitsiJwt({ room, displayName }) {
  const secret = process.env.JITSI_JWT_SECRET;
  if (!secret) return null;
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.JITSI_JWT_ISSUER || 'tradeframe',
    aud: 'jitsi',
    // sub = внутренний XMPP-домен docker-jitsi (НЕ публичный URL)
    sub: process.env.JITSI_XMPP_DOMAIN || 'meet.jitsi',
    room: room || '*',
    nbf: now - 10,
    exp: now + 2 * 60 * 60, // токен на 2 часа — хватит на любой звонок
    context: { user: { name: displayName || 'Участник' } },
  };
  const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

module.exports = { signJitsiJwt };
