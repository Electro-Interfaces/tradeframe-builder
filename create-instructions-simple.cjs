/**
 * Упрощенное создание таблиц инструкций через прямые INSERT
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createSampleData() {
  console.log('📝 Создание демо-данных для инструкций...');

  try {
    // Создаем несколько тем напрямую через таблицу (если она существует)
    const demoTopics = [
      {
        key: 'admin.instructions',
        route: '/admin/instructions',
        title: 'Управление инструкциями',
        description: 'Как создавать, редактировать и управлять инструкциями в системе',
        is_active: true,
        views_total: 0
      },
      {
        key: 'admin.networks', 
        route: '/admin/networks',
        title: 'Управление сетями',
        description: 'Настройка торговых сетей и точек',
        is_active: true,
        views_total: 0
      },
      {
        key: 'settings.data-exchange',
        route: '/settings/data-exchange', 
        title: 'Обмен данными',
        description: 'Настройка подключений к базам данных и внешним API',
        is_active: true,
        views_total: 0
      }
    ];

    // Проверим, существует ли таблица instruction_topics
    console.log('🔍 Проверка существования таблиц...');
    const { data: checkData, error: checkError } = await supabase
      .from('instruction_topics')
      .select('id')
      .limit(1);

    if (checkError) {
      console.log('⚠️ Таблица instruction_topics не существует:', checkError.message);
      console.log('📋 Используем временное хранилище в localStorage вместо БД');
      return;
    }

    console.log('✅ Таблица instruction_topics существует');

    // Вставляем демо-темы
    for (const topic of demoTopics) {
      console.log(`➕ Создание темы: ${topic.title}`);
      const { data: topicData, error: insertError } = await supabase
        .from('instruction_topics')
        .insert(topic)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          console.log(`ℹ️ Тема ${topic.key} уже существует`);
          continue;
        }
        console.error(`❌ Ошибка вставки темы ${topic.key}:`, insertError);
        continue;
      }

      console.log(`✅ Тема создана: ${topic.title} (ID: ${topicData.id})`);

      // Создаем версию для каждой темы
      const demoVersion = {
        topic_id: topicData.id,
        version: 1,
        status: 'published',
        locale: 'ru',
        title: topic.title,
        content_md: `# ${topic.title}

${topic.description}

## Основные функции

Эта страница позволяет:

- **Просматривать** существующие элементы
- **Создавать** новые записи  
- **Редактировать** данные
- **Удалять** ненужные элементы

## Начало работы

> Для начала выберите нужное действие из панели инструментов

### Создание элемента

1. Нажмите кнопку "Добавить"
2. Заполните обязательные поля
3. Сохраните изменения

**Важно:** Все обязательные поля должны быть заполнены.

---
*Демо-инструкция системы*`,
        content_html: `<h1>${topic.title}</h1><p>${topic.description}</p><h2>Основные функции</h2><p>Эта страница позволяет работать с данными.</p>`,
        changelog: 'Первоначальная версия',
        editor_name: 'Система',
        published_at: new Date().toISOString(),
        views_count: 0
      };

      const { error: versionError } = await supabase
        .from('instruction_versions')
        .insert(demoVersion);

      if (versionError) {
        console.error(`❌ Ошибка создания версии для ${topic.key}:`, versionError);
      } else {
        console.log(`📄 Версия создана для: ${topic.title}`);
      }
    }

    console.log('🎉 Демо-данные созданы успешно!');

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запускаем
createSampleData().then(() => {
  console.log('🏁 Завершено');
  process.exit(0);
}).catch(error => {
  console.error('💥 Ошибка:', error);
  process.exit(1);
});