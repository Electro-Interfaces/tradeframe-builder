/**
 * ScheduleEditor - Человекоориентированный редактор расписания
 * Преобразует сложные cron-выражения в понятный интерфейс
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ScheduleEditorProps {
  value: string; // cron expression
  onChange: (cronExpression: string, humanReadable: string) => void;
}

type ScheduleType = 'hourly' | 'daily' | 'weekly' | 'custom_hours' | 'custom_time';

interface ScheduleConfig {
  type: ScheduleType;
  // Для hourly
  everyNHours?: number;
  // Для daily
  dailyTime?: string; // HH:mm
  // Для weekly
  weekday?: number; // 0-6 (вс-сб)
  weeklyTime?: string; // HH:mm
  // Для custom_time
  customTimes?: string[]; // массив времён ["09:00", "18:00"]
}

const WEEKDAYS = [
  { value: 0, label: 'Воскресенье' },
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
];

const PRESET_SCHEDULES = [
  { cron: '0 */1 * * *', label: 'Каждый час', type: 'hourly' as ScheduleType },
  { cron: '0 */2 * * *', label: 'Каждые 2 часа', type: 'hourly' as ScheduleType },
  { cron: '0 */4 * * *', label: 'Каждые 4 часа', type: 'hourly' as ScheduleType },
  { cron: '0 */6 * * *', label: 'Каждые 6 часов', type: 'hourly' as ScheduleType },
  { cron: '0 */12 * * *', label: 'Каждые 12 часов', type: 'hourly' as ScheduleType },
  { cron: '0 9 * * *', label: 'Ежедневно в 9:00', type: 'daily' as ScheduleType },
  { cron: '0 9 * * 1', label: 'По понедельникам в 9:00', type: 'weekly' as ScheduleType },
  { cron: '0 0 1 * *', label: '1-го числа в полночь', type: 'custom_time' as ScheduleType },
];

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    type: 'hourly',
    everyNHours: 6,
  });
  const [customTimeInput, setCustomTimeInput] = useState('');

  // Парсинг cron-выражения в конфигурацию
  useEffect(() => {
    const parsed = parseCronExpression(value);
    if (parsed) {
      setConfig(parsed);
    }
  }, [value]);

  // Генерация cron-выражения из конфигурации
  const generateCronExpression = (cfg: ScheduleConfig): string => {
    switch (cfg.type) {
      case 'hourly':
        return `0 */${cfg.everyNHours || 1} * * *`;

      case 'daily':
        const [dailyHour, dailyMinute] = (cfg.dailyTime || '09:00').split(':');
        return `${dailyMinute} ${dailyHour} * * *`;

      case 'weekly':
        const [weeklyHour, weeklyMinute] = (cfg.weeklyTime || '09:00').split(':');
        return `${weeklyMinute} ${weeklyHour} * * ${cfg.weekday || 1}`;

      case 'custom_time':
        if (cfg.customTimes && cfg.customTimes.length > 0) {
          const hours = cfg.customTimes.map(t => t.split(':')[0]).join(',');
          const minutes = cfg.customTimes.map(t => t.split(':')[1]).join(',');
          return `${minutes} ${hours} * * *`;
        }
        return '0 9 * * *';

      default:
        return '0 */6 * * *';
    }
  };

  // Генерация человекочитаемого описания
  const generateHumanReadable = (cfg: ScheduleConfig): string => {
    switch (cfg.type) {
      case 'hourly':
        return cfg.everyNHours === 1
          ? 'Каждый час'
          : `Каждые ${cfg.everyNHours} часов`;

      case 'daily':
        return `Ежедневно в ${cfg.dailyTime || '09:00'}`;

      case 'weekly':
        const weekday = WEEKDAYS.find(w => w.value === cfg.weekday);
        return `По ${weekday?.label.toLowerCase() || 'понедельникам'} в ${cfg.weeklyTime || '09:00'}`;

      case 'custom_time':
        if (cfg.customTimes && cfg.customTimes.length > 0) {
          return `В ${cfg.customTimes.join(', ')}`;
        }
        return 'По расписанию';

      default:
        return 'Не задано';
    }
  };

  const handleConfigChange = (newConfig: Partial<ScheduleConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);

    const cron = generateCronExpression(updated);
    const humanReadable = generateHumanReadable(updated);
    onChange(cron, humanReadable);
  };

  const handlePresetSelect = (cron: string) => {
    const preset = PRESET_SCHEDULES.find(p => p.cron === cron);
    if (preset) {
      const parsed = parseCronExpression(cron);
      if (parsed) {
        handleConfigChange(parsed);
      }
    }
  };

  const handleAddCustomTime = () => {
    if (!customTimeInput || !customTimeInput.match(/^\d{2}:\d{2}$/)) {
      return;
    }

    const times = [...(config.customTimes || []), customTimeInput];
    handleConfigChange({
      type: 'custom_time',
      customTimes: times.sort()
    });
    setCustomTimeInput('');
  };

  const handleRemoveCustomTime = (time: string) => {
    const times = (config.customTimes || []).filter(t => t !== time);
    handleConfigChange({ customTimes: times });
  };

  return (
    <Card className="p-6 bg-card border-border space-y-6">
      {/* Готовые шаблоны */}
      <div className="space-y-3">
        <Label className="text-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Готовые шаблоны
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRESET_SCHEDULES.map((preset) => (
            <Button
              key={preset.cron}
              variant="outline"
              size="sm"
              className={`justify-start ${
                value === preset.cron ? 'bg-blue-600 text-white border-blue-600' : ''
              }`}
              onClick={() => handlePresetSelect(preset.cron)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Тип расписания */}
      <div className="space-y-3">
        <Label className="text-foreground">Тип расписания</Label>
        <Select
          value={config.type}
          onValueChange={(value) => handleConfigChange({ type: value as ScheduleType })}
        >
          <SelectTrigger className="bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="hourly">Каждые N часов</SelectItem>
            <SelectItem value="daily">Ежедневно в заданное время</SelectItem>
            <SelectItem value="weekly">Еженедельно в заданный день</SelectItem>
            <SelectItem value="custom_time">Несколько раз в день</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Настройки для hourly */}
      {config.type === 'hourly' && (
        <div className="space-y-3">
          <Label className="text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Интервал в часах
          </Label>
          <Select
            value={String(config.everyNHours || 6)}
            onValueChange={(value) => handleConfigChange({ everyNHours: parseInt(value) })}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => (
                <SelectItem key={hours} value={String(hours)}>
                  {hours === 1 ? 'Каждый час' : `Каждые ${hours} часов`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Настройки для daily */}
      {config.type === 'daily' && (
        <div className="space-y-3">
          <Label className="text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Время запуска
          </Label>
          <Input
            type="time"
            value={config.dailyTime || '09:00'}
            onChange={(e) => handleConfigChange({ dailyTime: e.target.value })}
            className="bg-background border-border text-foreground"
          />
        </div>
      )}

      {/* Настройки для weekly */}
      {config.type === 'weekly' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              День недели
            </Label>
            <Select
              value={String(config.weekday || 1)}
              onValueChange={(value) => handleConfigChange({ weekday: parseInt(value) })}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Время запуска
            </Label>
            <Input
              type="time"
              value={config.weeklyTime || '09:00'}
              onChange={(e) => handleConfigChange({ weeklyTime: e.target.value })}
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>
      )}

      {/* Настройки для custom_time */}
      {config.type === 'custom_time' && (
        <div className="space-y-3">
          <Label className="text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Время запусков
          </Label>
          <div className="flex gap-2">
            <Input
              type="time"
              value={customTimeInput}
              onChange={(e) => setCustomTimeInput(e.target.value)}
              className="bg-background border-border text-foreground"
              placeholder="09:00"
            />
            <Button
              variant="outline"
              onClick={handleAddCustomTime}
              disabled={!customTimeInput}
            >
              Добавить
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(config.customTimes || []).map((time) => (
              <Badge
                key={time}
                className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                onClick={() => handleRemoveCustomTime(time)}
              >
                {time} ✕
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Предпросмотр */}
      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Расписание:</span>
          <span className="text-sm text-foreground font-medium">{generateHumanReadable(config)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cron выражение:</span>
          <code className="text-xs text-blue-600 dark:text-blue-400 bg-background px-2 py-1 rounded">
            {generateCronExpression(config)}
          </code>
        </div>
      </div>
    </Card>
  );
}

/**
 * Парсинг cron-выражения в конфигурацию
 */
function parseCronExpression(cron: string): ScheduleConfig | null {
  if (!cron) return null;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour, , , weekday] = parts;

  // Каждые N часов: "0 */N * * *"
  if (hour.startsWith('*/')) {
    const hours = parseInt(hour.substring(2));
    return {
      type: 'hourly',
      everyNHours: hours,
    };
  }

  // Еженедельно: "M H * * D"
  if (weekday !== '*' && !weekday.includes(',')) {
    return {
      type: 'weekly',
      weekday: parseInt(weekday),
      weeklyTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    };
  }

  // Несколько раз в день: "M1,M2 H1,H2 * * *"
  if (hour.includes(',') || minute.includes(',')) {
    const hours = hour.split(',');
    const minutes = minute.split(',');
    const times = hours.map((h, i) =>
      `${h.padStart(2, '0')}:${minutes[i]?.padStart(2, '0') || '00'}`
    );
    return {
      type: 'custom_time',
      customTimes: times,
    };
  }

  // Ежедневно: "M H * * *"
  if (hour !== '*' && minute !== '*') {
    return {
      type: 'daily',
      dailyTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    };
  }

  return null;
}
