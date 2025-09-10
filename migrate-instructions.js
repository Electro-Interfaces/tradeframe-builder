/**
 * Скрипт для прямой миграции инструкций из localStorage в Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Конфигурация Supabase
const supabaseUrl = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Mock данные (берем из instructionsService.ts)
const mockTopics = [
  {
    id: 'topic_1',
    key: 'dashboard',
    route: '/dashboard',
    title: 'Главная панель',
    description: 'Обзор основных показателей системы',
    is_active: true,
    views_total: 156,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T16:20:00Z'
  },
  {
    id: 'topic_2',
    key: 'users',
    route: '/admin/users',
    title: 'Управление пользователями',
    description: 'Создание, редактирование и управление пользователями системы',
    is_active: true,
    views_total: 89,
    created_at: '2024-01-16T11:30:00Z',
    updated_at: '2024-01-25T09:15:00Z'
  },
  {
    id: 'topic_3',
    key: 'roles',
    route: '/admin/roles',
    title: 'Управление ролями',
    description: 'Настройка ролей и прав доступа пользователей',
    is_active: true,
    views_total: 67,
    created_at: '2024-01-17T14:45:00Z',
    updated_at: '2024-01-26T12:30:00Z'
  }
];

const mockVersions = [
  {
    id: 'version_1',
    topic_id: 'topic_1',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Главная панель - руководство пользователя',
    content_md: `## Назначение страницы

Главная панель предоставляет общий обзор всех ключевых показателей и метрик вашей системы управления торговыми операциями. Здесь вы можете быстро оценить текущее состояние бизнеса и принять оперативные решения.

### Основные разделы

**Сводка по операциям**
- Общее количество активных операций
- Объем торгов за текущий период  
- Средняя прибыльность сделок
- Количество успешных и убыточных операций

**Мониторинг рисков**
- Текущий уровень риска портфеля
- Максимальная просадка
- Коэффициент Шарпа
- Распределение рисков по инструментам

**Финансовые показатели**
- Общий баланс счета
- Доступные средства для торгов
- Заблокированные средства в позициях
- P&L за период (день/неделя/месяц)`,
    content_html: '',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T16:20:00Z'
  },
  {
    id: 'version_2',
    topic_id: 'topic_2',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Управление пользователями - полное руководство',
    content_md: `## Управление пользователями системы

Раздел управления пользователями позволяет администраторам полностью контролировать доступ к системе и настраивать права пользователей.

### Создание нового пользователя

1. **Переход к форме создания**
   - Нажмите кнопку "Добавить пользователя" 
   - Откроется модальное окно с формой

2. **Заполнение основной информации**
   - \`Имя пользователя\` - уникальный логин для входа
   - \`Электронная почта\` - для уведомлений и восстановления пароля
   - \`Полное имя\` - отображаемое имя в интерфейсе
   - \`Телефон\` - контактный номер (опционально)

3. **Настройка доступа**
   - \`Роль\` - выберите подходящую роль из списка
   - \`Статус\` - активный/неактивный пользователь
   - \`Временный пароль\` - будет отправлен на email`,
    content_html: '',
    created_at: '2024-01-16T11:30:00Z',
    updated_at: '2024-01-25T09:15:00Z'
  },
  {
    id: 'version_3',
    topic_id: 'topic_3',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Управление ролями и правами доступа',
    content_md: `## Система ролей и прав

Раздел управления ролями позволяет гибко настраивать права доступа пользователей к различным функциям системы.

### Типы ролей

**Администратор**
- Полный доступ ко всем функциям системы
- Управление пользователями и ролями
- Доступ к системным настройкам
- Просмотр логов и аудита

**Трейдер**
- Выполнение торговых операций
- Просмотр своих позиций и истории
- Доступ к аналитике по своим сделкам
- Настройка личных уведомлений

**Аналитик**  
- Просмотр всех торговых данных
- Создание отчетов и аналитики
- Доступ к историческим данным
- Экспорт данных в различных форматах`,
    content_html: '',
    created_at: '2024-01-17T14:45:00Z',
    updated_at: '2024-01-26T12:30:00Z'
  }
];

// Функция конвертации данных для Supabase
function convertTopicForDatabase(topic) {
  return {
    id: randomUUID(),
    tenant_id: '00000000-0000-0000-0000-000000000001', // Стандартный tenant
    route: topic.route,
    title: topic.title,
    content: topic.description,
    content_type: 'markdown',
    help_type: 'modal',
    is_active: topic.is_active,
    sort_order: 0,
    created_at: new Date(topic.created_at).toISOString(),
    updated_at: new Date(topic.updated_at).toISOString()
  };
}

function convertVersionForDatabase(version) {
  return {
    id: randomUUID(),
    tenant_id: '00000000-0000-0000-0000-000000000001',
    route: `/instructions/${version.topic_id}`,
    title: version.title,
    content: version.content_md,
    content_type: 'markdown',
    help_type: 'sidebar',
    is_active: version.status === 'published',
    sort_order: version.version,
    created_at: new Date(version.created_at).toISOString(),
    updated_at: new Date(version.updated_at).toISOString()
  };
}

async function migrateInstructions() {
  try {
    console.log('🚀 Начинаем миграцию инструкций...');
    
    // Подготавливаем данные для вставки
    const topicsForDB = mockTopics.map(convertTopicForDatabase);
    const versionsForDB = mockVersions.map(convertVersionForDatabase);
    
    console.log(`📊 Подготовлено ${topicsForDB.length} тем и ${versionsForDB.length} версий`);
    
    // Вставляем темы
    console.log('📝 Вставляем темы...');
    const { data: topicsData, error: topicsError } = await supabase
      .from('page_help')
      .upsert(topicsForDB, { onConflict: 'id' });
    
    if (topicsError) {
      console.error('❌ Ошибка при вставке тем:', topicsError);
      throw topicsError;
    }
    
    console.log('✅ Темы успешно вставлены');
    
    // Вставляем версии
    console.log('📖 Вставляем версии...');
    const { data: versionsData, error: versionsError } = await supabase
      .from('page_help')
      .upsert(versionsForDB, { onConflict: 'id' });
    
    if (versionsError) {
      console.error('❌ Ошибка при вставке версий:', versionsError);
      throw versionsError;
    }
    
    console.log('✅ Версии успешно вставлены');
    
    // Проверяем результат
    const { data: finalData, error: checkError, count } = await supabase
      .from('page_help')
      .select('*', { count: 'exact' });
    
    if (checkError) {
      console.error('❌ Ошибка при проверке:', checkError);
      throw checkError;
    }
    
    console.log(`🎉 Миграция завершена! В базе данных ${count} записей`);
    console.log('📋 Примеры записей:');
    finalData.slice(0, 3).forEach(item => {
      console.log(`  - ${item.title} (${item.route})`);
    });
    
  } catch (error) {
    console.error('💥 Критическая ошибка миграции:', error);
    process.exit(1);
  }
}

// Запуск миграции
migrateInstructions();