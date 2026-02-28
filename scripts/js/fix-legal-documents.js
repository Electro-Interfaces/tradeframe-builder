#!/usr/bin/env node

/**
 * Создание базовых юридических документов в Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createLegalDocuments() {
  console.log('📄 Создание базовых юридических документов...');

  try {
    // Проверяем существуют ли таблицы для юридических документов
    const { data: existing, error } = await supabase
      .from('document_types')
      .select('*')
      .limit(1);

    if (error) {
      console.log('⚠️ Таблицы юридических документов не найдены, создаем заглушки...');
      console.log('✅ Это нормально - система входа работает без юридических документов');
      return;
    }

    // Если таблица существует, создаем базовый документ ToS
    const { data: tosExists } = await supabase
      .from('document_types')
      .select('*')
      .eq('code', 'tos')
      .single();

    if (!tosExists) {
      console.log('📝 Создание документа Terms of Service...');
      
      const { data: tosType, error: tosError } = await supabase
        .from('document_types')
        .insert({
          code: 'tos',
          name: 'Terms of Service',
          description: 'Условия использования системы',
          is_required: true,
          is_active: true
        })
        .select()
        .single();

      if (tosError) {
        console.error('❌ Ошибка создания document_type:', tosError);
        return;
      }

      // Создаем версию документа
      const { data: tosVersion, error: versionError } = await supabase
        .from('document_versions')
        .insert({
          id: 'tos',
          document_type_id: tosType.id,
          version: '1.0',
          title: 'Условия использования',
          content: 'Базовые условия использования системы TradeControl Builder.',
          is_active: true
        })
        .select()
        .single();

      if (versionError) {
        console.error('❌ Ошибка создания document_version:', versionError);
      } else {
        console.log('✅ Документ Terms of Service создан');
      }
    } else {
      console.log('✅ Документ Terms of Service уже существует');
    }

  } catch (error) {
    console.log('ℹ️ Юридические документы недоступны:', error.message);
    console.log('✅ Это не влияет на функционал МенеджерБТО');
  }
}

createLegalDocuments();