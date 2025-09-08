-- Добавление поля type к таблице networks
ALTER TABLE networks 
ADD COLUMN type VARCHAR(50) DEFAULT 'АЗС';

-- Обновим существующие записи
UPDATE networks SET type = 'АЗС' WHERE type IS NULL;