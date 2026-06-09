-- Клиентские чаты: комнаты, которые клиент создал сам со своими сотрудниками (БЕЗ нашей поддержки).
-- Владелец (создатель) управляет составом и может удалить чат. Таблица фиксирует владение —
-- по ней backend проверяет права на add/remove участников и удаление (наши каналы поддержки
-- здесь отсутствуют → их удалить/менять нельзя).
CREATE TABLE IF NOT EXISTS chat_matrix_client_rooms (
  room_id          TEXT PRIMARY KEY,
  owner_tf_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network_id       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_matrix_client_rooms_owner ON chat_matrix_client_rooms (owner_tf_user_id);
