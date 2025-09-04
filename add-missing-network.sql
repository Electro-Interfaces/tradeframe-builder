-- Добавление недостающей торговой сети с external_id = "2"
-- Выполнить в Supabase SQL Editor

-- Добавляем сеть с external_id = "2" если её нет
INSERT INTO public.networks (name, code, external_id, status, description, settings)
SELECT 
    'Норд Лайн Москва',
    'NORDLINE_MSK', 
    '2',
    'active',
    'Московское отделение сети Норд Лайн',
    '{}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.networks WHERE external_id = '2'
);

-- Проверяем результат
SELECT 
    id,
    name,
    external_id,
    status
FROM public.networks 
WHERE external_id IN ('1', '2', '15')
ORDER BY external_id;

-- Выводим итог
SELECT 'Торговая сеть с external_id = 2 добавлена!' as result;