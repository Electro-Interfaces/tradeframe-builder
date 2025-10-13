-- Обновление сети БТО: оставить только АЗС №4, изменить название
UPDATE tenants
SET
  name = 'БТО',
  settings = jsonb_build_object(
    'region', 'Башкортостан',
    'external_id', '15',
    'description', 'Сеть БТО',
    'stations', jsonb_build_array(
      jsonb_build_object(
        'code', '4',
        'name', 'БТО АЗС №4',
        'active', true,
        'address', 'г. Уфа, ул. Победы, 100'
      )
    )
  ),
  updated_at = NOW()
WHERE code = 'bto';

-- Проверка результата
SELECT
  id,
  name,
  code,
  settings->>'external_id' as external_id,
  jsonb_array_length(settings->'stations') as stations_count,
  settings->'stations' as stations
FROM tenants
WHERE code = 'bto';
