/**
 * API-клиент базы знаний компании (часть B раздела «Инфо»). Все запросы — через backend /api/kb/*
 * с авторизацией; изоляция по сети обеспечивается backend'ом (networkId — лишь выбор компании).
 */
import { getBackendOrigin } from '@/utils/backendUrl';
import { getToken, getUser } from '@/utils/authStorage';

export interface KbCategory {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  sort_order: number;
}
export interface KbArticleListItem {
  id: string;
  category_id: string | null;
  title: string;
  doc_kind: string;
  doc_number: string | null;
  effective_date: string | null;
  version: number;
}
export interface KbAttachment {
  id: string;
  filename: string;
  mime: string | null;
  size_bytes: number | null;
}
export interface KbArticle extends KbArticleListItem {
  network_id: string;
  body_md: string;
  status: string;
  changelog: string;
  effective_until: string | null;
  updated_at: string;
  attachments: KbAttachment[];
}
export interface KbContact {
  id: string;
  full_name: string;
  position: string | null;
  responsibility: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
}
export interface KbSearchArticle {
  id: string;
  title: string;
  doc_kind: string;
  doc_number: string | null;
  effective_date: string | null;
  snippet: string | null;
  is_universal: boolean;
}
export interface KbTreePart {
  categories: KbCategory[];
  articles: KbArticleListItem[];
}
export interface KbSearchResult {
  articles: KbSearchArticle[];
  contacts: KbContact[];
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  const user = getUser<{ id?: string; email?: string; name?: string; role?: string }>();
  if (user) {
    if (user.id) h['X-TF-User-Id'] = user.id;
    if (user.email) h['X-TF-User-Email'] = user.email;
    if (user.name) h['X-TF-User-Name'] = encodeURIComponent(user.name);
    if (user.role) h['X-TF-User-Role'] = user.role;
  }
  return h;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${getBackendOrigin()}${path}`, { headers: authHeaders(), signal });
  if (!res.ok) throw new Error(`kb ${res.status}`);
  return res.json() as Promise<T>;
}

const netQs = (networkId?: string | null) =>
  networkId ? `?networkId=${encodeURIComponent(networkId)}` : '';

export function fetchKbTree(networkId?: string | null) {
  return getJson<{ universal: KbTreePart; company: KbTreePart }>(`/api/kb/tree${netQs(networkId)}`);
}
export function fetchKbArticle(id: string) {
  return getJson<KbArticle>(`/api/kb/articles/${encodeURIComponent(id)}`);
}
export function fetchKbContacts(networkId?: string | null) {
  return getJson<{ contacts: KbContact[] }>(`/api/kb/contacts${netQs(networkId)}`);
}
export function searchKb(q: string, networkId?: string | null, signal?: AbortSignal) {
  const qs = new URLSearchParams({ q });
  if (networkId) qs.set('networkId', networkId);
  return getJson<KbSearchResult>(`/api/kb/search?${qs.toString()}`, signal);
}
export function kbAttachmentUrl(id: string) {
  return `${getBackendOrigin()}/api/kb/attachments/${encodeURIComponent(id)}`;
}

// ── Админ (super-admin): листинг всех статусов + запись ─────────────────
export interface KbAdminArticle {
  id: string;
  network_id: string | null;
  category_id: string | null;
  title: string;
  doc_kind: string;
  doc_number: string | null;
  status: string;
  version: number;
  is_current: boolean;
  is_universal: boolean;
  effective_date: string | null;
  updated_at: string;
}
export interface KbArticleInput {
  networkId?: string | null;
  universal?: boolean;
  categoryId?: string | null;
  title: string;
  bodyMd: string;
  status: string;
  docKind: string;
  docNumber?: string | null;
  effectiveDate?: string | null;
  tags?: string[];
}

async function mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getBackendOrigin()}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json().catch(() => ({})) as Promise<T>;
}

export function adminListKbArticles(networkId?: string | null) {
  return getJson<{ articles: KbAdminArticle[] }>(`/api/kb/admin/articles${netQs(networkId)}`);
}
export function createKbArticle(d: KbArticleInput) {
  return mutate<{ id: string }>('POST', '/api/kb/articles', d);
}
export function updateKbArticle(id: string, d: Partial<KbArticleInput>) {
  return mutate<{ id: string; newRevision?: boolean }>('PUT', `/api/kb/articles/${encodeURIComponent(id)}`, d);
}
export function deleteKbArticle(id: string) {
  return mutate<{ ok: boolean }>('DELETE', `/api/kb/articles/${encodeURIComponent(id)}`);
}
export function createKbContact(d: { networkId?: string; fullName: string; position?: string; responsibility?: string; phone?: string; email?: string; note?: string; role?: string }) {
  return mutate<{ id: string }>('POST', '/api/kb/contacts', d);
}
