import { Info, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface UpdateInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: {
    version: string;
    buildNumber: string;
    hasUpdate: boolean;
    swRegistrations: number;
    swActive: boolean;
    swWaiting: boolean;
    swScope: string;
    lastCheck: string;
  } | null;
}

export const UpdateInfoDialog: React.FC<UpdateInfoDialogProps> = ({
  open,
  onOpenChange,
  details
}) => {
  if (!details) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Статус обновлений
          </DialogTitle>
          <DialogDescription>
            Подробная информация о проверке обновлений приложения
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Текущая версия:</span>
            <Badge variant="outline">v{details.version}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Сборка:</span>
            <Badge variant="secondary">#{details.buildNumber}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Статус:</span>
            {details.hasUpdate ? (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Обновление найдено
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-green-400 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Актуальная версия
              </Badge>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Техническая информация:</h4>

            <div className="text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Service Worker:</span>
                <span className={details.swActive ? 'text-green-400' : 'text-red-400'}>
                  {details.swActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Ожидающие обновления:</span>
                <span className={details.swWaiting ? 'text-orange-400' : 'text-green-400'}>
                  {details.swWaiting ? 'Есть' : 'Нет'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Последняя проверка:</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{details.lastCheck}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`text-xs p-3 rounded-md ${
            details.hasUpdate
              ? 'text-orange-200 bg-orange-500/10 border border-orange-500/20'
              : 'text-muted-foreground bg-muted/30'
          }`}>
            {details.hasUpdate ? (
              <p>
                🔄 <strong>Обновление найдено!</strong> Новая версия TradeFrame устанавливается.
                Страница автоматически перезагрузится через несколько секунд.
              </p>
            ) : (
              <p>
                ✨ <strong>Хорошие новости!</strong> У вас установлена последняя версия TradeFrame.
                Система автоматически проверяет обновления и уведомит вас, когда появится новая версия.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateInfoDialog;