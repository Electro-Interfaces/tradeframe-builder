import { describe, it, expect } from 'vitest';

/**
 * Проверяет что все lazy-импорты из App.tsx резолвятся в модули с default export.
 * Предотвращает регрессии при переименовании/перемещении/split файлов страниц.
 *
 * Если этот тест падает — значит путь в lazy(() => import("...")) не совпадает
 * с реальным расположением файла.
 */
describe('Lazy imports — все страницы App.tsx резолвятся', () => {
  // Пути соответствуют lazy(() => import("...")) из App.tsx
  const pages: [string, () => Promise<any>][] = [
    // Главные страницы
    ['Equipment', () => import('@/pages/Equipment')],
    ['NetworkOverview', () => import('@/pages/NetworkOverview')],

    // Приоритет 1
    ['Prices', () => import('@/pages/Prices')],
    ['STSApiSettings', () => import('@/pages/STSApiSettings')],
    ['Tanks', () => import('@/pages/Tanks')],
    ['OperationsTransactionsPageSimple', () => import('@/pages/OperationsTransactionsPageSimple')],
    ['CouponsPage', () => import('@/pages/CouponsPage')],
    ['FuelInventory', () => import('@/pages/FuelInventory')],

    // Admin — приоритет 2
    ['Users', () => import('@/pages/admin/Users')],
    ['Roles', () => import('@/pages/admin/Roles')],
    ['AuditLog', () => import('@/pages/AuditLog')],
    ['DataMigration', () => import('@/pages/DataMigration')],

    // Settings — приоритет 2
    ['UserNotificationSettings', () => import('@/pages/UserNotificationSettings')],

    // Network — приоритет 3
    ['SalesAnalysisPage', () => import('@/pages/SalesAnalysisPage')],
    ['NetworkNotifications', () => import('@/pages/NetworkNotifications')],
    ['Messages', () => import('@/pages/Messages')],
    ['Receipts', () => import('@/pages/network/Receipts')],
    ['NetworkPricing', () => import('@/pages/NetworkPricing')],
    ['OnlineOrdersMonitor', () => import('@/pages/OnlineOrdersMonitor')],

    // Приоритет 4
    ['UsersAndRoles', () => import('@/pages/admin/UsersAndRoles')],
    ['NetworksPage', () => import('@/pages/NetworksPage')],
    ['ShiftReportsV2', () => import('@/pages/ShiftReportsV2')],
    ['ShiftDashboard', () => import('@/pages/ShiftDashboard')],
    ['SimpleProfile', () => import('@/pages/SimpleProfile')],
    ['TestServices', () => import('@/pages/TestServices')],
    ['TestServicesSimple', () => import('@/pages/TestServicesSimple')],
    ['TestDebug', () => import('@/pages/TestDebug')],
    ['MobileBrowserTest', () => import('@/pages/MobileBrowserTest')],
    ['LegalDocuments', () => import('@/pages/LegalDocuments')],
    ['LegalDocumentEditor', () => import('@/pages/LegalDocumentEditor')],
    ['LegalDocumentHistory', () => import('@/pages/LegalDocumentHistory')],
    ['LegalUsersAcceptances', () => import('@/pages/LegalUsersAcceptances')],
    ['LogoVariants', () => import('@/pages/LogoVariants')],

    // Support
    ['TicketsPage', () => import('@/pages/support/TicketsPage')],
    ['ChatPage', () => import('@/pages/support/ChatPage')],
  ];

  pages.forEach(([name, importFn]) => {
    it(`${name} — модуль загружается и имеет default export`, async () => {
      const mod = await importFn();
      expect(mod).toHaveProperty('default');
    }, 10000);
  });
});
