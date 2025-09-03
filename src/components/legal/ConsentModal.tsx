/**
 * Компонент модального окна принудительного согласия с правовыми документами
 * Блокирует доступ к приложению до получения согласия пользователя
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle2,
  Eye,
  Shield,
  Lock
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  UserConsentRequirement,
  DocumentType,
  DOCUMENT_TYPES
} from '@/types/legal';

interface ConsentModalProps {
  isOpen: boolean;
  consentRequirement: UserConsentRequirement | null;
  onAccept: (docType: DocumentType) => Promise<void>;
  onViewDocument: (docType: DocumentType) => void;
  onDownloadDocument: (docType: DocumentType) => void;
  onClose?: () => void;
  className?: string;
}

interface DocumentConsentState {
  [key: string]: {
    read: boolean;
    agreed: boolean;
    accepting: boolean;
  };
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  consentRequirement,
  onAccept,
  onViewDocument,
  onDownloadDocument,
  onClose,
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [consentStates, setConsentStates] = useState<DocumentConsentState>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Инициализируем состояния согласий
  useEffect(() => {
    if (consentRequirement?.pending_documents) {
      const initialStates: DocumentConsentState = {};
      consentRequirement.pending_documents.forEach(doc => {
        initialStates[doc.type] = {
          read: false,
          agreed: false,
          accepting: false
        };
      });
      setConsentStates(initialStates);
    }
  }, [consentRequirement]);

  const updateConsentState = (docType: DocumentType, updates: Partial<DocumentConsentState[string]>) => {
    setConsentStates(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        ...updates
      }
    }));
  };

  const handleReadConfirmation = (docType: DocumentType, isRead: boolean) => {
    updateConsentState(docType, { read: isRead });
    if (!isRead) {
      updateConsentState(docType, { agreed: false });
    }
  };

  const handleAgreementChange = (docType: DocumentType, isAgreed: boolean) => {
    updateConsentState(docType, { agreed: isAgreed });
  };

  const handleAcceptDocument = async (docType: DocumentType) => {
    updateConsentState(docType, { accepting: true });
    
    try {
      await onAccept(docType);
      // Удаляем документ из списка после успешного согласия
      setConsentStates(prev => {
        const newStates = { ...prev };
        delete newStates[docType];
        return newStates;
      });
    } catch (error) {
      console.error('Ошибка принятия согласия:', error);
      // Сбрасываем состояние в случае ошибки
      updateConsentState(docType, { accepting: false });
    }
  };

  const handleViewDocument = (docType: DocumentType) => {
    onViewDocument(docType);
    updateConsentState(docType, { read: true });
  };

  const handleDownloadDocument = (docType: DocumentType) => {
    onDownloadDocument(docType);
    updateConsentState(docType, { read: true });
  };

  // Проверяем, остались ли документы для согласия
  const remainingDocuments = consentRequirement?.pending_documents || [];
  const completedDocuments = remainingDocuments.filter(doc => !consentStates[doc.type]);
  const pendingDocuments = remainingDocuments.filter(doc => consentStates[doc.type]);

  // Если все согласия получены, можно закрыть модальное окно
  const allCompleted = remainingDocuments.length > 0 && completedDocuments.length === remainingDocuments.length;

  useEffect(() => {
    if (allCompleted && onClose) {
      onClose();
    }
  }, [allCompleted, onClose]);

  if (!consentRequirement || !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={false}>
      <DialogContent 
        className={`${isMobile ? 'w-[95vw] max-w-none' : 'max-w-4xl'} max-h-[90vh] bg-slate-800 border-slate-700 ${className}`}
        hideCloseButton={true}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white">
                Обновление правовых документов
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Для продолжения работы необходимо ознакомиться с обновленными документами
              </DialogDescription>
            </div>
          </div>

          {/* Индикатор прогресса */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">
                Прогресс согласия: {completedDocuments.length} из {remainingDocuments.length}
              </span>
              <Badge variant={allCompleted ? "default" : "secondary"} className="text-xs">
                {allCompleted ? "Завершено" : "В процессе"}
              </Badge>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${remainingDocuments.length > 0 ? (completedDocuments.length / remainingDocuments.length) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Предупреждение */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 font-medium">Важно!</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    Доступ к системе будет ограничен до тех пор, пока вы не ознакомитесь 
                    и не согласитесь со всеми обновленными документами. Это требование 
                    действующего законодательства.
                  </p>
                </div>
              </div>
            </div>

            {/* Список документов для согласия */}
            {pendingDocuments.map((doc, index) => {
              const state = consentStates[doc.type] || { read: false, agreed: false, accepting: false };
              
              return (
                <div key={doc.type} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{doc.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Версия {doc.version}
                          </Badge>
                          {state.read && (
                            <Badge className="bg-green-600 text-white text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Прочитано
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Действия с документом */}
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      onClick={() => handleViewDocument(doc.type)}
                      variant="outline"
                      size="sm"
                      className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Просмотр
                    </Button>
                    
                    <Button
                      onClick={() => handleDownloadDocument(doc.type)}
                      variant="outline"
                      size="sm"
                      className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Скачать PDF
                    </Button>
                  </div>

                  {/* Чекбоксы согласия */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`read-${doc.type}`}
                        checked={state.read}
                        onCheckedChange={(checked) => handleReadConfirmation(doc.type, !!checked)}
                        className="mt-1"
                      />
                      <label 
                        htmlFor={`read-${doc.type}`}
                        className="text-sm text-slate-300 leading-relaxed cursor-pointer"
                      >
                        Я ознакомился(ась) с документом "{doc.title}" версии {doc.version}
                      </label>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`agree-${doc.type}`}
                        checked={state.agreed}
                        onCheckedChange={(checked) => handleAgreementChange(doc.type, !!checked)}
                        disabled={!state.read}
                        className="mt-1"
                      />
                      <label 
                        htmlFor={`agree-${doc.type}`}
                        className={`text-sm leading-relaxed cursor-pointer ${
                          state.read ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Я согласен(на) с условиями документа "{doc.title}" 
                        и даю согласие на обработку персональных данных в соответствии с ними
                      </label>
                    </div>
                  </div>

                  {/* Кнопка принятия согласия */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <Button
                      onClick={() => handleAcceptDocument(doc.type)}
                      disabled={!state.read || !state.agreed || state.accepting}
                      className="w-full bg-green-600 hover:bg-green-500 text-white disabled:bg-slate-600 disabled:text-slate-400"
                      loading={state.accepting}
                    >
                      {state.accepting ? (
                        'Обработка...'
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Принять согласие
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Завершенные документы */}
            {completedDocuments.length > 0 && (
              <>
                <Separator className="bg-slate-600" />
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Завершенные согласия ({completedDocuments.length})
                  </h4>
                  <div className="space-y-2">
                    {completedDocuments.map(doc => (
                      <div key={doc.type} className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <div>
                            <span className="text-white font-medium">{doc.title}</span>
                            <span className="text-sm text-slate-300 ml-2">v{doc.version}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <div className="w-full">
            {allCompleted ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Все согласия получены!</span>
                </div>
                <p className="text-sm text-slate-300 text-center mt-2">
                  Доступ к системе будет восстановлен автоматически.
                </p>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Доступ ограничен</span>
                </div>
                <p className="text-sm text-slate-300 text-center mt-2">
                  Завершите процесс согласия для продолжения работы с системой.
                </p>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentModal;