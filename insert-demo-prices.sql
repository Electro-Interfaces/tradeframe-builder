-- Вставка демо-цен для существующих АЗС
-- Выполнить после создания таблицы prices

INSERT INTO prices (trading_point_id, fuel_type_id, price_net, vat_rate, price_gross, source, reason, created_by) 
SELECT 
    tp.id as trading_point_id,
    ft.id as fuel_type_id,
    
    -- Базовые цены с модификаторами по АЗС
    CASE 
        WHEN tp.name LIKE '%Центральная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 5300
                WHEN ft.code = 'AI92' THEN 5000  
                WHEN ft.code = 'DT_SUMMER' THEN 5200
                WHEN ft.code = 'PROPANE' THEN 2800
                ELSE 5100
            END
        WHEN tp.name LIKE '%Северная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 5194  -- 98% от базовой
                WHEN ft.code = 'AI92' THEN 4900
                WHEN ft.code = 'DT_SUMMER' THEN 5096
                WHEN ft.code = 'PROPANE' THEN 2744
                ELSE 4998
            END
        WHEN tp.name LIKE '%Южная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 5406  -- 102% от базовой
                WHEN ft.code = 'AI92' THEN 5100
                WHEN ft.code = 'DT_SUMMER' THEN 5304
                WHEN ft.code = 'PROPANE' THEN 2856
                ELSE 5202
            END
        WHEN tp.name LIKE '%Промзона%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 5035  -- 95% от базовой
                WHEN ft.code = 'AI92' THEN 4750
                WHEN ft.code = 'DT_SUMMER' THEN 4940
                WHEN ft.code = 'PROPANE' THEN 2660
                ELSE 4845
            END
        WHEN tp.name LIKE '%Окружная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 5565  -- 105% от базовой
                WHEN ft.code = 'AI92' THEN 5250
                WHEN ft.code = 'DT_SUMMER' THEN 5460
                WHEN ft.code = 'PROPANE' THEN 2940
                ELSE 5355
            END
        ELSE 5100
    END as price_net,
    
    20.00 as vat_rate,
    
    -- Цена с НДС (+20%)
    CASE 
        WHEN tp.name LIKE '%Центральная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 6360
                WHEN ft.code = 'AI92' THEN 6000  
                WHEN ft.code = 'DT_SUMMER' THEN 6240
                WHEN ft.code = 'PROPANE' THEN 3360
                ELSE 6120
            END
        WHEN tp.name LIKE '%Северная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 6233
                WHEN ft.code = 'AI92' THEN 5880
                WHEN ft.code = 'DT_SUMMER' THEN 6115
                WHEN ft.code = 'PROPANE' THEN 3293
                ELSE 5998
            END
        WHEN tp.name LIKE '%Южная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 6487
                WHEN ft.code = 'AI92' THEN 6120
                WHEN ft.code = 'DT_SUMMER' THEN 6365
                WHEN ft.code = 'PROPANE' THEN 3427
                ELSE 6242
            END
        WHEN tp.name LIKE '%Промзона%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 6042
                WHEN ft.code = 'AI92' THEN 5700
                WHEN ft.code = 'DT_SUMMER' THEN 5928
                WHEN ft.code = 'PROPANE' THEN 3192
                ELSE 5814
            END
        WHEN tp.name LIKE '%Окружная%' THEN
            CASE 
                WHEN ft.code = 'AI95' THEN 6678
                WHEN ft.code = 'AI92' THEN 6300
                WHEN ft.code = 'DT_SUMMER' THEN 6552
                WHEN ft.code = 'PROPANE' THEN 3528
                ELSE 6426
            END
        ELSE 6120
    END as price_gross,
    
    'manual' as source,
    'Демо-цена на ' || ft.name || ' для ' || tp.name as reason,
    'demo-user' as created_by
FROM 
    -- Берем АЗС из демо сети
    (SELECT id, name FROM trading_points 
     WHERE network_id = 'f5f5961a-4ae0-409f-b4ba-1f630a329434' 
     ORDER BY name) tp
CROSS JOIN 
    -- Берем первые 4 активных вида топлива
    (SELECT id, name, code FROM fuel_types 
     WHERE is_active = true 
     ORDER BY name 
     LIMIT 4) ft
ON CONFLICT DO NOTHING;