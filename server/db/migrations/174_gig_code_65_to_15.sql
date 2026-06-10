-- Завершение «вечного переезда» ГИГ: networks.code '65' → '15'.
--
-- Миграция 162 сменила колонку external_id ГИГ 65→15, 165 — settings.external_id,
-- но поле networks.code осталось '65'. Селектор сети (NetworkSelect.tsx) показывает
-- именно code → пользователь видел устаревшее «ГИГ (65)», хотя система ходит по
-- external_id=15. На code='65' ничего не завязано: RBAC scope не использует '65'
-- (0 привязок в user_roles), STS резолвит system строго по external_id (sts.js).
-- Приводим code к актуальному '15'.
--
-- Идемпотентно: повторный прогон не найдёт code='65'. Runner оборачивает в BEGIN/COMMIT.

UPDATE networks
   SET code = '15',
       updated_at = now()
 WHERE lower(code) = '65';
