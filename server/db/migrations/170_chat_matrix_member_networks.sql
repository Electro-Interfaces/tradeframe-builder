-- Справочник сотрудников компании для клиентских чатов берётся не из тех, кто уже зашёл в чат,
-- а из сотрудников TradeFrame с доступом к сетям компании. Для ГИГ это сети ГИГ + БТО
-- (одни и те же лица). member_network_ids — набор сетей, чьи сотрудники = справочник компании.
ALTER TABLE chat_matrix_companies ADD COLUMN IF NOT EXISTS member_network_ids JSONB;

UPDATE chat_matrix_companies
SET member_network_ids = (SELECT jsonb_agg(id) FROM networks WHERE external_id = '15' OR code = 'bto')
WHERE network_id = (SELECT id FROM networks WHERE external_id = '15');
