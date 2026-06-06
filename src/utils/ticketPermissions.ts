/**
 * Права клиента над заявкой — единый источник правды для UI.
 * Должно соответствовать серверной защите оркестратора (web/support_api.py:
 * _CLIENT_STATUSES). Закрытие/отмена/назначение исполнителя — на стороне поддержки.
 */
import type { TicketStatus } from '@/types/support';

/** Статусы, которые клиент (оператор/пользователь) может установить сам. */
export const CLIENT_SETTABLE_STATUSES: TicketStatus[] = ['resolved', 'reopened', 'new'];

/** Финальные/решённые статусы, из которых заявку можно переоткрыть. */
export const REOPENABLE_STATUSES: TicketStatus[] = ['resolved', 'closed', 'cancelled'];

/** Клиент может отметить заявку выполненной (resolved), пока она не решена/закрыта/отменена. */
export function canMarkResolved(status: TicketStatus): boolean {
  return !REOPENABLE_STATUSES.includes(status);
}

/** Клиент может переоткрыть решённую/закрытую/отменённую заявку. */
export function canReopen(status: TicketStatus): boolean {
  return REOPENABLE_STATUSES.includes(status);
}

/** Может ли клиент сам установить такой статус (дублирует серверную проверку). */
export function clientCanSetStatus(status: TicketStatus): boolean {
  return CLIENT_SETTABLE_STATUSES.includes(status);
}
