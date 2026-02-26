import { test, expect } from '@playwright/test';

test.describe('Приложение загружается', () => {
  test('главная страница отображается без ошибок', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Приложение отрендерилось — есть root-контейнер с контентом
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    // Нет критичных JS-ошибок
    expect(errors).toEqual([]);
  });
});
