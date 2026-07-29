-- Поиск транзакции погашения купона по его номеру: у оплаты «Купон» в поле card
-- лежит номер купона. Без индекса LATERAL-подзапрос на страницу купонов делает
-- seq scan на каждый купон (11 с на 217 купонов) — с индексом 70 мс.
CREATE INDEX IF NOT EXISTS idx_sts_tx_coupon_card
  ON sts_transactions (card)
  WHERE payment_method = 'Купон';
