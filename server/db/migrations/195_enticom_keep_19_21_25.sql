-- Сеть «Энтиком» (STS system=29): в списке остаются только АЗС №19, №21, №25.
-- Остальные 14 точек, заведённые миграцией 193 из /v1/points, убираем так же,
-- как кнопка удаления в приложении (orgPgSource.deleteTradingPoint): мягко,
-- через deleted_at. Синк по ним останавливается; при повторном добавлении
-- точки с тем же кодом через UI она восстанавливается.
-- Транзакции №10 (до 28.09) в sts_transactions остаются — история продаж сети.

UPDATE trading_points tp
   SET is_active = false,
       is_blocked = true,
       deleted_at = COALESCE(tp.deleted_at, now()),
       updated_at = now()
  FROM networks n
 WHERE n.id = tp.network_id
   AND n.external_id = '29'
   AND n.deleted_at IS NULL
   AND tp.deleted_at IS NULL
   AND tp.external_id NOT IN ('19', '21', '25');
