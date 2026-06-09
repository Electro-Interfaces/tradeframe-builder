-- Модель каналов поддержки: на компанию остаётся ОДИН общий канал («Поддержка Общий»,
-- для всех проектов). Направления Учёт/АЗС/Процессинг убраны (комнаты удалены в Matrix).
-- Приводим direction_rooms {"Общий":X, "Учет":Y, ...} → {"general": X}.
UPDATE chat_matrix_companies
SET direction_rooms = jsonb_build_object('general', direction_rooms->>'Общий')
WHERE direction_rooms ? 'Общий';
