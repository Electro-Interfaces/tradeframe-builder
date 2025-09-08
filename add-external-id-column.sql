-- Добавление поля external_id к таблице networks
-- Это поле необходимо для синхронизации с торговым API

ALTER TABLE networks 
ADD COLUMN external_id VARCHAR(50);

-- Добавляем индекс для быстрого поиска
CREATE INDEX idx_networks_external_id ON networks(external_id);

-- Комментарий для документации
COMMENT ON COLUMN networks.external_id IS 'ID для синхронизации с внешним торговым API';

-- Также добавим поле type, которое используется в коде, но отсутствует в схеме
ALTER TABLE networks 
ADD COLUMN type VARCHAR(50) DEFAULT 'АЗС';

-- Индекс для типа сети
CREATE INDEX idx_networks_type ON networks(type);

-- Комментарий
COMMENT ON COLUMN networks.type IS 'Тип торговой сети: АЗС, АГЗС, Мойка, Прочее';