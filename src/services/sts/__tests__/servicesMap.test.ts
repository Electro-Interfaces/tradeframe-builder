/**
 * Справочник топлив кэшируется по системе.
 * Почему это важно: коды у систем разные — в ГИГ (15) газ идёт под 16, а 6 это «ДТ зим.»,
 * в Энтикоме (29) под 6 лежит обычное ДТ. Один кэш на все сети означал бы, что после
 * ГИГ цены Энтикома уедут не на то топливо.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/backendUrl', () => ({ getBackendOrigin: () => 'http://localhost:3001' }));
vi.mock('@/utils/authStorage', () => ({ getToken: () => 'test-token' }));

import { stsApiService } from '../STSApiService';

const services15 = [
  { service_code: 2, service_name: 'АИ-92' },
  { service_code: 6, service_name: 'ДТ зим.' },
  { service_code: 16, service_name: 'ГАЗ' },
];
const services29 = [
  { service_code: 2, service_name: 'АИ-92' },
  { service_code: 4, service_name: 'АИ-95' },
  { service_code: 6, service_name: 'ДТ' },
];

describe('loadServicesMap', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('перечитывает справочник при смене системы и не ходит дважды за одной', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: any) => {
      const href = String(url);
      calls.push(href);
      const body = href.includes('system=29') ? services29 : services15;
      return { ok: true, json: async () => body } as any;
    }));

    await stsApiService.loadServicesMap('15');
    await stsApiService.loadServicesMap('15');
    expect(calls.length).toBe(1);

    await stsApiService.loadServicesMap('29');
    expect(calls.length).toBe(2);
    expect(calls[1]).toContain('system=29');
  });
});
