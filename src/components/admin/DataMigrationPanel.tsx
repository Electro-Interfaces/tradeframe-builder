/**
 * Панель для экспорта/импорта данных и миграции в БД
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { persistentStorage, PersistentStorage } from '@/utils/persistentStorage';

// Создаем псевдонимы для удобства
const PersistentStorageInstance = persistentStorage;
const MigrationGenerator = PersistentStorage;
import { 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  FileText, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DataMigrationPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportData, setExportData] = useState<Record<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Получить информацию о хранилище
  const storageInfo = PersistentStorageInstance.getStorageSize();
  const storagePercent = storageInfo.percentage;
  const storageSizeMB = (storageInfo.used / (1024 * 1024)).toFixed(2);

  // Экспорт всех данных
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const data = PersistentStorageInstance.exportAll();
      setExportData(data);
      
      toast({
        title: "✅ Данные подготовлены к экспорту",
        description: `Собрано ${Object.keys(data.data).length} коллекций данных`,
      });
    } catch (error) {
      toast({
        title: "❌ Ошибка экспорта",
        description: "Не удалось подготовить данные",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Скачать JSON файл
  const handleDownloadJSON = () => {
    if (!exportData) return;
    PersistentStorageInstance.exportToFile();
    toast({
      title: "💾 JSON файл загружен",
      description: "Данные сохранены в формате JSON для миграции",
    });
  };

  // Скачать SQL файл
  const handleDownloadSQL = () => {
    if (!exportData) return;
    MigrationGenerator.exportSQLToFile(exportData);
    toast({
      title: "📄 SQL файл загружен", 
      description: "Сгенерированы SQL команды для миграции в PostgreSQL",
    });
  };

  // Импорт данных из файла
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: "❌ Неверный формат файла",
        description: "Поддерживаются только JSON файлы",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      await PersistentStorageInstance.importFromFile(file);
      toast({
        title: "📥 Данные импортированы",
        description: "Все данные успешно загружены в localStorage",
      });
      // Перезагрузим страницу для применения импортированных данных
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast({
        title: "❌ Ошибка импорта",
        description: error instanceof Error ? error.message : "Не удалось импортировать данные",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Очистим input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Очистить все данные
  const handleClearAll = () => {
    if (!confirm('⚠️ Вы уверены что хотите удалить ВСЕ данные?\n\nЭто действие необратимо!')) {
      return;
    }
    
    try {
      PersistentStorage.clearAll();
      toast({
        title: "🗑️ Все данные очищены",
        description: "localStorage полностью очищен",
      });
      // Перезагрузим страницу
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: "❌ Ошибка очистки",
        description: "Не удалось очистить данные",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Миграция данных</h1>
          <p className="text-muted-foreground">
            Экспорт и импорт данных для миграции в реальную базу данных
          </p>
        </div>
      </div>

      {/* Информация о хранилище */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Состояние локального хранилища
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Использовано места:</span>
            <Badge variant={storagePercent > 80 ? 'destructive' : storagePercent > 60 ? 'secondary' : 'default'}>
              {storageSizeMB} MB ({storagePercent.toFixed(1)}%)
            </Badge>
          </div>
          <Progress value={storagePercent} className="h-2" />
          
          {storagePercent > 80 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Хранилище заполнено более чем на 80%. Рекомендуется очистить старые данные или экспортировать в БД.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Экспорт данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Экспорт данных
          </CardTitle>
          <CardDescription>
            Создание резервной копии всех данных для миграции в реальную базу данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleExportAll} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>⏳ Подготовка данных...</>
            ) : (
              <>📦 Подготовить данные к экспорту</>
            )}
          </Button>

          {exportData && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Данные подготовлены! Найдено коллекций: {Object.keys(exportData.data).length}
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  onClick={handleDownloadJSON}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Скачать JSON
                </Button>
                
                <Button 
                  onClick={handleDownloadSQL}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Скачать SQL миграцию
                </Button>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>JSON файл</strong> - для резервного копирования и импорта обратно<br/>
                  <strong>SQL файл</strong> - для миграции в PostgreSQL (требует проверки перед выполнением!)
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Импорт данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Импорт данных
          </CardTitle>
          <CardDescription>
            Восстановление данных из JSON файла
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
            disabled={isImporting}
          />
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="outline"
            className="w-full"
          >
            {isImporting ? (
              <>⏳ Импорт данных...</>
            ) : (
              <>📁 Выбрать JSON файл для импорта</>
            )}
          </Button>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Импорт заменит все текущие данные! Сделайте резервную копию перед импортом.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Очистка данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Очистка данных
          </CardTitle>
          <CardDescription>
            Полная очистка локального хранилища
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleClearAll}
            variant="destructive"
            className="w-full"
          >
            🗑️ Очистить все данные
          </Button>
          
          <Alert className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Внимание!</strong> Это действие удалит все данные безвозвратно. 
              Убедитесь что у вас есть резервная копия!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Инструкции по миграции */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Инструкции по миграции</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h4>Шаги для перехода на реальную БД:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Экспортируйте данные</strong> в JSON формат для резервной копии</li>
            <li><strong>Сгенерируйте SQL миграцию</strong> и проверьте её перед выполнением</li>
            <li><strong>Создайте базу данных</strong> PostgreSQL с необходимыми таблицами</li>
            <li><strong>Выполните SQL миграцию</strong> для загрузки данных в БД</li>
            <li><strong>Обновите конфигурацию</strong>: установите <code>VITE_USE_HTTP_API=true</code></li>
            <li><strong>Переключите сервисы</strong> с mock на HTTP клиенты</li>
            <li><strong>Протестируйте</strong> работу с реальным API</li>
          </ol>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Подробный план миграции описан в файле <code>PRODUCTION_MIGRATION.md</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}