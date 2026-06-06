/**
 * Перевод технических данных станции в человеческий язык для клиента.
 * Чистые функции (тестируются в __tests__/stationStatusHumanize.test.ts).
 */

import type { ChannelTransport } from '@/types/stationStatus';

/** Уровень светофора для человеко-подписей (локальный — в контракте используется qualityScore/classification). */
type StatusLevel = 'green' | 'amber' | 'red';

/** Статусное слово по уровню (для каналов/сервисов). */
export function levelWord(level: StatusLevel): string {
  if (level === 'green') return 'в норме';
  if (level === 'amber') return 'внимание';
  return 'сбой';
}

/** Статус связи по уровню. */
export function connectivityWord(level: StatusLevel): string {
  if (level === 'green') return 'на связи';
  if (level === 'amber') return 'нестабильно';
  return 'нет связи';
}

/** Человеческое имя процесса ПО станции (без .exe-кухни для клиента). */
const PROCESS_LABELS: Record<string, string> = {
  'tconsole.exe': 'Кассовое ядро',
  'cl_serv.exe': 'Сервер обмена',
  'cs_pos.exe': 'POS-модуль',
  'onlterm.exe': 'Онлайн-заказы',
  'kktproxy.exe': 'Фискальный регистратор',
  'trkdrv.exe': 'Драйвер ТРК',
  'md4.exe': 'Уровнемер',
  'sbr_trm.exe': 'Банковский терминал',
  'sqlservr.exe': 'База данных',
};

export function processLabel(name: string): string {
  return PROCESS_LABELS[String(name).toLowerCase()] || name;
}

/** Подпись транспорта канала ('protected' — legacy-режим failover из старого Hub). */
export function transportLabel(transport: ChannelTransport | 'protected' | null | undefined): string {
  switch (transport) {
    case 'tunnel':
      return 'Через туннель';
    case 'protected':
      return 'Прямой + резерв';
    case 'direct':
      return 'Прямой канал';
    default:
      return '—';
  }
}

/** Подпись режима канала в стиле Hub (Авто / VPN / Прямой). */
export function channelModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case 'overlay': return 'VPN';
    case 'failover': return 'Авто';
    case 'direct': return 'Прямой';
    default: return mode || '—';
  }
}

/** Короткое пояснение транспорта (tooltip/подпись). */
export function transportHint(transport: ChannelTransport | 'protected' | null | undefined): string {
  switch (transport) {
    case 'tunnel':
      return 'Трафик идёт через защищённый туннель TradeLink';
    case 'protected':
      return 'Прямой интернет станции, при сбое — автопереключение на туннель';
    case 'direct':
      return 'Прямой интернет станции';
    default:
      return '';
  }
}

/** Длительность работы «5 дн 3 ч». */
export function humanizeUptime(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—';
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days} дн ${hours} ч`;
  if (hours > 0) return `${hours} ч ${mins} мин`;
  return `${mins} мин`;
}

/** «2 минуты назад» по lastSeen. */
export function humanizeLastSeen(iso: string | null | undefined, nowMs?: number): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, (nowMs ?? Date.now()) - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

/** ОЗУ из МБ в человекочитаемый вид (живой объём). */
export function humanizeRam(ramMb: number | null | undefined): string {
  if (ramMb == null || !Number.isFinite(ramMb)) return '—';
  if (ramMb >= 1024) return `${(ramMb / 1024).toFixed(1)} ГБ`;
  return `${Math.round(ramMb)} МБ`;
}

/** Гигабайты с одним знаком (для ram_total_gb / диска). */
export function humanizeGb(gb: number | null | undefined): string {
  if (gb == null || !Number.isFinite(gb)) return '—';
  return `${gb.toFixed(1)} ГБ`;
}

/** Процент с округлением и знаком %. */
export function humanizePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

/** Латентность в мс. */
export function humanizeLatency(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return `${Math.round(ms)} мс`;
}

/** Скорость сетевого адаптера. */
export function humanizeSpeed(mbps: number | null | undefined): string {
  if (mbps == null || !Number.isFinite(mbps)) return '—';
  return `${mbps} Mbps`;
}

/** Объём трафика из МБ. */
export function humanizeTraffic(mb: number | null | undefined): string {
  if (mb == null || !Number.isFinite(mb)) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} ГБ`;
  return `${mb.toFixed(1)} МБ`;
}

/** Режим туннеля. */
export function tunnelModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case 'always_on': return 'Постоянный';
    case 'on_demand': return 'По запросу';
    case 'off': return 'Выключен';
    default: return mode || '—';
  }
}

/** Режим SSH-доступа. */
export function sshModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case 'restricted': return 'Ограничен';
    case 'limited': return 'Ограничен';
    case 'full': return 'Полный';
    case 'off': return 'Выключен';
    default: return mode || '—';
  }
}

/** Состояние failover. */
export function failoverLabel(enabled: boolean | null | undefined, state: string | null | undefined): string {
  if (!enabled) return 'Выключен';
  if (state === 'active') return 'Активен (резерв)';
  return 'Вкл · норма';
}
