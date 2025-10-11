/**
 * Скрипт инициализации типов правовых документов в Supabase
 * Запуск: node tools/init-legal-docs.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL или VITE_SUPABASE_SERVICE_ROLE_KEY не указаны в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const documentTypes = [
  {
    code: 'tos',
    title: 'Пользовательское соглашение',
    description: 'Terms of Service - условия использования сервиса',
    is_active: true
  },
  {
    code: 'privacy',
    title: 'Политика конфиденциальности',
    description: 'Privacy Policy - правила обработки персональных данных',
    is_active: true
  },
  {
    code: 'pdn',
    title: 'Политика защиты персональных данных',
    description: 'Положение о защите персональных данных (ПДн)',
    is_active: true
  }
];

async function initDocumentTypes() {
  console.log('🚀 Инициализация типов правовых документов...\n');

  try {
    // Проверяем существующие типы
    const { data: existing, error: fetchError } = await supabase
      .from('document_types')
      .select('code');

    if (fetchError) {
      console.error('❌ Ошибка при получении существующих типов:', fetchError);
      throw fetchError;
    }

    const existingCodes = existing?.map(t => t.code) || [];
    console.log('📋 Существующие типы:', existingCodes.length > 0 ? existingCodes.join(', ') : 'нет');

    // Вставляем/обновляем каждый тип
    for (const docType of documentTypes) {
      const exists = existingCodes.includes(docType.code);

      if (exists) {
        // Обновляем существующий
        const { error } = await supabase
          .from('document_types')
          .update({
            title: docType.title,
            description: docType.description,
            is_active: docType.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('code', docType.code);

        if (error) {
          console.error(`❌ Ошибка обновления ${docType.code}:`, error);
        } else {
          console.log(`✅ Обновлён: ${docType.code} - ${docType.title}`);
        }
      } else {
        // Создаём новый
        const { error } = await supabase
          .from('document_types')
          .insert({
            code: docType.code,
            title: docType.title,
            description: docType.description,
            is_active: docType.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error(`❌ Ошибка создания ${docType.code}:`, error);
        } else {
          console.log(`✅ Создан: ${docType.code} - ${docType.title}`);
        }
      }
    }

    // Проверяем результат
    console.log('\n📊 Проверка результатов...');
    const { data: final, error: finalError } = await supabase
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (finalError) {
      console.error('❌ Ошибка при проверке:', finalError);
    } else {
      console.log(`\n✅ Всего активных типов документов: ${final?.length || 0}`);
      final?.forEach(type => {
        console.log(`   - ${type.code}: ${type.title}`);
      });
    }

    console.log('\n✨ Инициализация завершена!');

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск
initDocumentTypes();
