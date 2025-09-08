import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, MessageCircle, Mail, HardDrive } from 'lucide-react';

export interface ExportChannels {
  local: boolean;
  telegram: boolean;
  email: boolean;
}

interface ExportChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (channels: ExportChannels) => void;
  operationsCount: number;
}

export function ExportChannelDialog({
  open,
  onOpenChange,
  onConfirm,
  operationsCount
}: ExportChannelDialogProps) {
  const [channels, setChannels] = useState<ExportChannels>({
    local: true, // По умолчанию всегда сохраняем локально
    telegram: false,
    email: false
  });

  const handleChannelChange = (channel: keyof ExportChannels, checked: boolean) => {
    setChannels(prev => ({
      ...prev,
      [channel]: checked
    }));
  };

  const handleConfirm = () => {
    onConfirm(channels);
    onOpenChange(false);
  };

  const hasAnyChannel = channels.local || channels.telegram || channels.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Выбор каналов экспорта
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Выберите, куда отправить отчет с {operationsCount} операциями:
          </p>
          
          <div className="space-y-3">
            {/* Локальное сохранение */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="local"
                checked={channels.local}
                onCheckedChange={(checked) => handleChannelChange('local', !!checked)}
              />
              <label htmlFor="local" className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <HardDrive className="w-4 h-4 text-blue-500" />
                Сохранить на компьютер
              </label>
            </div>
            
            {/* Telegram */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="telegram"
                checked={channels.telegram}
                onCheckedChange={(checked) => handleChannelChange('telegram', !!checked)}
              />
              <label htmlFor="telegram" className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                Отправить в Telegram
              </label>
            </div>
            
            {/* Email */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="email"
                checked={channels.email}
                onCheckedChange={(checked) => handleChannelChange('email', !!checked)}
              />
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <Mail className="w-4 h-4 text-green-500" />
                Отправить по Email
              </label>
            </div>
          </div>
          
          {!hasAnyChannel && (
            <p className="text-sm text-red-500">
              Выберите хотя бы один канал для отправки
            </p>
          )}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasAnyChannel}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}