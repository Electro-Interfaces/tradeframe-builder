-- Список email-получателей для рассылки приказов корректировки остатков.
-- На каждую сеть — одна запись со списком адресов (TO + CC) и адресом отправителя.
-- Управляется администратором (на старте — через psql; UI — следующая итерация).

CREATE TABLE IF NOT EXISTS inventory_adjustment_email_recipients (
  network_id UUID PRIMARY KEY REFERENCES networks(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL CHECK (cardinality(recipients) > 0),
  cc TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  from_address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_inv_adj_recipients_set_updated_at ON inventory_adjustment_email_recipients;
CREATE TRIGGER trg_inv_adj_recipients_set_updated_at
BEFORE UPDATE ON inventory_adjustment_email_recipients
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE inventory_adjustment_email_recipients IS
  'Email-получатели приказа корректировки остатков по сети. recipients — основной список, cc — копия. from_address — адрес отправителя (если NULL, используется SMTP_FROM из server/.env).';
