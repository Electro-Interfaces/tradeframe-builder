import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authorizedFetch } from '../apiClient';

describe('authorizedFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('добавляет JWT и сохраняет пользовательские заголовки', async () => {
    localStorage.setItem('auth_token', 'test-token');

    await authorizedFetch('/api/sts/_cache/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(options.credentials).toBe('include');
  });

  it('не отправляет запрос без активной сессии', async () => {
    await expect(authorizedFetch('/api/sts/_cache/stats')).rejects.toThrow('Требуется повторный вход');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
