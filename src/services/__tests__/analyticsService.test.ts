import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { triggerSync } from '../analyticsService';

describe('triggerSync', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('передаёт серверное сообщение о превышении дедлайна', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 504,
      json: async () => ({ error: 'Сверка не завершилась за 120 сек. Повторите позже.' }),
    });

    await expect(triggerSync(['network-id'], { from: '2026-07-01', to: '2026-07-31' }))
      .rejects.toThrow('Сверка не завершилась за 120 сек. Повторите позже.');
  });

  it('прерывает запрос, если backend не ответил после своего дедлайна', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    const request = triggerSync(['network-id'], { from: '2026-07-01', to: '2026-07-31' });
    const expectation = expect(request).rejects.toThrow('Сверка заняла больше двух минут. Повторите позже.');
    await vi.advanceTimersByTimeAsync(130000);
    await expectation;
  });
});
