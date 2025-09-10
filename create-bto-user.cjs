// Скрипт для создания пользователя МенеджерБТО в Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createBTOManager() {
    console.log('🔧 Создаем пользователя МенеджерБТО...');

    try {
        // Сначала получаем ID сети БТО
        console.log('🌐 Получаем ID сети БТО...');
        const { data: networks, error: networksError } = await supabase
            .from('networks')
            .select('*')
            .or('external_id.eq.15,name.ilike.%бто%');
            
        if (networksError) {
            console.error('❌ Ошибка получения сетей:', networksError);
            return;
        }

        console.log('📊 Найденные сети:', networks);
        const btoNetwork = networks.find(n => n.external_id === "15" || n.name.toLowerCase().includes('бто'));
        
        if (!btoNetwork) {
            console.error('❌ Сеть БТО не найдена!');
            return;
        }

        console.log('✅ Сеть БТО найдена:', btoNetwork);

        // Создаем пользователя
        const newUser = {
            id: 'aa0e8400-e29b-41d4-a716-446655440005',
            email: 'bto.manager@tradeframe.com',
            password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeShMKjGEeILVSHFK', // admin123
            name: 'Менеджер БТО',
            role: 'bto_manager',
            network_id: btoNetwork.id,
            trading_point_ids: [],
            is_active: true,
            phone: null,
            position: null,
            telegram_notifications_enabled: true
        };

        console.log('👤 Создаем пользователя:', newUser);

        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();

        if (userError) {
            if (userError.code === '23505') {
                console.log('⚠️ Пользователь уже существует, обновляем...');
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        name: 'Менеджер БТО',
                        role: 'bto_manager',
                        network_id: btoNetwork.id,
                        is_active: true
                    })
                    .eq('email', 'bto.manager@tradeframe.com')
                    .select()
                    .single();

                if (updateError) {
                    console.error('❌ Ошибка обновления пользователя:', updateError);
                    return;
                }

                console.log('✅ Пользователь обновлен:', updatedUser);
            } else {
                console.error('❌ Ошибка создания пользователя:', userError);
                return;
            }
        } else {
            console.log('✅ Пользователь создан:', user);
        }

        // Проверяем результат
        const { data: checkUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'bto.manager@tradeframe.com')
            .single();

        if (checkError) {
            console.error('❌ Ошибка проверки пользователя:', checkError);
            return;
        }

        console.log('🎯 ПОЛЬЗОВАТЕЛЬ МЕНЕДЖЕРБТО УСПЕШНО СОЗДАН:');
        console.log('📧 Email:', checkUser.email);
        console.log('📛 Имя:', checkUser.name);
        console.log('🔑 Роль:', checkUser.role);
        console.log('🌐 Сеть ID:', checkUser.network_id);
        console.log('✅ Статус:', checkUser.is_active ? 'Активен' : 'Неактивен');
        console.log('🔐 Пароль: admin123');

    } catch (error) {
        console.error('❌ Общая ошибка:', error);
    }
}

// Запускаем создание пользователя
createBTOManager().then(() => {
    console.log('🏁 Скрипт завершен');
    process.exit(0);
}).catch(error => {
    console.error('💥 Фатальная ошибка:', error);
    process.exit(1);
});