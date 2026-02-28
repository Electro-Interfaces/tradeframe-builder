/**
 * Диалог экспорта сменных отчетов
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { FileDown, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import type { ExportFormat, ExportMode } from '@/services/shiftReportExportService';
import { clearExportedFiles } from '@/services/shiftReportExportService';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat, mode: ExportMode, folderHandle?: any) => void;
  isExporting?: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  isExporting = false
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [mode, setMode] = useState<ExportMode>('simple');
  const [folderPath, setFolderPath] = useState('');
  const [folderHandle, setFolderHandle] = useState<any>(null);

  // Сбросить состояние при открытии диалога
  useEffect(() => {
    if (open) {
      setFormat('excel');
      setMode('simple');
      setFolderPath('');
      setFolderHandle(null);
    }
  }, [open]);

  const handleExport = () => {
    onExport(format, mode, mode === 'folder' ? folderHandle : undefined);
  };

  const handleClearCache = () => {
    if (folderHandle) {
      clearExportedFiles(folderHandle);
      alert(`История экспорта для папки "${folderPath}" очищена`);
    }
  };

  const handleSelectFolder = async () => {
    // Используем File System Access API для выбора папки
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        setFolderHandle(dirHandle); // Сохраняем handle для записи
        setFolderPath(dirHandle.name); // Имя папки для отображения
      } catch (err) {
        console.error('Ошибка выбора папки:', err);
      }
    } else {
      // Fallback для браузеров без поддержки File System Access API
      alert('Выбор папки не поддерживается в вашем браузере. Используйте режим "Скачать на компьютер".');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Экспорт сменного отчета</DialogTitle>
          <DialogDescription>
            Выберите формат и режим экспорта сменного отчета
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Выбор формата */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Формат файла</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal cursor-pointer">
                  Excel (.xlsx) - полная детализация с несколькими листами
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Выбор режима */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Режим экспорта</Label>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as ExportMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simple" id="simple" />
                <Label htmlFor="simple" className="font-normal cursor-pointer flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Скачать на компьютер
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="folder" id="folder" />
                <Label htmlFor="folder" className="font-normal cursor-pointer flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Экспорт в папку (пропускает существующие файлы)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Выбор папки (только для режима folder) */}
          {mode === 'folder' && (
            <div className="space-y-2">
              <Label htmlFor="folder-path">Папка для экспорта</Label>
              <div className="flex gap-2">
                <Input
                  id="folder-path"
                  value={folderPath}
                  placeholder="Выберите папку..."
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectFolder}
                  disabled={isExporting}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Обзор
                </Button>
                {folderHandle && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleClearCache}
                    disabled={isExporting}
                    title="Очистить кэш экспортированных файлов"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Система автоматически проверит наличие файлов и выгрузит только новые отчеты
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Отмена
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (mode === 'folder' && !folderPath)}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Экспортировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
