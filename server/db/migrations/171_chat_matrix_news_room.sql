-- Обязательный канал «Новости» (read-only для клиентов): пишут только наши сотрудники
-- (MATRIX_SUPPORT_MXIDS), остальные читают; модератор — @d.korolev (Дмитрий Королёв).
-- Комната провижится лениво (ensureNewsRoom) при первой /session клиента компании;
-- id хранится здесь. NULL → ещё не создана.
ALTER TABLE chat_matrix_companies ADD COLUMN IF NOT EXISTS news_room_id TEXT;
