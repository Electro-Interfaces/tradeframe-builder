/**
 * Мобильный аудит всех экранов TradeControl
 * Запуск: TEST_EMAIL=... TEST_PASSWORD=... npx playwright test e2e/mobile-audit.spec.ts
 *
 * Делает скриншоты всех страниц приложения в мобильном viewport (iPhone 14).
 * Результаты: screenshots/mobile/
 */

import { test, expect, devices } from '@playwright/test';

const SCREENSHOT_DIR = 'screenshots/mobile';

// Все роуты приложения для аудита
const ROUTES = [
  { path: '/', name: '02-equipment-home' },
  { path: '/network/overview', name: '03-network-overview' },
  { path: '/network/operations-transactions', name: '04-operations' },
  { path: '/network/sales-analysis', name: '05-sales-analysis' },
  { path: '/network/pricing', name: '06-network-pricing' },
  { path: '/network/coupons', name: '07-coupons' },
  { path: '/network/fuel-inventory', name: '08-fuel-inventory' },
  { path: '/network/receipts', name: '09-receipts' },
  { path: '/network/online-orders', name: '11-online-orders' },
  { path: '/network/notifications', name: '12-notifications' },
  { path: '/network/messages', name: '13-messages' },
  { path: '/network/broadcast-messages', name: '14-broadcast' },
  { path: '/point/prices', name: '15-prices' },
  { path: '/point/tanks', name: '16-tanks' },
  { path: '/point/equipment', name: '17-equipment' },
  { path: '/point/shift-reports-v2', name: '18-shift-reports' },
  { path: '/point/shift-dashboard', name: '19-shift-dashboard' },
  { path: '/admin/users-and-roles', name: '20-users' },
  { path: '/admin/roles', name: '21-roles' },
  { path: '/admin/networks', name: '22-networks' },
  { path: '/admin/audit', name: '23-audit-log' },
  { path: '/admin/legal-documents', name: '24-legal-docs' },
  { path: '/settings/sts-api', name: '25-sts-api' },
  { path: '/settings/external-database', name: '26-external-db' },
  { path: '/settings/notifications', name: '27-notification-settings' },
  { path: '/profile', name: '28-profile' },
  { path: '/support/tickets', name: '29-support-tickets' },
  { path: '/support/chat', name: '30-support-chat' },
];

// Учётные данные для логина (из env)
const LOGIN_EMAIL = process.env.TEST_EMAIL || '';
const LOGIN_PASSWORD = process.env.TEST_PASSWORD || '';

// iPhone 14 viewport — на верхнем уровне
test.use({
  ...devices['iPhone 14'],
});

test('01 - Страница логина (мобильная)', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/01-login.png`,
    fullPage: true,
  });

  // Проверяем что TradePoint отображается
  const heading = page.locator('h1');
  await expect(heading).toContainText('TradePoint');
});

if (LOGIN_EMAIL && LOGIN_PASSWORD) {
  test('Авторизация и скриншоты всех экранов', async ({ page }) => {
    test.setTimeout(300_000); // 5 минут на все экраны

    // Логин
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);

    // Принимаем правовые документы (иначе submit disabled)
    for (const id of ['terms', 'privacy', 'pdn']) {
      const cb = page.locator(`#${id}`);
      if (await cb.count()) {
        await cb.click({ force: true }).catch(() => {});
      }
    }

    await page.click('button[type="submit"]');

    // Ждём редирект после логина
    await page.waitForURL('/', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // --- Выбор сети и торговой точки ---
    // NetworkSelect — кнопка с текстом "Выберите сеть" или именем сети + иконка ChevronDown
    // На мобильном PointSelect отсутствует в хедере, но авто-выбирается через SelectionContext
    try {
      await page.waitForSelector('header', { timeout: 5000 });

      // Находим кнопку NetworkSelect — содержит "Выберите сеть" или имя сети
      const networkButton = page.locator('header button:has(span.truncate)').first();
      await networkButton.waitFor({ timeout: 5000 });
      const networkText = await networkButton.textContent().catch(() => '');

      console.log(`📌 NetworkSelect текст: "${networkText}"`);

      // Если сеть не выбрана — кликаем и выбираем первую доступную
      if (!networkText || networkText.includes('Выберите') || networkText.includes('Выбе')) {
        await networkButton.click();
        await page.waitForTimeout(1000);

        // Ждём появления списка сетей в Popover
        const networkList = page.locator('[data-radix-popper-content-wrapper] ul li');
        const count = await networkList.count().catch(() => 0);
        console.log(`📌 Найдено сетей: ${count}`);

        if (count > 0) {
          await networkList.first().click();
          console.log('✅ Сеть выбрана из списка');
          await page.waitForTimeout(2000); // Ждём загрузки данных после выбора сети
        } else {
          await page.keyboard.press('Escape');
          console.warn('⚠️ Список сетей пуст');
        }
      } else {
        console.log('✅ Сеть уже выбрана автоматически');
      }

      // Ждём авто-выбора торговой точки через SelectionContext
      await page.waitForTimeout(2000);
    } catch (e) {
      console.warn('⚠️ Не удалось выбрать сеть:', (e as Error).message);
    }

    // Выбор конкретной торговой точки (на mobile PointSelect в BottomNav)
    try {
      // Сначала переходим на /point/tanks — там точно есть PointSelect в BottomNav
      await page.goto('/point/tanks');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Кликаем по PointSelect (кнопка с "Все торговые точки" или иконкой location)
      const pointButton = page.locator('nav button:has-text("Все торговые точки"), nav button:has-text("Выбе")').first();
      if (await pointButton.count()) {
        await pointButton.click();
        await page.waitForTimeout(800);

        // Выбираем первую реальную точку (не "Все")
        const firstPoint = page.locator('[role="option"], [data-radix-popper-content-wrapper] button, [data-radix-popper-content-wrapper] li')
          .filter({ hasNotText: 'Все торговые' })
          .first();
        if (await firstPoint.count()) {
          await firstPoint.click();
          console.log('✅ Торговая точка выбрана');
          await page.waitForTimeout(2000);
        } else {
          await page.keyboard.press('Escape');
          console.warn('⚠️ Список точек пуст');
        }
      }
    } catch (e) {
      console.warn('⚠️ Не удалось выбрать ТТ:', (e as Error).message);
    }

    // Скриншот главной (после выбора сети/точки)
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-equipment-home.png`,
      fullPage: true,
    });

    // Проходим по всем защищённым роутам
    for (const route of ROUTES) {
      if (route.path === '/') continue; // Главная уже сделана

      try {
        await page.goto(route.path, { timeout: 15000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3500);

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/${route.name}.png`,
          fullPage: true,
        });

        console.log(`✅ ${route.name}: ${route.path}`);
      } catch (error) {
        console.warn(`⚠️ ${route.name}: ${route.path} — ошибка: ${(error as Error).message}`);

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/${route.name}-error.png`,
          fullPage: true,
        }).catch(() => {});
      }
    }
  });
} else {
  test.skip('Защищённые страницы — нужны TEST_EMAIL и TEST_PASSWORD', () => {});
}
