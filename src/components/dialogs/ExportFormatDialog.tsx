import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Table, FileImage } from "lucide-react";

export type ExportFormat = 'html' | 'pdf' | 'excel';

interface ExportFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (format: ExportFormat) => void;
}

export function ExportFormatDialog({ open, onOpenChange, onConfirm }: ExportFormatDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');

  const handleConfirm = () => {
    onConfirm(selectedFormat);
    onOpenChange(false);
  };

  const formatOptions = [
    {
      id: 'html' as ExportFormat,
      title: 'HTML с графиками',
      description: 'Интерактивные диаграммы и возможность просмотра в браузере',
      icon: FileText,
      color: 'text-blue-500'
    },
    {
      id: 'pdf' as ExportFormat,
      title: 'PDF документ',
      description: 'Профессиональный отчет с графиками для печати и отправки',
      icon: FileImage,
      color: 'text-red-500'
    },
    {
      id: 'excel' as ExportFormat,
      title: 'Excel таблица',
      description: 'Данные для анализа в Excel с KPI дашбордом',
      icon: Table,
      color: 'text-green-500'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Выберите формат экспорта</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {formatOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-800 ${
                  selectedFormat === option.id 
                    ? 'border-blue-500 bg-slate-800' 
                    : 'border-slate-600'
                }`}
                onClick={() => setSelectedFormat(option.id)}
              >
                <div className="flex-shrink-0">
                  <Icon className={`w-6 h-6 ${option.color}`} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{option.title}</div>
                  <div className="text-sm text-slate-400">{option.description}</div>
                </div>
                <div className="flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedFormat === option.id 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-slate-400'
                  }`}>
                    {selectedFormat === option.id && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Экспортировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}