/**
 * Компонент-защитник для проверки согласий пользователей
 * Блокирует доступ к приложению до получения всех необходимых согласий
 */

import React, { useState, useEffect } from 'react';
import { ConsentModal } from './ConsentModal';
import { legalDocumentsService } from '@/services/legalDocumentsService';
import { createDocumentHtml } from '@/utils/markdownToHtml';
import { 
  UserConsentRequirement,
  DocumentType
} from '@/types/legal';

interface LegalConsentGuardProps {
  children: React.ReactNode;
  userId?: string;
}

export const LegalConsentGuard: React.FC<LegalConsentGuardProps> = ({ 
  children, 
  userId = 'current_user' 
}) => {
  const [consentRequirement, setConsentRequirement] = useState<UserConsentRequirement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Проверяем статус согласий при загрузке компонента
  useEffect(() => {
    checkUserConsentStatus();
  }, [userId]);

  const checkUserConsentStatus = async () => {
    try {
      setIsLoading(true);
      const requirement = await legalDocumentsService.getUserConsentRequirement(userId);
      
      setConsentRequirement(requirement);
      
      // Показываем модальное окно если есть незакрытые согласия
      setIsModalOpen(requirement.pending_documents.length > 0);
      
    } catch (error) {
      console.error('Ошибка проверки статуса согласий:', error);
      // В случае ошибки разрешаем доступ (fallback)
      setIsModalOpen(false);
    } finally {
      // Быстро убираем загрузку
      setTimeout(() => setIsLoading(false), 100);
    }
  };

  const handleAcceptDocument = async (docType: DocumentType) => {
    try {
      await legalDocumentsService.acceptDocument(docType, userId);
      
      // Перепроверяем статус после принятия согласия
      await checkUserConsentStatus();
      
    } catch (error) {
      console.error('Ошибка принятия согласия:', error);
      throw error;
    }
  };

  const handleViewDocument = (docType: DocumentType) => {
    // Открываем документ в новой вкладке для просмотра
    window.open(`/admin/legal-documents/${docType}/view`, '_blank');
  };

  const handleDownloadDocument = async (docType: DocumentType) => {
    try {
      // Получаем текущую версию документа
      const docInfo = await legalDocumentsService.getDocumentTypeInfo(docType);
      if (!docInfo.current_version) {
        console.error('Документ не опубликован');
        return;
      }

      // Создаем HTML документ для печати/PDF
      const htmlDocument = createDocumentHtml(
        docInfo.title,
        docInfo.current_version.content_md || '',
        docInfo.current_version.version,
        docInfo.current_version.published_at || ''
      );
      
      // Открываем новое окно с документом
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(htmlDocument);
      printWindow.document.close();
      
      // Запускаем печать автоматически
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
    }
  };

  const handleModalClose = () => {
    // Модальное окно нельзя закрыть пока не получены все согласия
    // Проверяем статус еще раз
    checkUserConsentStatus();
  };

  // Показываем загрузку во время проверки
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Проверка правовых документов...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Основное приложение */}
      {children}

      {/* Модальное окно согласий (блокирующее) */}
      <ConsentModal
        isOpen={isModalOpen}
        consentRequirement={consentRequirement}
        onAccept={handleAcceptDocument}
        onViewDocument={handleViewDocument}
        onDownloadDocument={handleDownloadDocument}
        onClose={handleModalClose}
      />
    </>
  );
};

export default LegalConsentGuard;