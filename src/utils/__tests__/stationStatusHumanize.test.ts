import { describe, it, expect } from 'vitest';
import {
  processLabel,
  transportLabel,
  humanizeUptime,
  humanizeLastSeen,
  humanizeRam,
  humanizePercent,
  humanizeLatency,
  levelWord,
  connectivityWord,
} from '@/utils/stationStatusHumanize';

describe('processLabel', () => {
  it('переводит известные процессы', () => {
    expect(processLabel('tconsole.exe')).toBe('Кассовое ядро');
    expect(processLabel('CL_SERV.EXE')).toBe('Сервер обмена'); // регистронезависимо
  });
  it('неизвестный процесс возвращается как есть', () => {
    expect(processLabel('unknown.exe')).toBe('unknown.exe');
  });
});

describe('transportLabel', () => {
  it('маппит транспорт', () => {
    expect(transportLabel('tunnel')).toBe('Через туннель');
    expect(transportLabel('protected')).toBe('Прямой + резерв');
    expect(transportLabel('direct')).toBe('Прямой канал');
    expect(transportLabel(null)).toBe('—');
  });
});

describe('humanizeUptime', () => {
  it('дни и часы', () => expect(humanizeUptime(90000)).toBe('1 дн 1 ч'));
  it('часы и минуты', () => expect(humanizeUptime(3700)).toBe('1 ч 1 мин'));
  it('минуты', () => expect(humanizeUptime(120)).toBe('2 мин'));
  it('null → прочерк', () => expect(humanizeUptime(null)).toBe('—'));
});

describe('humanizeLastSeen', () => {
  const now = Date.parse('2026-06-02T12:00:00Z');
  it('только что', () =>
    expect(humanizeLastSeen('2026-06-02T11:59:30Z', now)).toBe('только что'));
  it('минуты назад', () =>
    expect(humanizeLastSeen('2026-06-02T11:55:00Z', now)).toBe('5 мин назад'));
  it('часы назад', () =>
    expect(humanizeLastSeen('2026-06-02T09:00:00Z', now)).toBe('3 ч назад'));
  it('пусто → прочерк', () => expect(humanizeLastSeen(null, now)).toBe('—'));
});

describe('humanizeRam', () => {
  it('ГБ при >= 1024 МБ', () => expect(humanizeRam(3354)).toBe('3.3 ГБ'));
  it('МБ при < 1024', () => expect(humanizeRam(512)).toBe('512 МБ'));
  it('null → прочерк', () => expect(humanizeRam(null)).toBe('—'));
});

describe('humanizePercent / humanizeLatency', () => {
  it('процент округляется', () => expect(humanizePercent(69.3)).toBe('69%'));
  it('латентность в мс', () => expect(humanizeLatency(48)).toBe('48 мс'));
  it('null', () => expect(humanizePercent(null)).toBe('—'));
});

describe('levelWord / connectivityWord', () => {
  it('levelWord', () => {
    expect(levelWord('green')).toBe('в норме');
    expect(levelWord('amber')).toBe('внимание');
    expect(levelWord('red')).toBe('сбой');
  });
  it('connectivityWord', () => {
    expect(connectivityWord('green')).toBe('на связи');
    expect(connectivityWord('red')).toBe('нет связи');
  });
});
