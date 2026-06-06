import { describe, it, expect } from 'vitest';
import {
  canMarkResolved,
  canReopen,
  clientCanSetStatus,
  CLIENT_SETTABLE_STATUSES,
} from '../ticketPermissions';
import type { TicketStatus } from '@/types/support';

const ALL_STATUSES: TicketStatus[] = [
  'new', 'in_progress', 'waiting_customer', 'escalated',
  'resolved', 'closed', 'cancelled', 'reopened',
];

describe('canMarkResolved — клиент отмечает заявку выполненной', () => {
  it('активные/нерешённые → можно', () => {
    expect(canMarkResolved('new')).toBe(true);
    expect(canMarkResolved('in_progress')).toBe(true);
    expect(canMarkResolved('waiting_customer')).toBe(true);
    expect(canMarkResolved('escalated')).toBe(true);
    expect(canMarkResolved('reopened')).toBe(true);
  });
  it('уже решена/закрыта/отменена → нельзя', () => {
    expect(canMarkResolved('resolved')).toBe(false);
    expect(canMarkResolved('closed')).toBe(false);
    expect(canMarkResolved('cancelled')).toBe(false);
  });
});

describe('canReopen — клиент переоткрывает заявку', () => {
  it('решена/закрыта/отменена → можно', () => {
    expect(canReopen('resolved')).toBe(true);
    expect(canReopen('closed')).toBe(true);
    expect(canReopen('cancelled')).toBe(true);
  });
  it('активная → нельзя', () => {
    expect(canReopen('new')).toBe(false);
    expect(canReopen('in_progress')).toBe(false);
    expect(canReopen('reopened')).toBe(false);
  });
});

describe('canMarkResolved / canReopen взаимоисключающи', () => {
  it('для каждого статуса доступно ровно одно действие', () => {
    for (const s of ALL_STATUSES) {
      expect(canMarkResolved(s)).toBe(!canReopen(s));
    }
  });
});

describe('clientCanSetStatus — синхронизация с серверной защитой', () => {
  it('клиент может только resolved/reopened/new', () => {
    expect(clientCanSetStatus('resolved')).toBe(true);
    expect(clientCanSetStatus('reopened')).toBe(true);
    expect(clientCanSetStatus('new')).toBe(true);
  });
  it('закрытие/отмена/внутренние статусы — нельзя клиенту', () => {
    expect(clientCanSetStatus('closed')).toBe(false);
    expect(clientCanSetStatus('cancelled')).toBe(false);
    expect(clientCanSetStatus('in_progress')).toBe(false);
    expect(clientCanSetStatus('waiting_customer')).toBe(false);
    expect(clientCanSetStatus('escalated')).toBe(false);
  });
  it('список совпадает с CLIENT_SETTABLE_STATUSES (контракт с оркестратором)', () => {
    expect([...CLIENT_SETTABLE_STATUSES].sort()).toEqual(['new', 'reopened', 'resolved']);
  });
});
