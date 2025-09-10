-- Создание пользователя МенеджерБТО
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    role,
    network_id,
    trading_point_ids,
    is_active
) VALUES (
    'aa0e8400-e29b-41d4-a716-446655440005',
    'bto.manager@tradeframe.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeShMKjGEeILVSHFK', -- admin123
    'Менеджер БТО',
    'bto_manager',
    'b5e25b51-a950-481e-a09d-ac25e6b5d6ab', -- ID сети БТО
    '[]'::jsonb,
    true
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    network_id = EXCLUDED.network_id,
    updated_at = NOW();