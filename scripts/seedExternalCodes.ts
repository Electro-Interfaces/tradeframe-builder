/**
 * Скрипт для массовой загрузки внешних кодов (external codes) в БД
 * 
 * Запуск:
 *   npx ts-node scripts/seedExternalCodes.ts
 * 
 * Или с флагами:
 *   npx ts-node scripts/seedExternalCodes.ts --dry-run     # Только показать что будет сделано
 *   npx ts-node scripts/seedExternalCodes.ts --network=bto # Только для сети БТО
 *   npx ts-node scripts/seedExternalCodes.ts --stations    # Только станции
 *   npx ts-node scripts/seedExternalCodes.ts --fuels       # Только топливо
 *   npx ts-node scripts/seedExternalCodes.ts --clear       # Очистить существующие коды перед добавлением
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  STATION_MAPPINGS,
  FUEL_MAPPINGS,
  getMappingsStats,
  StationMapping,
  FuelMapping,
  EXTERNAL_SYSTEMS
} from './externalCodesMappings';

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Используем service role key для полного доступа к БД
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Ошибка: Не заданы SUPABASE_URL или SUPABASE_KEY');
  console.error('Проверьте файлы .env или .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// ИНТЕРФЕЙСЫ
// ============================================================================

interface StationExternalCode {
  id: string;
  system: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Station {
  code: string;
  name: string;
  external_codes?: StationExternalCode[];
  [key: string]: unknown;
}

interface Tenant {
  id: string;
  code: string;
  name: string;
  settings: {
    stations?: Station[];
    [key: string]: unknown;
  };
}

interface CommandLineArgs {
  dryRun: boolean;
  network?: string;
  stationsOnly: boolean;
  fuelsOnly: boolean;
  clear: boolean;
  help: boolean;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    network: args.find(a => a.startsWith('--network='))?.split('=')[1],
    stationsOnly: args.includes('--stations') || args.includes('-s'),
    fuelsOnly: args.includes('--fuels') || args.includes('-f'),
    clear: args.includes('--clear') || args.includes('-c'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
Скрипт для массовой загрузки внешних кодов в БД

Использование:
  npx ts-node scripts/seedExternalCodes.ts [опции]

Опции:
  --dry-run, -d      Только показать что будет сделано (без записи в БД)
  --network=<code>   Обработать только указанную сеть (например: --network=bto)
  --stations, -s     Обработать только станции (АЗС)
  --fuels, -f        Обработать только топливо
  --clear, -c        Очистить существующие коды перед добавлением
  --help, -h         Показать эту справку

Примеры:
  npx ts-node scripts/seedExternalCodes.ts                    # Загрузить все коды
  npx ts-node scripts/seedExternalCodes.ts --dry-run          # Показать план
  npx ts-node scripts/seedExternalCodes.ts --network=bto      # Только сеть БТО
  npx ts-node scripts/seedExternalCodes.ts --stations --clear # Очистить и загрузить станции

Конфигурация маппингов:
  Файл: scripts/externalCodesMappings.ts
  `);
}

function generateId(): string {
  return `ec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[OK]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m'
  };
  console.log(`${prefix[type]} ${message}`);
}

// ============================================================================
// ЗАГРУЗКА КОДОВ ДЛЯ СТАНЦИЙ
// ============================================================================

async function loadStationCodes(args: CommandLineArgs): Promise<{ success: number; errors: number }> {
  log('Загрузка кодов для торговых точек (АЗС)...');
  
  const stats = { success: 0, errors: 0 };
  
  // Фильтруем маппинги по сети если указана
  const mappings = args.network 
    ? STATION_MAPPINGS.filter(m => m.networkCode === args.network)
    : STATION_MAPPINGS;
  
  if (mappings.length === 0) {
    log(`Нет маппингов для загрузки${args.network ? ` (сеть: ${args.network})` : ''}`, 'warn');
    return stats;
  }
  
  // Группируем маппинги по сетям
  const networkGroups = new Map<string, StationMapping[]>();
  mappings.forEach(m => {
    const list = networkGroups.get(m.networkCode) || [];
    list.push(m);
    networkGroups.set(m.networkCode, list);
  });
  
  // Обрабатываем каждую сеть
  for (const [networkCode, networkMappings] of networkGroups) {
    log(`\nСеть: ${networkCode.toUpperCase()}`);
    
    // Получаем tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', networkCode)
      .eq('type', 'network')
      .single();
    
    if (tenantError || !tenant) {
      log(`Сеть "${networkCode}" не найдена в БД`, 'error');
      stats.errors += networkMappings.length;
      continue;
    }
    
    const stations: Station[] = tenant.settings?.stations || [];
    let updated = false;
    
    // Обрабатываем каждую станцию в маппинге
    for (const mapping of networkMappings) {
      const stationIndex = stations.findIndex(s => s.code === mapping.stationCode);
      
      if (stationIndex === -1) {
        log(`  Станция ${mapping.stationCode} (${mapping.stationName}) не найдена`, 'error');
        stats.errors++;
        continue;
      }
      
      const station = stations[stationIndex];
      log(`  Станция ${mapping.stationCode}: ${mapping.stationName}`);
      
      // Получаем существующие коды или создаём пустой массив
      let existingCodes: StationExternalCode[] = station.external_codes || [];
      
      // Очищаем если указан флаг
      if (args.clear) {
        existingCodes = [];
        log(`    Очищены существующие коды`, 'warn');
      }
      
      // Добавляем новые коды
      for (const codeMapping of mapping.codes) {
        // Проверяем на дубликат
        const duplicate = existingCodes.find(
          ec => ec.system === codeMapping.system && ec.code === codeMapping.code && ec.isActive
        );
        
        if (duplicate) {
          log(`    [${codeMapping.system}] ${codeMapping.code} - уже существует`, 'warn');
          continue;
        }
        
        const newCode: StationExternalCode = {
          id: generateId(),
          system: codeMapping.system,
          code: codeMapping.code,
          description: codeMapping.description,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        
        existingCodes.push(newCode);
        
        const systemName = EXTERNAL_SYSTEMS[codeMapping.system]?.name || codeMapping.system;
        log(`    [${systemName}] ${codeMapping.code} - добавлен`, 'success');
        stats.success++;
      }
      
      // Обновляем станцию
      stations[stationIndex] = {
        ...station,
        external_codes: existingCodes
      };
      updated = true;
    }
    
    // Сохраняем изменения в БД
    if (updated && !args.dryRun) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            stations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id);
      
      if (updateError) {
        log(`Ошибка сохранения для сети ${networkCode}: ${updateError.message}`, 'error');
        stats.errors++;
      } else {
        log(`Сеть ${networkCode} сохранена в БД`, 'success');
      }
    } else if (args.dryRun) {
      log(`[DRY-RUN] Сеть ${networkCode} - изменения НЕ сохранены`, 'warn');
    }
  }
  
  return stats;
}

// ============================================================================
// ЗАГРУЗКА КОДОВ ДЛЯ ТОПЛИВА (НОМЕНКЛАТУРЫ)
// ============================================================================

async function loadFuelCodes(args: CommandLineArgs): Promise<{ success: number; errors: number }> {
  log('\nЗагрузка кодов для номенклатуры (виды топлива)...');
  
  const stats = { success: 0, errors: 0 };
  
  // Фильтруем маппинги по сети если указана
  const mappings = args.network 
    ? FUEL_MAPPINGS.filter(m => m.networkCode === args.network)
    : FUEL_MAPPINGS;
  
  if (mappings.length === 0) {
    log(`Нет маппингов топлива для загрузки${args.network ? ` (сеть: ${args.network})` : ''}`, 'warn');
    return stats;
  }
  
  // Группируем маппинги по сетям
  const networkGroups = new Map<string, FuelMapping[]>();
  mappings.forEach(m => {
    const list = networkGroups.get(m.networkCode) || [];
    list.push(m);
    networkGroups.set(m.networkCode, list);
  });
  
  for (const [networkCode, networkMappings] of networkGroups) {
    log(`\nСеть: ${networkCode.toUpperCase()} (номенклатура)`);
    
    // Получаем tenant для определения network_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, code, name')
      .eq('code', networkCode)
      .eq('type', 'network')
      .single();
    
    if (tenantError || !tenant) {
      log(`Сеть "${networkCode}" не найдена в БД`, 'error');
      stats.errors += networkMappings.length;
      continue;
    }
    
    // Получаем номенклатуру для этой сети
    const { data: nomenclature, error: nomError } = await supabase
      .from('fuel_nomenclature')
      .select('*')
      .eq('network_id', tenant.id);
    
    if (nomError) {
      log(`Ошибка загрузки номенклатуры: ${nomError.message}`, 'error');
      stats.errors += networkMappings.length;
      continue;
    }
    
    if (!nomenclature || nomenclature.length === 0) {
      log(`Номенклатура для сети ${networkCode} не найдена`, 'warn');
      log(`Сначала создайте номенклатуру через интерфейс`, 'warn');
      stats.errors += networkMappings.length;
      continue;
    }
    
    // Обрабатываем каждый вид топлива
    for (const mapping of networkMappings) {
      const fuelItem = nomenclature.find(n => n.internal_code === mapping.internalCode);
      
      if (!fuelItem) {
        log(`  Топливо "${mapping.internalCode}" (${mapping.fuelName}) не найдено`, 'error');
        stats.errors++;
        continue;
      }
      
      log(`  Топливо: ${mapping.fuelName} (${mapping.internalCode})`);
      
      // Получаем существующие коды
      const { data: existingCodes, error: codesError } = await supabase
        .from('nomenclature_external_codes')
        .select('*')
        .eq('nomenclature_id', fuelItem.id);
      
      if (codesError) {
        log(`    Ошибка загрузки кодов: ${codesError.message}`, 'error');
        stats.errors++;
        continue;
      }
      
      // Очищаем если указан флаг
      if (args.clear && !args.dryRun) {
        const { error: deleteError } = await supabase
          .from('nomenclature_external_codes')
          .delete()
          .eq('nomenclature_id', fuelItem.id);
        
        if (deleteError) {
          log(`    Ошибка очистки кодов: ${deleteError.message}`, 'error');
        } else {
          log(`    Очищены существующие коды`, 'warn');
        }
      }
      
      // Добавляем новые коды
      for (const codeMapping of mapping.codes) {
        // Преобразуем system в формат БД (CRM, 1C, PROCESSING, OTHER)
        const systemType = mapSystemToDbType(codeMapping.system);
        
        // Проверяем на дубликат
        const duplicate = (existingCodes || []).find(
          ec => ec.system_type === systemType && ec.external_code === codeMapping.code
        );
        
        if (duplicate && !args.clear) {
          log(`    [${codeMapping.system}] ${codeMapping.code} - уже существует`, 'warn');
          continue;
        }
        
        if (!args.dryRun) {
          const { error: insertError } = await supabase
            .from('nomenclature_external_codes')
            .insert({
              nomenclature_id: fuelItem.id,
              system_type: systemType,
              external_code: codeMapping.code,
              description: codeMapping.description || `${EXTERNAL_SYSTEMS[codeMapping.system]?.name || codeMapping.system}: ${mapping.fuelName}`
            });
          
          if (insertError) {
            log(`    [${codeMapping.system}] ${codeMapping.code} - ошибка: ${insertError.message}`, 'error');
            stats.errors++;
            continue;
          }
        }
        
        const systemName = EXTERNAL_SYSTEMS[codeMapping.system]?.name || codeMapping.system;
        log(`    [${systemName}] ${codeMapping.code} - добавлен`, 'success');
        stats.success++;
      }
    }
  }
  
  return stats;
}

/**
 * Преобразование кода системы в формат БД
 */
function mapSystemToDbType(system: string): 'CRM' | '1C' | 'PROCESSING' | 'OTHER' {
  const mapping: Record<string, 'CRM' | '1C' | 'PROCESSING' | 'OTHER'> = {
    'crm': 'CRM',
    '1c': '1C',
    'processing': 'PROCESSING',
    // Все остальные системы маппятся в OTHER
    'msto': 'OTHER',
    'sts': 'OTHER',
    'fuelup': 'OTHER',
    'yandex': 'OTHER',
    'benzuber': 'OTHER'
  };
  return mapping[system] || 'OTHER';
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================================

async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }
  
  console.log('\n========================================');
  console.log('  Загрузка внешних кодов (External Codes)');
  console.log('========================================\n');
  
  if (args.dryRun) {
    log('Режим DRY-RUN: изменения НЕ будут сохранены в БД\n', 'warn');
  }
  
  // Показываем статистику маппингов
  const mappingsStats = getMappingsStats();
  log(`Статистика маппингов:`);
  log(`  Сетей: ${mappingsStats.totalNetworks}`);
  log(`  Станций: ${mappingsStats.totalStations}`);
  log(`  Видов топлива: ${mappingsStats.totalFuels}`);
  log(`  Систем: ${mappingsStats.totalSystems} (${mappingsStats.systems.join(', ')})`);
  
  if (args.network) {
    log(`\nФильтр по сети: ${args.network}`, 'warn');
  }
  
  const totalStats = { success: 0, errors: 0 };
  
  // Загружаем коды для станций
  if (!args.fuelsOnly) {
    const stationStats = await loadStationCodes(args);
    totalStats.success += stationStats.success;
    totalStats.errors += stationStats.errors;
  }
  
  // Загружаем коды для топлива
  if (!args.stationsOnly) {
    const fuelStats = await loadFuelCodes(args);
    totalStats.success += fuelStats.success;
    totalStats.errors += fuelStats.errors;
  }
  
  // Итоги
  console.log('\n========================================');
  console.log('  Итоги');
  console.log('========================================');
  log(`Успешно: ${totalStats.success}`, 'success');
  if (totalStats.errors > 0) {
    log(`Ошибок: ${totalStats.errors}`, 'error');
  }
  
  if (args.dryRun) {
    log('\nРежим DRY-RUN: изменения НЕ были сохранены в БД', 'warn');
    log('Для реального выполнения запустите без флага --dry-run', 'info');
  }
}

// Запуск
main().catch(err => {
  console.error('Критическая ошибка:', err);
  process.exit(1);
});
