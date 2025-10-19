/**
 * Утилиты для преобразования cron-выражений в человекочитаемый формат
 */

const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среду',
  'четверг',
  'пятницу',
  'субботу'
];

/**
 * Преобразует cron-выражение в человекочитаемый текст
 */
export function cronToHumanReadable(cron: string): string {
  if (!cron) return 'Не задано';

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, weekday] = parts;

  // Каждые N часов: "0 */N * * *"
  if (hour.startsWith('*/')) {
    const hours = parseInt(hour.substring(2));
    return hours === 1 ? 'Каждый час' : `Каждые ${hours} часов`;
  }

  // Каждые N минут: "*/N * * * *"
  if (minute.startsWith('*/')) {
    const minutes = parseInt(minute.substring(2));
    return minutes === 1 ? 'Каждую минуту' : `Каждые ${minutes} минут`;
  }

  // Еженедельно: "M H * * D"
  if (weekday !== '*' && !weekday.includes(',') && !weekday.includes('-')) {
    const day = parseInt(weekday);
    const weekdayName = WEEKDAYS[day] || 'день';
    const time = formatTime(hour, minute);
    return `По ${weekdayName} в ${time}`;
  }

  // Несколько раз в день: "M1,M2 H1,H2 * * *" или "M H1,H2 * * *"
  if (hour.includes(',') || minute.includes(',')) {
    const hours = hour.split(',');
    const minutes = minute.split(',');

    if (hours.length > 1 && minutes.length === 1) {
      // Разные часы, одна минута
      const times = hours.map(h => formatTime(h, minute)).join(', ');
      return `В ${times}`;
    } else if (hours.length === 1 && minutes.length > 1) {
      // Один час, разные минуты
      const times = minutes.map(m => formatTime(hour, m)).join(', ');
      return `В ${times}`;
    } else if (hours.length === minutes.length) {
      // Пары час:минута
      const times = hours.map((h, i) => formatTime(h, minutes[i])).join(', ');
      return `В ${times}`;
    }
  }

  // Ежедневно: "M H * * *"
  if (hour !== '*' && minute !== '*' && dayOfMonth === '*' && month === '*' && weekday === '*') {
    const time = formatTime(hour, minute);
    return `Ежедневно в ${time}`;
  }

  // Ежемесячно: "M H D * *"
  if (dayOfMonth !== '*' && !dayOfMonth.includes(',') && !dayOfMonth.includes('-')) {
    const day = parseInt(dayOfMonth);
    const time = formatTime(hour, minute);
    return `${day}-го числа в ${time}`;
  }

  // Диапазон часов: "M H1-H2 * * *"
  if (hour.includes('-')) {
    const [start, end] = hour.split('-');
    return `С ${start}:${minute.padStart(2, '0')} до ${end}:${minute.padStart(2, '0')}`;
  }

  // Если не удалось распознать, возвращаем исходное выражение
  return cron;
}

/**
 * Форматирует время из компонентов hour и minute
 */
function formatTime(hour: string, minute: string): string {
  const h = hour.padStart(2, '0');
  const m = minute.padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Получает короткое описание расписания (для компактного отображения)
 */
export function getScheduleShortDescription(cron: string): string {
  const full = cronToHumanReadable(cron);

  // Сокращаем для компактности
  return full
    .replace('Ежедневно в', 'Ежедн.')
    .replace('Каждые', '')
    .replace('часов', 'ч')
    .replace('минут', 'мин')
    .trim();
}

/**
 * Валидация cron-выражения
 */
export function isValidCron(cron: string): boolean {
  if (!cron) return false;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  // Проверка диапазонов для каждого поля
  const [minute, hour, dayOfMonth, month, weekday] = parts;

  // Минуты: 0-59
  if (!isValidCronField(minute, 0, 59)) return false;

  // Часы: 0-23
  if (!isValidCronField(hour, 0, 23)) return false;

  // День месяца: 1-31
  if (!isValidCronField(dayOfMonth, 1, 31)) return false;

  // Месяц: 1-12
  if (!isValidCronField(month, 1, 12)) return false;

  // День недели: 0-6
  if (!isValidCronField(weekday, 0, 6)) return false;

  return true;
}

/**
 * Валидация отдельного поля cron
 */
function isValidCronField(field: string, min: number, max: number): boolean {
  if (field === '*') return true;

  // */N
  if (field.startsWith('*/')) {
    const num = parseInt(field.substring(2));
    return !isNaN(num) && num >= 1 && num <= max;
  }

  // N1,N2,N3
  if (field.includes(',')) {
    const parts = field.split(',');
    return parts.every(p => {
      const num = parseInt(p);
      return !isNaN(num) && num >= min && num <= max;
    });
  }

  // N1-N2
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(n => parseInt(n));
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }

  // N
  const num = parseInt(field);
  return !isNaN(num) && num >= min && num <= max;
}
