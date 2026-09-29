-- Часовой пояс сети: networks.settings.timezone (IANA), пусто = МСК.
-- STS отдаёт время станции без пояса — по местным часам. «АЗС Н1» (STS 71):
-- Тюмень, Ишим, Заводоуковск, Талица — UTC+5, МСК+2. По поясу Монитор считает
-- «N мин назад», офлайн терминала и переводит дату вступления цены в часы станции.

UPDATE networks
   SET settings = COALESCE(settings, '{}'::jsonb) || '{"timezone": "Asia/Yekaterinburg"}'::jsonb,
       updated_at = now()
 WHERE external_id = '71'
   AND deleted_at IS NULL;
