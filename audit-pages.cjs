#!/usr/bin/env node

/**
 * 🔍 ПОЛНЫЙ АУДИТ ГОТОВНОСТИ К SUPABASE МИГРАЦИИ
 * Автоматизированный анализ всех 37 страниц приложения
 */

const fs = require('fs');
const path = require('path');

// Список всех страниц для аудита из App.tsx
const PAGES_TO_AUDIT = [
  // ADMIN РАЗДЕЛ
  { route: '/admin/users-and-roles', component: 'Users', file: 'admin/Users.tsx' },
  { route: '/admin/users-and-roles-new', component: 'NewUsersAndRoles', file: 'admin/UsersAndRoles.tsx' },
  { route: '/admin/users', component: 'AdminUsers', file: 'AdminUsers.tsx' },
  { route: '/admin/roles', component: 'Roles', file: 'admin/Roles.tsx' },
  { route: '/admin/instructions', component: 'Instructions', file: 'admin/Instructions.tsx' },
  { route: '/admin/networks', component: 'NetworksPage', file: 'NetworksPage.tsx' },
  { route: '/admin/audit', component: 'AuditLog', file: 'AuditLog.tsx' },
  { route: '/admin/data-migration', component: 'DataMigration', file: 'DataMigration.tsx' },
  { route: '/admin/test-services', component: 'TestServices', file: 'TestServices.tsx' },
  { route: '/admin/test-simple', component: 'TestServicesSimple', file: 'TestServicesSimple.tsx' },
  { route: '/admin/test-debug', component: 'TestDebug', file: 'TestDebug.tsx' },
  { route: '/admin/data-inspector', component: 'DataInspector', file: 'DataInspector.tsx' },
  { route: '/admin/legal-documents', component: 'LegalDocuments', file: 'LegalDocuments.tsx' },
  { route: '/admin/legal-documents/users-acceptances', component: 'LegalUsersAcceptances', file: 'LegalUsersAcceptances.tsx' },
  { route: '/admin/legal-documents/:docType/edit', component: 'LegalDocumentEditor', file: 'LegalDocumentEditor.tsx' },

  // SETTINGS РАЗДЕЛ
  { route: '/settings/dictionaries/equipment-types', component: 'EquipmentTypes', file: 'EquipmentTypes.tsx' },
  { route: '/settings/dictionaries/component-types', component: 'ComponentTypes', file: 'ComponentTypes.tsx' },
  { route: '/settings/dictionaries/command-templates', component: 'CommandTemplates', file: 'CommandTemplates.tsx' },
  { route: '/settings/templates/command-templates', component: 'NewCommandTemplates', file: 'NewCommandTemplates.tsx' },
  { route: '/settings/connections', component: 'Connections', file: 'Connections.tsx' },
  { route: '/settings/database', component: 'DatabaseSettings', file: 'DatabaseSettings.tsx' },
  { route: '/settings/partial-migration', component: 'PartialMigrationSettings', file: 'PartialMigrationSettings.tsx' },
  { route: '/settings/nomenclature', component: 'Nomenclature', file: 'Nomenclature.tsx' },
  { route: '/settings/workflows', component: 'Workflows', file: 'Workflows.tsx' },

  // NETWORK РАЗДЕЛ
  { route: '/', component: 'NetworkOverview', file: 'NetworkOverview.tsx' },
  { route: '/network/overview', component: 'NetworkOverview', file: 'NetworkOverview.tsx' },
  { route: '/network/sales-analysis', component: 'SalesAnalysisPage', file: 'SalesAnalysisPage.tsx' },
  { route: '/network/operations-transactions', component: 'OperationsTransactionsPageSimple', file: 'OperationsTransactionsPageSimple.tsx' },
  { route: '/network/price-history', component: 'PriceHistoryPage', file: 'PriceHistoryPage.tsx' },
  { route: '/network/fuel-stocks', component: 'FuelStocksPage', file: 'FuelStocksPage.tsx' },
  { route: '/network/equipment-log', component: 'NetworkEquipmentLog', file: 'NetworkEquipmentLog.tsx' },
  { route: '/network/notifications', component: 'NotificationRules', file: 'NotificationRules.tsx' },
  { route: '/network/messages', component: 'Messages', file: 'Messages.tsx' },

  // POINT РАЗДЕЛ
  { route: '/point/prices', component: 'Prices', file: 'Prices.tsx' },
  { route: '/point/tanks', component: 'Tanks', file: 'Tanks.tsx' },
  { route: '/point/shift-reports', component: 'ShiftReports', file: 'ShiftReports.tsx' },
  { route: '/point/equipment', component: 'Equipment', file: 'Equipment.tsx' },

  // ПРОЧИЕ
  { route: '/profile', component: 'Profile', file: 'Profile.tsx' },
];

// Результаты аудита
const auditResults = {
  pages: [],
  summary: {
    total: PAGES_TO_AUDIT.length,
    loadable: 0,
    hasErrors: 0,
    readyForSupabase: 0,
    useMockData: 0,
    useRealAPI: 0
  }
};

/**
 * Анализирует файл страницы и извлекает используемые сервисы
 */
function analyzePageFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        exists: false,
        services: [],
        hasErrors: true,
        error: 'Файл не найден'
      };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const services = [];
    const errors = [];

    // Извлекаем импорты сервисов
    const serviceImports = content.match(/import.*from ['"]@?\/services\/[^'"]+['"]/g) || [];
    serviceImports.forEach(imp => {
      const match = imp.match(/from ['"]@?\/services\/([^'"]+)['"]/);
      if (match) {
        services.push(match[1]);
      }
    });

    // Ищем использование React Query
    const hasReactQuery = content.includes('useQuery') || content.includes('useMutation');

    // Ищем CRUD операции
    const crudPatterns = {
      create: /create|add|post/gi,
      read: /get|fetch|load|find/gi,
      update: /update|edit|put|patch/gi,
      delete: /delete|remove/gi
    };

    const crudOperations = {};
    Object.keys(crudPatterns).forEach(operation => {
      crudOperations[operation] = crudPatterns[operation].test(content);
    });

    // Проверяем на использование mock данных
    const usesMockData = content.includes('mock') || content.includes('Mock') || 
                        content.includes('localStorage') || content.includes('sessionStorage');

    // Проверяем синтаксические ошибки
    const syntaxErrors = [];
    if (content.includes('undefined') && content.includes('...undefined')) {
      syntaxErrors.push('Обнаружены undefined значения');
    }

    return {
      exists: true,
      services,
      hasReactQuery,
      crudOperations,
      usesMockData,
      errors: syntaxErrors,
      hasErrors: syntaxErrors.length > 0,
      linesOfCode: content.split('\n').length
    };

  } catch (error) {
    return {
      exists: false,
      services: [],
      hasErrors: true,
      error: error.message
    };
  }
}

/**
 * Оценивает готовность страницы к миграции на Supabase
 */
function evaluateSupabaseReadiness(pageAnalysis) {
  let score = 0;
  let complexity = 'низкая';
  let timeEstimate = '1-2 часа';

  // Факторы готовности
  if (pageAnalysis.exists) score += 20;
  if (!pageAnalysis.hasErrors) score += 20;
  if (pageAnalysis.hasReactQuery) score += 15;
  if (pageAnalysis.usesMockData) score += 10; // Mock данные легче мигрировать
  
  // CRUD операции влияют на сложность
  const crudCount = Object.values(pageAnalysis.crudOperations).filter(Boolean).length;
  if (crudCount === 0) {
    score += 20;
    complexity = 'низкая';
    timeEstimate = '30 мин - 1 час';
  } else if (crudCount <= 2) {
    score += 15;
    complexity = 'средняя';
    timeEstimate = '2-4 часа';
  } else {
    score += 5;
    complexity = 'высокая';
    timeEstimate = '1-2 дня';
  }

  // Количество сервисов
  if (pageAnalysis.services.length === 0) score += 15;
  else if (pageAnalysis.services.length <= 2) score += 10;
  else score += 5;

  return {
    score: Math.min(score, 100),
    complexity,
    timeEstimate,
    crudComplexity: crudCount
  };
}

/**
 * Проводит аудит всех страниц
 */
function auditAllPages() {
  console.log('🔍 Начинаем полный аудит готовности к Supabase миграции...\n');
  console.log(`📊 Всего страниц для анализа: ${PAGES_TO_AUDIT.length}\n`);

  PAGES_TO_AUDIT.forEach((page, index) => {
    const pageFilePath = path.join(__dirname, 'src', 'pages', page.file);
    console.log(`[${index + 1}/${PAGES_TO_AUDIT.length}] Анализируем: ${page.route}`);
    
    const analysis = analyzePageFile(pageFilePath);
    const readiness = evaluateSupabaseReadiness(analysis);
    
    const pageResult = {
      route: page.route,
      component: page.component,
      file: page.file,
      filePath: pageFilePath,
      analysis,
      readiness,
      section: page.route.startsWith('/admin') ? 'ADMIN' :
               page.route.startsWith('/settings') ? 'SETTINGS' :
               page.route.startsWith('/network') ? 'NETWORK' :
               page.route.startsWith('/point') ? 'POINT' : 'OTHER'
    };

    auditResults.pages.push(pageResult);

    // Обновляем сводную статистику
    if (analysis.exists && !analysis.hasErrors) auditResults.summary.loadable++;
    if (analysis.hasErrors) auditResults.summary.hasErrors++;
    if (readiness.score >= 70) auditResults.summary.readyForSupabase++;
    if (analysis.usesMockData) auditResults.summary.useMockData++;
    if (!analysis.usesMockData && analysis.services.length > 0) auditResults.summary.useRealAPI++;

    console.log(`   ✅ Готовность: ${readiness.score}% | Сложность: ${readiness.complexity} | Время: ${readiness.timeEstimate}`);
  });

  return auditResults;
}

/**
 * Генерирует детальный отчет
 */
function generateDetailedReport(results) {
  let report = '';
  
  report += '# 🔍 ПОЛНЫЙ АУДИТ ГОТОВНОСТИ К SUPABASE МИГРАЦИИ\n\n';
  report += `**Дата проведения:** ${new Date().toLocaleString('ru-RU')}\n`;
  report += `**Всего страниц:** ${results.summary.total}\n\n`;

  // Сводная статистика
  report += '## 📊 СВОДНАЯ СТАТИСТИКА\n\n';
  report += `- ✅ Загружаются без ошибок: **${results.summary.loadable}/${results.summary.total}** (${Math.round(results.summary.loadable/results.summary.total*100)}%)\n`;
  report += `- ❌ Имеют ошибки: **${results.summary.hasErrors}** страниц\n`;
  report += `- 🚀 Готовы к миграции (≥70%): **${results.summary.readyForSupabase}** страниц\n`;
  report += `- 🎭 Используют Mock данные: **${results.summary.useMockData}** страниц\n`;
  report += `- 🌐 Используют реальный API: **${results.summary.useRealAPI}** страниц\n\n`;

  // Группировка по разделам
  const sections = ['ADMIN', 'SETTINGS', 'NETWORK', 'POINT', 'OTHER'];
  
  sections.forEach(section => {
    const sectionPages = results.pages.filter(p => p.section === section);
    if (sectionPages.length === 0) return;

    report += `## 📂 РАЗДЕЛ ${section} (${sectionPages.length} страниц)\n\n`;
    
    sectionPages.forEach(page => {
      const ready = page.readiness.score >= 70 ? '🟢' : page.readiness.score >= 40 ? '🟡' : '🔴';
      const errors = page.analysis.hasErrors ? '❌' : '✅';
      
      report += `### ${ready} ${page.route}\n\n`;
      report += `**Компонент:** \`${page.component}\`\n`;
      report += `**Файл:** \`${page.file}\`\n`;
      report += `**Статус загрузки:** ${errors} ${page.analysis.exists ? 'Существует' : 'Не найден'}\n`;
      
      if (page.analysis.hasErrors) {
        report += `**Ошибки:** ${page.analysis.error || page.analysis.errors.join(', ')}\n`;
      }
      
      report += `**Готовность к Supabase:** ${page.readiness.score}%\n`;
      report += `**Сложность миграции:** ${page.readiness.complexity}\n`;
      report += `**Временные затраты:** ${page.readiness.timeEstimate}\n`;
      
      if (page.analysis.services.length > 0) {
        report += `**Используемые сервисы:** ${page.analysis.services.join(', ')}\n`;
      }
      
      report += `**CRUD операции:** `;
      const crud = page.analysis.crudOperations;
      const crudList = [];
      if (crud?.create) crudList.push('Create');
      if (crud?.read) crudList.push('Read');
      if (crud?.update) crudList.push('Update');
      if (crud?.delete) crudList.push('Delete');
      report += crudList.length > 0 ? crudList.join(', ') : 'Нет';
      report += '\n';
      
      report += `**Тип данных:** ${page.analysis.usesMockData ? 'Mock/localStorage' : 'Реальный API'}\n`;
      report += `**React Query:** ${page.analysis.hasReactQuery ? 'Да' : 'Нет'}\n`;
      
      if (page.analysis.linesOfCode) {
        report += `**Размер кода:** ${page.analysis.linesOfCode} строк\n`;
      }
      
      report += '\n---\n\n';
    });
  });

  // Рекомендации
  report += '## 🎯 РЕКОМЕНДАЦИИ ПО МИГРАЦИИ\n\n';
  
  const highPriority = results.pages.filter(p => p.readiness.score >= 70);
  const mediumPriority = results.pages.filter(p => p.readiness.score >= 40 && p.readiness.score < 70);
  const lowPriority = results.pages.filter(p => p.readiness.score < 40);

  report += `### 🟢 Высокий приоритет (готовы к миграции): ${highPriority.length} страниц\n\n`;
  highPriority.forEach(p => {
    report += `- **${p.route}** - ${p.readiness.timeEstimate}\n`;
  });

  report += `\n### 🟡 Средний приоритет (требуют подготовки): ${mediumPriority.length} страниц\n\n`;
  mediumPriority.forEach(p => {
    report += `- **${p.route}** - ${p.readiness.timeEstimate}\n`;
  });

  report += `\n### 🔴 Низкий приоритет (требуют серьезной доработки): ${lowPriority.length} страниц\n\n`;
  lowPriority.forEach(p => {
    report += `- **${p.route}** - ${p.readiness.timeEstimate}\n`;
  });

  // Общие временные оценки
  report += '\n## ⏱️ ОБЩИЕ ВРЕМЕННЫЕ ОЦЕНКИ\n\n';
  const totalEstimate = results.pages.reduce((acc, page) => {
    const hours = page.readiness.timeEstimate.includes('день') ? 16 : 
                  page.readiness.timeEstimate.includes('час') ? 3 : 0.5;
    return acc + hours;
  }, 0);
  
  report += `**Общее время миграции:** ~${Math.round(totalEstimate)} часов (${Math.round(totalEstimate/8)} рабочих дней)\n\n`;
  
  report += '**Этапы миграции:**\n';
  report += `1. Высокий приоритет: ~${Math.round(totalEstimate * 0.3)} часов\n`;
  report += `2. Средний приоритет: ~${Math.round(totalEstimate * 0.4)} часов\n`;
  report += `3. Низкий приоритет: ~${Math.round(totalEstimate * 0.3)} часов\n\n`;

  return report;
}

// Запуск аудита
if (require.main === module) {
  const results = auditAllPages();
  const report = generateDetailedReport(results);
  
  // Сохранение отчета
  const reportPath = path.join(__dirname, 'SUPABASE_MIGRATION_AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ АУДИТ ЗАВЕРШЕН!');
  console.log('='.repeat(80));
  console.log(`📊 Проанализировано страниц: ${results.summary.total}`);
  console.log(`✅ Загружаются без ошибок: ${results.summary.loadable}`);
  console.log(`🚀 Готовы к миграции: ${results.summary.readyForSupabase}`);
  console.log(`📄 Детальный отчет сохранен: ${reportPath}`);
  console.log('='.repeat(80));
}

module.exports = { auditAllPages, generateDetailedReport, PAGES_TO_AUDIT };