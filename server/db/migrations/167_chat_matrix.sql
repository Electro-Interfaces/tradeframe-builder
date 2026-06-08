-- Раздел «Чат» на Matrix/Synapse (родной UI, matrix-js-sdk).
-- Маппинг TradeFrame ↔ Matrix. Заменяет RC-подход (166_rc_user_map удаляется в фазе 5).
-- admin-токен и комнаты — на стороне Synapse; здесь только устойчивые связки.

-- Аккаунт клиента в Matrix + его личный чат поддержки.
CREATE TABLE IF NOT EXISTS chat_matrix_accounts (
  tradeframe_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  matrix_user_id     TEXT UNIQUE NOT NULL,   -- @gig.aivanov:matrix.dataworker.ru
  support_room_id    TEXT,                    -- личный чат «Поддержка — <Имя>»
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Компания-клиент (TradeFrame network) ↔ Matrix Space + комнаты направлений.
CREATE TABLE IF NOT EXISTS chat_matrix_companies (
  network_id      UUID PRIMARY KEY REFERENCES networks(id) ON DELETE CASCADE,
  space_id        TEXT NOT NULL,              -- Matrix space клиента
  direction_rooms JSONB,                       -- {"Общий":"!...","Учет":"!...","АЗС":"!...","Процессинг":"!..."}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed ГИГ: network находим по external_id=15 (не хардкодим UUID — переносимо между БД).
-- Space/комнаты — из vault matrix-admin.md (раздел «🏢 ГИГ»). Идемпотентно.
INSERT INTO chat_matrix_companies (network_id, space_id, direction_rooms)
SELECT n.id,
       '!IPVxLAgctPznZUPnRp:matrix.dataworker.ru',
       '{"Общий":"!zfIquVUUWzIRZWPCJO:matrix.dataworker.ru","Учет":"!UjGvnLRzevbrUYauhG:matrix.dataworker.ru","АЗС":"!fMsvEzDUbgUdzPkJtP:matrix.dataworker.ru","Процессинг":"!gkYqUFNspIirJDDcSV:matrix.dataworker.ru"}'::jsonb
FROM networks n
WHERE n.external_id = '15'
ON CONFLICT (network_id) DO UPDATE
  SET space_id = EXCLUDED.space_id,
      direction_rooms = EXCLUDED.direction_rooms;
