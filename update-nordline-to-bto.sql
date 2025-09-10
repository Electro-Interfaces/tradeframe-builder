-- Обновление названия сети с "Норд Лайн" на "БТО"
-- Выполнить в Supabase SQL Editor

-- Обновляем основную сеть
UPDATE public.networks 
SET 
    name = 'БТО',
    description = REPLACE(description, 'Норд Лайн', 'БТО'),
    code = REPLACE(code, 'nord_line', 'bto')
WHERE name = 'Норд Лайн' OR name ILIKE '%норд лайн%';

-- Обновляем описания торговых точек, если они ссылаются на "Норд Лайн"
UPDATE public.trading_points 
SET 
    name = REPLACE(name, 'Норд Лайн', 'БТО'),
    description = REPLACE(description, 'Норд Лайн', 'БТО'),
    address = REPLACE(address, 'Норд Лайн', 'БТО')
WHERE name ILIKE '%норд лайн%' 
   OR description ILIKE '%норд лайн%'
   OR address ILIKE '%норд лайн%';

-- Обновляем пользователей с email @nordline.ru на @bto.ru
UPDATE public.profiles 
SET email = REPLACE(email, '@nordline.ru', '@bto.ru')
WHERE email ILIKE '%@nordline.ru';

-- Обновляем контакты торговых точек
UPDATE public.trading_points 
SET 
    phone = REPLACE(phone, 'nordline', 'bto'),
    email = REPLACE(email, '@nordline.ru', '@bto.ru')
WHERE phone ILIKE '%nordline%' 
   OR email ILIKE '%@nordline.ru';

-- Проверяем результаты
SELECT 
    'Обновленные сети:' as info,
    id,
    name,
    code,
    description,
    external_id
FROM public.networks 
WHERE name = 'БТО' OR code = 'bto';

SELECT 
    'Обновленные торговые точки:' as info,
    COUNT(*) as count
FROM public.trading_points 
WHERE name ILIKE '%бто%' 
   OR description ILIKE '%бто%';

SELECT 
    'Обновленные пользователи:' as info,
    COUNT(*) as count
FROM public.profiles 
WHERE email ILIKE '%@bto.ru';

SELECT 'Обновление завершено!' as result;