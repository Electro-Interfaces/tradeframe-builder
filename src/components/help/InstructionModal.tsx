/**
 * Модальное окно для отображения инструкций пользователям
 */

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Book, 
  Calendar, 
  User, 
  Eye, 
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';

import { instructionsService } from '@/services/instructionsService';
import type { InstructionForUser } from '@/types/instructions';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructionKey: string; // Ключ или маршрут для поиска инструкции
}

export function InstructionModal({ isOpen, onClose, instructionKey }: InstructionModalProps) {
  const [instruction, setInstruction] = useState<InstructionForUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && instructionKey) {
      loadInstruction();
    }
  }, [isOpen, instructionKey]);

  const loadInstruction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await instructionsService.getInstructionForUser(instructionKey);
      setInstruction(data);
      
      // Логируем просмотр
      if (data) {
        await instructionsService.logView(data.topic.id, data.version.id, 'current_user');
      }
    } catch (err) {
      console.error('Ошибка загрузки инструкции:', err);
      setError('Не удалось загрузить инструкцию');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInstruction(null);
    setError(null);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-slate-400">Загрузка инструкции...</span>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-slate-400 mb-4">{error}</p>
            <Button onClick={loadInstruction} variant="outline">
              Попробовать снова
            </Button>
          </div>
        )}

        {!loading && !error && !instruction && (
          <div className="p-12 text-center">
            <Book className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Инструкция не найдена
            </h3>
            <p className="text-slate-400 mb-4 max-w-md mx-auto">
              Для этой страницы пока не создана инструкция. Если у вас есть права администратора, 
              вы можете создать её в разделе управления инструкциями.
            </p>
            <div className="text-sm text-slate-500 bg-slate-900 rounded px-3 py-2 inline-block font-mono">
              Ключ поиска: {instructionKey}
            </div>
          </div>
        )}

        {instruction && (
          <>
            <DialogHeader className="pb-4 border-b border-slate-600">
              <DialogTitle className="text-xl font-semibold text-white mb-2">
                {instruction.topic.title}
              </DialogTitle>
              
              {instruction.topic.description && (
                <DialogDescription className="text-slate-300">
                  {instruction.topic.description}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-6">
              <div 
                className="instruction-content"
                dangerouslySetInnerHTML={{ 
                  __html: instruction.version.content_html 
                }}
              />
            </div>

            <div className="pt-4 border-t border-slate-600 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Обновлено: {instruction.version.published_at 
                  ? formatDate(instruction.version.published_at)
                  : formatDate(instruction.version.created_at)
                } · Версия {instruction.version.version}
              </div>
              
              <Button 
                onClick={handleClose} 
                variant="outline"
                className="text-white border-slate-600 hover:bg-slate-700"
              >
                Закрыть
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}