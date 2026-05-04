-- Sane defaults для прав на работу с документами корректировки остатков.
-- Конкретный маппинг ролей утверждается заказчиком — см. docs/INVENTORY_ADJUSTMENT_PROPOSAL.md §7.
-- При необходимости администратор перенастраивает permissions через UI ролей.
--
-- Действия:
--   inventory.read  — просмотр списка и деталей
--   inventory.write — создание/редактирование draft, отмена draft
--   inventory.send  — утверждение и отправка email-приказа

-- Хелпер: добавляет inventory permission к роли, если она есть и ещё не содержит его.
CREATE OR REPLACE FUNCTION _tmp_add_inventory_permission(
  p_role_code TEXT,
  p_actions JSONB
) RETURNS VOID AS $$
DECLARE
  v_existing JSONB;
  v_already_has BOOLEAN := false;
  v_new_perm JSONB;
BEGIN
  SELECT permissions INTO v_existing
  FROM roles
  WHERE lower(code) = lower(p_role_code)
    AND deleted_at IS NULL;

  IF v_existing IS NULL THEN
    RAISE NOTICE 'Роль % не найдена — пропускаем', p_role_code;
    RETURN;
  END IF;

  -- Проверка: есть ли уже запись section='inventory'
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_existing) AS elem
    WHERE elem->>'section' = 'inventory'
  ) INTO v_already_has;

  IF v_already_has THEN
    RAISE NOTICE 'Роль %: inventory permission уже есть — пропускаем', p_role_code;
    RETURN;
  END IF;

  v_new_perm := jsonb_build_object(
    'section', 'inventory',
    'resource', '*',
    'actions', p_actions
  );

  UPDATE roles
  SET permissions = v_existing || jsonb_build_array(v_new_perm),
      updated_at = now()
  WHERE lower(code) = lower(p_role_code)
    AND deleted_at IS NULL;

  RAISE NOTICE 'Роль %: добавлено inventory permission %', p_role_code, p_actions;
END;
$$ LANGUAGE plpgsql;

-- Полный доступ для системных ролей
SELECT _tmp_add_inventory_permission('super_admin',   '["read","write","send"]'::jsonb);
SELECT _tmp_add_inventory_permission('system_admin',  '["read","write","send"]'::jsonb);
SELECT _tmp_add_inventory_permission('network_admin', '["read","write","send"]'::jsonb);

-- Read+write для прикладных ролей (если они существуют в БД)
SELECT _tmp_add_inventory_permission('accountant',         '["read","write"]'::jsonb);
SELECT _tmp_add_inventory_permission('bto_manager',        '["read","write"]'::jsonb);
SELECT _tmp_add_inventory_permission('bto_station_manager','["read","write"]'::jsonb);
SELECT _tmp_add_inventory_permission('enticom_manager',    '["read","write"]'::jsonb);

DROP FUNCTION IF EXISTS _tmp_add_inventory_permission(TEXT, JSONB);
