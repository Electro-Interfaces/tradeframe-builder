/**
 * CronBuilder - Визуальный конструктор cron-выражений
 * Упрощенный интерфейс с понятными полями и подсказками
 */

import { useState, useEffect } from 'react';
import { Clock, Calendar, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cronToHumanReadable, isValidCron } from '@/utils/scheduleFormatter';

interface CronBuilderProps {
  value: string; // cron expression
  onChange: (cronExpression: string, humanReadable: string) => void;
}

const PRESET_SCHEDULES = [
  { cron: '0 */1 * * *', label: 'Каждый час', icon: '🕐' },
  { cron: '0 */2 * * *', label: 'Каждые 2 часа', icon: '🕑' },
  { cron: '0 */4 * * *', label: 'Каждые 4 часа', icon: '🕓' },
  { cron: '0 */6 * * *', label: 'Каждые 6 часов', icon: '🕕' },
  { cron: '0 */12 * * *', label: 'Каждые 12 часов', icon: '🕛' },
  { cron: '0 8 * * *', label: 'Ежедневно в 8:00', icon: '📅' },
  { cron: '0 8 * * 1', label: 'Понедельники 8:00', icon: '📆' },
  { cron: '0 8,18 * * *', label: 'В 8:00 и 18:00', icon: '⏰' },
  { cron: '0 0 1 * *', label: '1-го числа 00:00', icon: '🗓️' },
  { cron: '*/30 * * * *', label: 'Каждые 30 минут', icon: '⏱️' },
];

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [cron, setCron] = useState(value || '0 */6 * * *');
  const [isValid, setIsValid] = useState(true);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (value) {
      setCron(value);
    }
  }, [value]);

  useEffect(() => {
    const valid = isValidCron(cron);
    setIsValid(valid);

    if (valid) {
      const desc = cronToHumanReadable(cron);
      setDescription(desc);
      onChange(cron, desc);
    } else {
      setDescription('Некорректное выражение');
    }
  }, [cron]);

  const handlePresetClick = (presetCron: string) => {
    setCron(presetCron);
  };

  const handleCronChange = (newCron: string) => {
    setCron(newCron);
  };

  return (
    <div className="space-y-4">
      {/* Готовые шаблоны */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <Label className="text-foreground font-semibold">Быстрый выбор расписания</Label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_SCHEDULES.map((preset) => (
            <Button
              key={preset.cron}
              variant="outline"
              size="sm"
              className={`justify-start text-left h-auto py-3 px-3 ${
                cron === preset.cron
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'hover:bg-secondary'
              }`}
              onClick={() => handlePresetClick(preset.cron)}
            >
              <div className="flex items-start gap-2 w-full">
                <span className="text-xl flex-shrink-0 mt-0.5">{preset.icon}</span>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {preset.label}
                  </span>
                  <code className="text-xs text-muted-foreground font-mono">
                    {preset.cron}
                  </code>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Ручной ввод Cron */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <Label className="text-foreground font-semibold">Cron выражение</Label>
        </div>

        <div className="space-y-3">
          {/* Поле ввода */}
          <div className="relative">
            <Input
              value={cron}
              onChange={(e) => handleCronChange(e.target.value)}
              className={`bg-background border-border text-foreground font-mono text-base pr-10 ${
                !isValid ? 'border-red-500' : 'border-green-600'
              }`}
              placeholder="0 */6 * * *"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>

          {/* Расшифровка */}
          <div className={`p-3 rounded-lg border ${
            isValid
              ? 'bg-emerald-100 dark:bg-emerald-900/20 border-green-300 dark:border-green-700'
              : 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          }`}>
            <div className="flex items-start gap-2">
              <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`} />
              <div className="flex-1">
                <div className={`text-sm font-semibold mb-1 ${
                  isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {isValid ? 'Расписание:' : 'Ошибка:'}
                </div>
                <div className={`text-sm ${
                  isValid ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
                }`}>
                  {description}
                </div>
              </div>
            </div>
          </div>

          {/* Подсказка по структуре */}
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
              📋 Структура Cron выражения:
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              <div className="text-center">
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-1">M</div>
                <div className="text-[10px] text-muted-foreground">Минута</div>
                <div className="text-[10px] text-muted-foreground">0-59</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-1">H</div>
                <div className="text-[10px] text-muted-foreground">Час</div>
                <div className="text-[10px] text-muted-foreground">0-23</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-1">D</div>
                <div className="text-[10px] text-muted-foreground">День</div>
                <div className="text-[10px] text-muted-foreground">1-31</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-1">M</div>
                <div className="text-[10px] text-muted-foreground">Месяц</div>
                <div className="text-[10px] text-muted-foreground">1-12</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-1">W</div>
                <div className="text-[10px] text-muted-foreground">День нед.</div>
                <div className="text-[10px] text-muted-foreground">0-6</div>
              </div>
            </div>

            <div className="text-xs text-foreground/80 space-y-1 border-t border-blue-800 pt-2">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-600 text-blue-600 dark:text-blue-400">*</Badge>
                <span className="text-muted-foreground">любое значение</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-600 text-blue-600 dark:text-blue-400">*/N</Badge>
                <span className="text-muted-foreground">каждые N (например: */6 = каждые 6)</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-600 text-blue-600 dark:text-blue-400">A,B</Badge>
                <span className="text-muted-foreground">список (например: 9,12,18)</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-600 text-blue-600 dark:text-blue-400">A-B</Badge>
                <span className="text-muted-foreground">диапазон (например: 9-17)</span>
              </div>
            </div>
          </div>

          {/* Примеры */}
          <div className="p-3 bg-background rounded-lg border border-border">
            <div className="text-xs font-semibold text-foreground/80 mb-2">
              💡 Примеры:
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <code className="text-blue-600 dark:text-blue-400 font-mono">0 */6 * * *</code>
                <span className="text-muted-foreground">→ Каждые 6 часов</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <code className="text-blue-600 dark:text-blue-400 font-mono">0 8 * * *</code>
                <span className="text-muted-foreground">→ Ежедневно в 8:00</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <code className="text-blue-600 dark:text-blue-400 font-mono">0 8 * * 1</code>
                <span className="text-muted-foreground">→ По понедельникам в 8:00</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <code className="text-blue-600 dark:text-blue-400 font-mono">0 8,18 * * *</code>
                <span className="text-muted-foreground">→ В 8:00 и 18:00</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <code className="text-blue-600 dark:text-blue-400 font-mono">*/30 * * * *</code>
                <span className="text-muted-foreground">→ Каждые 30 минут</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <code className="text-blue-600 dark:text-blue-400 font-mono">0 8-17 * * 1-5</code>
                <span className="text-muted-foreground">→ Раб. дни 8:00-17:00</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
