import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface NameConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function NameConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
  title,
  description,
  loading = false
}: NameConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const isConfirmDisabled = inputValue !== itemName || loading;

  // Reset input when dialog opens with new item
  useEffect(() => {
    if (open) {
      setInputValue('');
    }
  }, [open, itemName]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('');
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (inputValue === itemName) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {title || `Удалить ${itemType}`}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {description || `Это действие нельзя отменить. Будет безвозвратно удален${itemType === 'сеть' ? 'а' : ''} "${itemName}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-red-300">
              ⚠️ Для подтверждения введите точное название {itemType === 'сеть' ? 'сети' : 'торговой точки'}:
            </p>
            <p className="font-mono text-sm text-white bg-slate-900 px-2 py-1 rounded mt-2">
              {itemName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmName" className="text-slate-200">
              Подтверждение удаления
            </Label>
            <Input
              id="confirmName"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Введите: ${itemName}`}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              autoComplete="off"
              disabled={loading}
            />
            {inputValue && inputValue !== itemName && (
              <p className="text-red-400 text-sm">
                Название не совпадает
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-400"
            >
              {loading ? 'Удаление...' : `Удалить ${itemType}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}