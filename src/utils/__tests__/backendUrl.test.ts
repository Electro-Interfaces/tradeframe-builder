import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getBackendOrigin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('возвращает localhost:3001 без window', async () => {
    vi.stubGlobal('window', undefined);
    const { getBackendOrigin } = await import('../backendUrl');
    expect(getBackendOrigin()).toBe('http://localhost:3001');
    vi.unstubAllGlobals();
  });

  it('возвращает fallback для github.io', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://user.github.io' },
    });
    const { getBackendOrigin } = await import('../backendUrl');
    const result = getBackendOrigin();
    // Должен быть fallback URL, не github.io
    expect(result).not.toContain('github.io');
    vi.unstubAllGlobals();
  });

  it('возвращает origin для production URL', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://prod.dataworker.ru' },
    });
    const { getBackendOrigin } = await import('../backendUrl');
    expect(getBackendOrigin()).toBe('https://prod.dataworker.ru');
    vi.unstubAllGlobals();
  });

  it('возвращает localhost:3001 при origin=null', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'null' },
    });
    const { getBackendOrigin } = await import('../backendUrl');
    expect(getBackendOrigin()).toBe('http://localhost:3001');
    vi.unstubAllGlobals();
  });
});
