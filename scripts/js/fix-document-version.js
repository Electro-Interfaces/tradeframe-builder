#!/usr/bin/env node

/**
 * Исправление проблемы с document_versions
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixDocumentVersion() {
  console.log('🔍 Проверка document_versions...');

  try {
    // Проверяем существующие document_versions
    const { data: versions, error: versionsError } = await supabase
      .from('document_versions')
      .select('*');

    if (versionsError) {
      console.log('❌ Ошибка доступа к document_versions:', versionsError);
      return;
    }

    console.log('📋 Найдено документов:', versions?.length || 0);
    versions?.forEach(v => {
      console.log(`   • ${v.id}: ${v.title || v.document_type_id}`);
    });

    // Проверяем конкретно документ с ID 'tos'
    const { data: tosDoc, error: tosError } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', 'tos')
      .single();

    if (tosError) {
      console.log('❌ Документ с ID "tos" не найден:', tosError);
      
      // Попробуем создать документ
      console.log('📝 Создание документа tos...');
      
      const { data: newDoc, error: createError } = await supabase
        .from('document_versions')
        .insert({
          id: 'tos',
          title: 'Terms of Service',
          content: 'Базовые условия использования TradeControl Builder',
          version: '1.0',
          is_active: true,
          document_type_id: null // Может быть null, если нет связи с document_types
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Не удалось создать документ:', createError);
        
        // Попробуем другой подход - создать без указания id
        const { data: newDoc2, error: createError2 } = await supabase
          .from('document_versions')
          .insert({
            title: 'Terms of Service',
            content: 'Базовые условия использования TradeControl Builder',
            version: '1.0',
            is_active: true
          })
          .select()
          .single();

        if (createError2) {
          console.log('❌ Не удалось создать документ (способ 2):', createError2);
        } else {
          console.log('✅ Документ создан с автоматическим ID:', newDoc2.id);
          
          // Нужно обновить код приложения чтобы использовать этот ID
          console.log('⚠️ Нужно обновить код чтобы использовать ID:', newDoc2.id);
        }
      } else {
        console.log('✅ Документ tos создан успешно:', newDoc);
      }
      
    } else {
      console.log('✅ Документ tos найден:', tosDoc.title);
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

fixDocumentVersion();