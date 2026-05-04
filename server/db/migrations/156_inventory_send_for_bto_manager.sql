-- Расширение прав роли bto_manager: добавляем inventory.send.
-- Идемпотентно: добавляем 'send' к существующему inventory permission только если его ещё нет.
-- Решение приказчика: бухгалтерия БТО утверждает и применяет приказы корректировки сама.

DO $$
DECLARE
  v_permissions JSONB;
  v_new_permissions JSONB;
  v_changed BOOLEAN := false;
BEGIN
  SELECT permissions INTO v_permissions
  FROM roles
  WHERE lower(code) = 'bto_manager'
    AND deleted_at IS NULL;

  IF v_permissions IS NULL THEN
    RAISE NOTICE 'Роль bto_manager не найдена — пропускаем';
    RETURN;
  END IF;

  SELECT jsonb_agg(
    CASE
      WHEN p->>'section' = 'inventory'
        AND NOT (p->'actions' ? 'send')
      THEN
        jsonb_set(p, '{actions}', (p->'actions') || '["send"]'::jsonb)
      ELSE p
    END
  ) INTO v_new_permissions
  FROM jsonb_array_elements(v_permissions) p;

  IF v_new_permissions IS DISTINCT FROM v_permissions THEN
    UPDATE roles
    SET permissions = v_new_permissions,
        updated_at = now()
    WHERE lower(code) = 'bto_manager'
      AND deleted_at IS NULL;
    RAISE NOTICE 'bto_manager: добавлено inventory.send';
  ELSE
    RAISE NOTICE 'bto_manager: inventory.send уже есть — пропускаем';
  END IF;
END $$;
