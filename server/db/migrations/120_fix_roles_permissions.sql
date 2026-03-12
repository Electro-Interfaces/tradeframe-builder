-- Миграция 120: Исправление ролей и разрешений
-- 1. Переименование роли «Менеджер Двух станций БТО ограничения» → bto_station_manager
-- 2. Нормализация строковых permissions в объектный формат (bto_manager, enticom_manager)
-- 3. Заполнение пустых scope_value у пользователей с ролью bto_manager

-- ============================================================================
-- 1. Исправление роли «Менеджер Двух станций БТО ограничения»
--    - code: кириллица → bto_station_manager
--    - scope: network → trading_point
--    - scope_values: очистка (конкретные точки задаются в user_roles.scope_value)
-- ============================================================================

DO $$
BEGIN
  UPDATE roles
  SET
    code = 'bto_station_manager',
    scope = 'trading_point',
    scope_values = '{}'::text[],
    updated_at = now()
  WHERE lower(code) = lower('Менеджер Двух станций  БТО ограничения')
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE NOTICE 'Роль «Менеджер Двух станций БТО ограничения» не найдена — пропускаем';
  ELSE
    RAISE NOTICE 'Роль переименована в bto_station_manager, scope=trading_point, scope_values очищены';
  END IF;
END $$;

-- ============================================================================
-- 2. Нормализация permissions: строки → объекты
--    Формат: "section.action" → {"section":"...","resource":"*","actions":["..."]}
--    Формат: "section.resource" (read) → {"section":"...","resource":"...","actions":["read"]}
--    Применяется к ролям: bto_manager, enticom_manager
-- ============================================================================

-- Функция для нормализации одного элемента permissions
CREATE OR REPLACE FUNCTION _tmp_normalize_permissions(p_permissions JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  elem JSONB;
  str_val TEXT;
  parts TEXT[];
  normalized JSONB;
BEGIN
  FOR i IN 0..jsonb_array_length(p_permissions) - 1 LOOP
    elem := p_permissions->i;

    IF jsonb_typeof(elem) = 'string' THEN
      -- Строковый формат — нужна нормализация
      str_val := elem #>> '{}';
      parts := string_to_array(str_val, '.');

      IF array_length(parts, 1) = 2 THEN
        -- Маппинг известных строковых разрешений
        CASE str_val
          WHEN 'networks.read' THEN
            normalized := '{"section":"networks","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'trading_points.read' THEN
            normalized := '{"section":"networks","resource":"trading_points","actions":["read"]}'::jsonb;
          WHEN 'prices.read' THEN
            normalized := '{"section":"prices","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'prices.write' THEN
            normalized := '{"section":"prices","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'equipment.read' THEN
            normalized := '{"section":"equipment","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'equipment.write' THEN
            normalized := '{"section":"equipment","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'tanks.read' THEN
            normalized := '{"section":"tanks","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'tanks.write' THEN
            normalized := '{"section":"tanks","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'operations.read' THEN
            normalized := '{"section":"operations","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'operations.write' THEN
            normalized := '{"section":"operations","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'shifts.read' THEN
            normalized := '{"section":"shifts","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'shifts.write' THEN
            normalized := '{"section":"shifts","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'reconciliation.read' THEN
            normalized := '{"section":"reconciliation","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'reconciliation.write' THEN
            normalized := '{"section":"reconciliation","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'notifications.read' THEN
            normalized := '{"section":"notifications","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'notifications.write' THEN
            normalized := '{"section":"notifications","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'support.read' THEN
            normalized := '{"section":"support","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'support.write' THEN
            normalized := '{"section":"support","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'analytics.read' THEN
            normalized := '{"section":"analytics","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'legal.read' THEN
            normalized := '{"section":"legal","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'legal.write' THEN
            normalized := '{"section":"legal","resource":"*","actions":["write"]}'::jsonb;
          WHEN 'admin.read' THEN
            normalized := '{"section":"admin","resource":"*","actions":["read"]}'::jsonb;
          WHEN 'admin.write' THEN
            normalized := '{"section":"admin","resource":"*","actions":["write"]}'::jsonb;
          ELSE
            -- Общий случай: section.action → {"section":"...","resource":"*","actions":["..."]}
            normalized := jsonb_build_object(
              'section', parts[1],
              'resource', '*',
              'actions', jsonb_build_array(parts[2])
            );
        END CASE;
      ELSE
        -- Неизвестный формат — оставляем как есть (не должно случиться)
        normalized := elem;
      END IF;

      result := result || jsonb_build_array(normalized);
    ELSE
      -- Уже объект — оставляем как есть
      result := result || jsonb_build_array(elem);
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Применяем нормализацию к bto_manager
DO $$
DECLARE
  v_old_perms JSONB;
  v_new_perms JSONB;
BEGIN
  SELECT permissions INTO v_old_perms
  FROM roles
  WHERE lower(code) = 'bto_manager'
    AND deleted_at IS NULL;

  IF v_old_perms IS NOT NULL THEN
    v_new_perms := _tmp_normalize_permissions(v_old_perms);

    IF v_new_perms IS DISTINCT FROM v_old_perms THEN
      UPDATE roles
      SET permissions = v_new_perms, updated_at = now()
      WHERE lower(code) = 'bto_manager'
        AND deleted_at IS NULL;
      RAISE NOTICE 'bto_manager: permissions нормализованы';
    ELSE
      RAISE NOTICE 'bto_manager: permissions уже в объектном формате';
    END IF;
  ELSE
    RAISE NOTICE 'Роль bto_manager не найдена — пропускаем';
  END IF;
END $$;

-- Применяем нормализацию к enticom_manager
DO $$
DECLARE
  v_old_perms JSONB;
  v_new_perms JSONB;
BEGIN
  SELECT permissions INTO v_old_perms
  FROM roles
  WHERE lower(code) = 'enticom_manager'
    AND deleted_at IS NULL;

  IF v_old_perms IS NOT NULL THEN
    v_new_perms := _tmp_normalize_permissions(v_old_perms);

    IF v_new_perms IS DISTINCT FROM v_old_perms THEN
      UPDATE roles
      SET permissions = v_new_perms, updated_at = now()
      WHERE lower(code) = 'enticom_manager'
        AND deleted_at IS NULL;
      RAISE NOTICE 'enticom_manager: permissions нормализованы';
    ELSE
      RAISE NOTICE 'enticom_manager: permissions уже в объектном формате';
    END IF;
  ELSE
    RAISE NOTICE 'Роль enticom_manager не найдена — пропускаем';
  END IF;
END $$;

-- Добавляем bto_station_manager полноценные permissions (аналогично bto_manager)
DO $$
BEGIN
  UPDATE roles
  SET permissions = '[
    {"section":"networks","resource":"*","actions":["read"]},
    {"section":"networks","resource":"trading_points","actions":["read"]},
    {"section":"menu_visibility","resource":"networks_menu","actions":["view_menu"]},
    {"section":"menu_visibility","resource":"trading_point_menu","actions":["view_menu"]},
    {"section":"equipment","resource":"tanks","actions":["manage"]}
  ]'::jsonb,
  updated_at = now()
  WHERE lower(code) = 'bto_station_manager'
    AND deleted_at IS NULL;

  IF FOUND THEN
    RAISE NOTICE 'bto_station_manager: permissions обновлены (сеть+точки+резервуары)';
  END IF;
END $$;

-- Применяем нормализацию к bto_station_manager (бывшая «Менеджер Двух станций»)
DO $$
DECLARE
  v_old_perms JSONB;
  v_new_perms JSONB;
BEGIN
  SELECT permissions INTO v_old_perms
  FROM roles
  WHERE lower(code) = 'bto_station_manager'
    AND deleted_at IS NULL;

  IF v_old_perms IS NOT NULL THEN
    v_new_perms := _tmp_normalize_permissions(v_old_perms);

    IF v_new_perms IS DISTINCT FROM v_old_perms THEN
      UPDATE roles
      SET permissions = v_new_perms, updated_at = now()
      WHERE lower(code) = 'bto_station_manager'
        AND deleted_at IS NULL;
      RAISE NOTICE 'bto_station_manager: permissions нормализованы';
    ELSE
      RAISE NOTICE 'bto_station_manager: permissions уже в объектном формате';
    END IF;
  ELSE
    RAISE NOTICE 'Роль bto_station_manager не найдена — пропускаем';
  END IF;
END $$;

-- Удаляем временную функцию
DROP FUNCTION IF EXISTS _tmp_normalize_permissions(JSONB);

-- ============================================================================
-- 3. Заполнение пустых scope_value у пользователей с ролью bto_manager
--    Дефолтные точки: cbb4029e-757b-41a2-a770-e619f1bf74e9, 73ccc1c3-dc69-4684-8c21-18a1fcec967c
-- ============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_updated INT;
  v_default_scope TEXT := '["cbb4029e-757b-41a2-a770-e619f1bf74e9","73ccc1c3-dc69-4684-8c21-18a1fcec967c"]';
BEGIN
  -- Находим ID роли bto_manager
  SELECT id INTO v_role_id
  FROM roles
  WHERE lower(code) = 'bto_manager'
    AND deleted_at IS NULL;

  IF v_role_id IS NULL THEN
    RAISE NOTICE 'Роль bto_manager не найдена — пропускаем заполнение scope_value';
    RETURN;
  END IF;

  -- Обновляем записи user_roles с пустым scope_value
  UPDATE user_roles
  SET scope_value = v_default_scope
  WHERE role_id = v_role_id
    AND (scope_value IS NULL OR scope_value = '')
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE NOTICE 'Обновлено % назначений bto_manager с пустым scope_value', v_updated;
  ELSE
    RAISE NOTICE 'Нет назначений bto_manager с пустым scope_value — пропускаем';
  END IF;
END $$;
