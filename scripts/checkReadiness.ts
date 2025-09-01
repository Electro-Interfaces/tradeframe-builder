/**
 * 🔍 Скрипт проверки готовности к Production
 * 
 * Автоматически находит потенциальные проблемы в коде
 */

import fs from 'fs/promises';
import path from 'path';

interface Issue {
  type: 'critical' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

class ReadinessChecker {
  private issues: Issue[] = [];
  private srcPath = './src';

  async checkAll(): Promise<Issue[]> {
    console.log('🔍 Начинаем проверку готовности к production...\n');

    await this.checkTypeIssues();
    await this.checkSecurityIssues();
    await this.checkPerformanceIssues();
    await this.checkErrorHandling();
    await this.checkDataValidation();

    return this.issues;
  }

  private async checkTypeIssues() {
    console.log('📝 Проверяем типизацию...');
    
    const files = await this.getTypescriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Проверяем Record<string, any>
      const anyRecordMatches = content.match(/Record<string,\s*any>/g);
      if (anyRecordMatches) {
        this.addIssue('critical', file, {
          message: `Найдено ${anyRecordMatches.length} использований Record<string, any>`,
          suggestion: 'Заменить на строгие типы или union types'
        });
      }

      // Проверяем any типы
      const anyMatches = content.match(/:\s*any[\s,;|\]]/g);
      if (anyMatches) {
        this.addIssue('warning', file, {
          message: `Найдено ${anyMatches.length} использований типа any`,
          suggestion: 'Добавить строгую типизацию'
        });
      }

      // Проверяем @ts-ignore
      if (content.includes('@ts-ignore')) {
        this.addIssue('warning', file, {
          message: 'Используется @ts-ignore',
          suggestion: 'Исправить типы вместо игнорирования'
        });
      }
    }
  }

  private async checkSecurityIssues() {
    console.log('🔒 Проверяем безопасность...');
    
    const files = await this.getTypescriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Проверяем innerHTML без sanitization
      if (content.includes('innerHTML') && !content.includes('DOMPurify')) {
        this.addIssue('critical', file, {
          message: 'Использование innerHTML без sanitization',
          suggestion: 'Добавить DOMPurify.sanitize()'
        });
      }

      // Проверяем eval
      if (content.includes('eval(')) {
        this.addIssue('critical', file, {
          message: 'Использование eval()',
          suggestion: 'Убрать eval() - небезопасно'
        });
      }

      // Проверяем hardcoded пароли/токены
      const secrets = content.match(/(password|token|secret|key).*=.*["'][^"']+["']/gi);
      if (secrets) {
        this.addIssue('critical', file, {
          message: 'Возможные hardcoded секреты',
          suggestion: 'Перенести в переменные окружения'
        });
      }
    }
  }

  private async checkPerformanceIssues() {
    console.log('⚡ Проверяем производительность...');
    
    const files = await this.getReactFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Проверяем отсутствие React.memo для больших компонентов
      if (content.length > 500 && !content.includes('React.memo') && !content.includes('memo(')) {
        const hasProps = content.includes('Props');
        const hasState = content.includes('useState');
        
        if (hasProps && hasState) {
          this.addIssue('warning', file, {
            message: 'Большой компонент без мемоизации',
            suggestion: 'Рассмотреть использование React.memo'
          });
        }
      }

      // Проверяем inline объекты в JSX
      const inlineObjects = content.match(/style=\{\{[^}]+\}\}/g);
      if (inlineObjects && inlineObjects.length > 3) {
        this.addIssue('warning', file, {
          message: `${inlineObjects.length} inline стилей`,
          suggestion: 'Вынести в CSS классы или useMemo'
        });
      }

      // Проверяем отсутствие key в map
      const mapWithoutKey = content.match(/\.map\([^)]*\)\s*=>\s*<[^>]+(?!.*key=)/g);
      if (mapWithoutKey) {
        this.addIssue('warning', file, {
          message: 'Map без key prop',
          suggestion: 'Добавить уникальный key'
        });
      }
    }
  }

  private async checkErrorHandling() {
    console.log('🚨 Проверяем обработку ошибок...');
    
    const files = await this.getTypescriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Проверяем async функции без try-catch
      const asyncFunctions = content.match(/async\s+\w+[^{]*\{[^}]*await[^}]*\}/g);
      if (asyncFunctions) {
        for (const func of asyncFunctions) {
          if (!func.includes('try') && !func.includes('catch')) {
            this.addIssue('warning', file, {
              message: 'Async функция без обработки ошибок',
              suggestion: 'Добавить try-catch блок'
            });
          }
        }
      }

      // Проверяем fetch без обработки ошибок
      if (content.includes('fetch(') && !content.includes('.catch(') && !content.includes('try {')) {
        this.addIssue('warning', file, {
          message: 'Fetch запрос без обработки ошибок',
          suggestion: 'Добавить .catch() или try-catch'
        });
      }
    }
  }

  private async checkDataValidation() {
    console.log('✅ Проверяем валидацию данных...');
    
    const files = await this.getTypescriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Проверяем использование user input без валидации
      if (content.includes('input.value') || content.includes('form.')) {
        if (!content.includes('z.') && !content.includes('yup') && !content.includes('joi')) {
          this.addIssue('warning', file, {
            message: 'Пользовательский ввод без валидации',
            suggestion: 'Добавить схему валидации (Zod/Yup)'
          });
        }
      }

      // Проверяем прямое использование API данных
      if (content.includes('.json()') && !content.includes('Schema') && file.includes('services/')) {
        this.addIssue('info', file, {
          message: 'API данные без валидации схемы',
          suggestion: 'Добавить валидацию ответа от сервера'
        });
      }
    }
  }

  private async getTypescriptFiles(): Promise<string[]> {
    return this.getFilesRecursive(this.srcPath, ['.ts', '.tsx']);
  }

  private async getReactFiles(): Promise<string[]> {
    return this.getFilesRecursive(this.srcPath, ['.tsx']);
  }

  private async getFilesRecursive(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          files.push(...await this.getFilesRecursive(fullPath, extensions));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Игнорируем недоступные папки
    }
    
    return files;
  }

  private addIssue(type: Issue['type'], file: string, details: { message: string; suggestion?: string; line?: number }) {
    this.issues.push({
      type,
      file: file.replace(this.srcPath + '/', ''),
      ...details
    });
  }

  printReport() {
    const critical = this.issues.filter(i => i.type === 'critical');
    const warnings = this.issues.filter(i => i.type === 'warning');
    const info = this.issues.filter(i => i.type === 'info');

    console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:\n');

    if (critical.length > 0) {
      console.log('🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:', critical.length);
      critical.forEach(issue => {
        console.log(`  ❌ ${issue.file}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
      });
      console.log();
    }

    if (warnings.length > 0) {
      console.log('🟡 ПРЕДУПРЕЖДЕНИЯ:', warnings.length);
      warnings.forEach(issue => {
        console.log(`  ⚠️  ${issue.file}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
      });
      console.log();
    }

    if (info.length > 0) {
      console.log('🔵 ИНФОРМАЦИОННЫЕ:', info.length);
      info.forEach(issue => {
        console.log(`  ℹ️  ${issue.file}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
      });
      console.log();
    }

    // Общая оценка готовности
    const totalIssues = this.issues.length;
    const criticalWeight = critical.length * 3;
    const warningWeight = warnings.length * 1;
    const totalWeight = criticalWeight + warningWeight;

    let readinessScore = 100;
    if (totalWeight > 0) {
      readinessScore = Math.max(0, 100 - totalWeight * 5);
    }

    console.log('🎯 ОБЩАЯ ГОТОВНОСТЬ К PRODUCTION:');
    console.log(`   ${readinessScore}% (${this.getReadinessEmoji(readinessScore)})`);
    console.log(`   Всего проблем: ${totalIssues}`);
    
    if (readinessScore < 80) {
      console.log('   ⚠️  Рекомендуется исправить критические проблемы перед production');
    } else if (readinessScore < 95) {
      console.log('   ✅ Готово к production с небольшими доработками');
    } else {
      console.log('   🚀 Полностью готово к production!');
    }
  }

  private getReadinessEmoji(score: number): string {
    if (score >= 95) return '🚀';
    if (score >= 80) return '✅';
    if (score >= 60) return '🟡';
    return '🔴';
  }
}

// Запуск проверки
async function main() {
  const checker = new ReadinessChecker();
  await checker.checkAll();
  checker.printReport();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ReadinessChecker };