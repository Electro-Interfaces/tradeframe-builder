/**
 * Создание таблиц для системы инструкций в Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createInstructionTables() {
  console.log('🔧 Создание таблиц для инструкций...');

  try {
    // 1. Создаем таблицу тем инструкций
    console.log('📋 Создание таблицы instruction_topics...');
    const { error: topicsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS instruction_topics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(255) UNIQUE NOT NULL,
          route VARCHAR(500) NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          views_total INTEGER DEFAULT 0
        );
        
        -- Индексы
        CREATE INDEX IF NOT EXISTS idx_instruction_topics_key ON instruction_topics(key);
        CREATE INDEX IF NOT EXISTS idx_instruction_topics_route ON instruction_topics(route);
        CREATE INDEX IF NOT EXISTS idx_instruction_topics_active ON instruction_topics(is_active);
      `
    });

    if (topicsError) {
      console.error('❌ Ошибка создания instruction_topics:', topicsError);
      return;
    }

    // 2. Создаем таблицу версий инструкций
    console.log('📄 Создание таблицы instruction_versions...');
    const { error: versionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS instruction_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_id UUID NOT NULL REFERENCES instruction_topics(id) ON DELETE CASCADE,
          version INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
          locale VARCHAR(5) DEFAULT 'ru',
          title VARCHAR(500) NOT NULL,
          content_md TEXT NOT NULL,
          content_html TEXT NOT NULL,
          changelog TEXT,
          editor_id UUID,
          editor_name VARCHAR(255),
          published_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          views_count INTEGER DEFAULT 0,
          
          -- Уникальность версии для темы и локали
          UNIQUE(topic_id, version, locale)
        );
        
        -- Индексы
        CREATE INDEX IF NOT EXISTS idx_instruction_versions_topic ON instruction_versions(topic_id);
        CREATE INDEX IF NOT EXISTS idx_instruction_versions_status ON instruction_versions(status);
        CREATE INDEX IF NOT EXISTS idx_instruction_versions_locale ON instruction_versions(locale);
        CREATE INDEX IF NOT EXISTS idx_instruction_versions_published ON instruction_versions(published_at);
      `
    });

    if (versionsError) {
      console.error('❌ Ошибка создания instruction_versions:', versionsError);
      return;
    }

    // 3. Создаем таблицу просмотров инструкций
    console.log('👁️ Создание таблицы instruction_views...');
    const { error: viewsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS instruction_views (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_id UUID NOT NULL REFERENCES instruction_topics(id) ON DELETE CASCADE,
          version_id UUID NOT NULL REFERENCES instruction_versions(id) ON DELETE CASCADE,
          user_id UUID,
          session_id VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          duration_seconds INTEGER DEFAULT 0
        );
        
        -- Индексы для аналитики
        CREATE INDEX IF NOT EXISTS idx_instruction_views_topic ON instruction_views(topic_id);
        CREATE INDEX IF NOT EXISTS idx_instruction_views_version ON instruction_views(version_id);
        CREATE INDEX IF NOT EXISTS idx_instruction_views_user ON instruction_views(user_id);
        CREATE INDEX IF NOT EXISTS idx_instruction_views_date ON instruction_views(viewed_at);
      `
    });

    if (viewsError) {
      console.error('❌ Ошибка создания instruction_views:', viewsError);
      return;
    }

    console.log('✅ Все таблицы инструкций созданы успешно!');

    // 4. Добавляем демо-данные
    console.log('📝 Добавление демо-данных...');
    
    // Создаем несколько тем
    const demoTopics = [
      {
        key: 'admin.instructions',
        route: '/admin/instructions',
        title: 'Управление инструкциями',
        description: 'Как создавать, редактировать и управлять инструкциями в системе'
      },
      {
        key: 'admin.networks', 
        route: '/admin/networks',
        title: 'Управление сетями',
        description: 'Настройка торговых сетей и точек'
      },
      {
        key: 'settings.data-exchange',
        route: '/settings/data-exchange', 
        title: 'Обмен данными',
        description: 'Настройка подключений к базам данных и внешним API'
      }
    ];

    for (const topic of demoTopics) {
      const { data: topicData, error: insertError } = await supabase
        .from('instruction_topics')
        .insert(topic)
        .select()
        .single();

      if (insertError) {
        console.error(`❌ Ошибка вставки темы ${topic.key}:`, insertError);
        continue;
      }

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

Эта страница позволяет вам:

1. **Просматривать** существующие элементы
2. **Создавать** новые записи
3. **Редактировать** существующие данные
4. **Удалять** ненужные элементы

## Начало работы

> Для начала работы выберите нужное действие из панели инструментов

### Создание нового элемента

\`\`\`
1. Нажмите кнопку "Добавить"
2. Заполните обязательные поля
3. Сохраните изменения
\`\`\`

**Важно:** Убедитесь, что все обязательные поля заполнены корректно.

---

*Эта инструкция автоматически сгенерирована системой.*`,
        content_html: '', // Будет заполнено автоматически
        changelog: 'Первоначальная версия инструкции',
        editor_name: 'Система',
        published_at: new Date().toISOString()
      };

      // Конвертируем Markdown в HTML (упрощенно)
      demoVersion.content_html = demoVersion.content_md
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/^---$/gm, '<hr>')
        .replace(/\n/g, '<br>');

      const { error: versionError } = await supabase
        .from('instruction_versions')
        .insert(demoVersion);

      if (versionError) {
        console.error(`❌ Ошибка вставки версии для ${topic.key}:`, versionError);
      } else {
        console.log(`✅ Создана инструкция: ${topic.title}`);
      }
    }

    console.log('🎉 Демо-данные добавлены успешно!');

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запускаем создание таблиц
createInstructionTables().then(() => {
  console.log('🏁 Скрипт завершен');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});