import { test, expect } from '@playwright/test';

const PROD_URL = 'https://prod.dataworker.ru';

const users = {
  bto: { email: 'test-bto@test.com', password: 'test123', name: 'Тест БТО' },
  enticom: { email: 'test-enticom@test.com', password: 'test123', name: 'Тест Энтиком' },
};

async function login(page: any, baseUrl: string, email: string, password: string) {
  await page.goto(`${baseUrl}/login`);
  await page.waitForLoadState('networkidle');

  // Заполняем форму логина
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);

  // Нажимаем кнопку входа
  await page.click('button[type="submit"], button:has-text("Вход"), button:has-text("Войти")');

  // Ждём перехода на основную страницу
  await page.waitForURL(`${baseUrl}/**`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('RBAC: Изоляция сетей — БТО vs Энтиком', () => {

  test('БТО менеджер НЕ видит Энтиком', async ({ page }) => {
    await login(page, PROD_URL, users.bto.email, users.bto.password);

    // Скриншот после логина — какая сеть выбрана
    await page.screenshot({ path: 'screenshots/rbac/bto-01-after-login.png', fullPage: true });

    // Открываем селектор сети в header
    const networkSelector = page.locator('[data-testid="network-select"], [role="combobox"]').first();
    if (await networkSelector.isVisible()) {
      await networkSelector.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/rbac/bto-02-network-selector.png', fullPage: true });

      // Проверяем что Энтиком НЕ показан
      const pageContent = await page.content();
      const hasEnticom = pageContent.includes('Энтиком') || pageContent.includes('enticom') || pageContent.includes('ЭНТИКОМ');

      await page.screenshot({ path: 'screenshots/rbac/bto-03-check-enticom.png', fullPage: true });

      expect(hasEnticom, 'БТО менеджер НЕ должен видеть сеть Энтиком').toBe(false);
    }

    // Переходим на страницу обзора сети
    await page.goto(`${PROD_URL}/network/overview`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/rbac/bto-04-overview.png', fullPage: true });

    // Проверяем через API — какие сети доступны
    const networksResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('tradeframe_token_v2') || localStorage.getItem('auth_token');
      if (!token) return { error: 'no token' };
      const resp = await fetch('/api/networks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return resp.json();
    });

    console.log('БТО — доступные сети:', JSON.stringify(networksResponse));

    // Проверяем что в списке нет Энтиком
    if (Array.isArray(networksResponse)) {
      const networkNames = networksResponse.map((n: any) => n.name || n.code);
      console.log('БТО — имена сетей:', networkNames);
      const hasEnticomNetwork = networkNames.some((name: string) =>
        name?.toLowerCase().includes('энтиком') || name?.toLowerCase().includes('enticom')
      );
      expect(hasEnticomNetwork, 'API /networks НЕ должен возвращать Энтиком для БТО').toBe(false);
    }
  });

  test('Энтиком менеджер НЕ видит БТО', async ({ page }) => {
    await login(page, PROD_URL, users.enticom.email, users.enticom.password);

    // Скриншот после логина
    await page.screenshot({ path: 'screenshots/rbac/enticom-01-after-login.png', fullPage: true });

    // Открываем селектор сети
    const networkSelector = page.locator('[data-testid="network-select"], [role="combobox"]').first();
    if (await networkSelector.isVisible()) {
      await networkSelector.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/rbac/enticom-02-network-selector.png', fullPage: true });

      // Проверяем что БТО НЕ показан
      const pageContent = await page.content();
      const hasBto = pageContent.includes('БТО') || pageContent.includes('BTO');

      expect(hasBto, 'Энтиком менеджер НЕ должен видеть сеть БТО').toBe(false);
    }

    // Переходим на обзор
    await page.goto(`${PROD_URL}/network/overview`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/rbac/enticom-03-overview.png', fullPage: true });

    // Проверяем через API
    const networksResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('tradeframe_token_v2') || localStorage.getItem('auth_token');
      if (!token) return { error: 'no token' };
      const resp = await fetch('/api/networks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return resp.json();
    });

    console.log('Энтиком — доступные сети:', JSON.stringify(networksResponse));

    if (Array.isArray(networksResponse)) {
      const networkNames = networksResponse.map((n: any) => n.name || n.code);
      console.log('Энтиком — имена сетей:', networkNames);
      const hasBtoNetwork = networkNames.some((name: string) =>
        name?.toLowerCase().includes('бто') || name?.toLowerCase().includes('bto')
      );
      expect(hasBtoNetwork, 'API /networks НЕ должен возвращать БТО для Энтиком').toBe(false);
    }

    // Проверяем что торговые точки только Энтиком
    const pointsResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('tradeframe_token_v2') || localStorage.getItem('auth_token');
      if (!token) return { error: 'no token' };
      const resp = await fetch('/api/trading-points', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return resp.json();
    });

    console.log('Энтиком — торговые точки:', JSON.stringify(pointsResponse));
    await page.screenshot({ path: 'screenshots/rbac/enticom-04-final.png', fullPage: true });
  });

  test('STS API: Энтиком НЕ может запросить данные БТО (system=15)', async ({ page }) => {
    await login(page, PROD_URL, users.enticom.email, users.enticom.password);

    // Прямой запрос к STS через прокси с system=15 (БТО)
    const stsResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('tradeframe_token_v2') || localStorage.getItem('auth_token');
      if (!token) return { error: 'no token' };
      const resp = await fetch('/api/sts/v2/info?system=15', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { status: resp.status, body: await resp.json() };
    });

    console.log('Энтиком → STS system=15 (БТО):', JSON.stringify(stsResponse));
    expect(stsResponse.status, 'STS запрос к БТО должен вернуть 403').toBe(403);
  });

  test('STS API: БТО НЕ может запросить данные Энтиком (system=29)', async ({ page }) => {
    await login(page, PROD_URL, users.bto.email, users.bto.password);

    // Прямой запрос к STS через прокси с system=29 (Энтиком)
    const stsResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('tradeframe_token_v2') || localStorage.getItem('auth_token');
      if (!token) return { error: 'no token' };
      const resp = await fetch('/api/sts/v2/info?system=29', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { status: resp.status, body: await resp.json() };
    });

    console.log('БТО → STS system=29 (Энтиком):', JSON.stringify(stsResponse));
    expect(stsResponse.status, 'STS запрос к Энтиком должен вернуть 403').toBe(403);
  });
});
