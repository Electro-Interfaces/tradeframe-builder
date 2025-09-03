/**
 * Страница "Администрирование → Документы"
 * Главная страница управления правовыми документами
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Edit3, 
  History, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Download
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { legalDocumentsService } from '@/services/legalDocumentsService';
import { 
  DocumentTypeInfo, 
  DocumentStatistics,
  DOCUMENT_TYPES,
  DocumentType 
} from '@/types/legal';

interface DocumentCardProps {
  docType: DocumentTypeInfo;
  statistics?: DocumentStatistics;
  onEdit: (docType: DocumentType) => void;
  onHistory: (docType: DocumentType) => void;
  onPublishDraft: (docType: DocumentType) => void;
  onViewAcceptances: (docType: DocumentType) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  docType,
  statistics,
  onEdit,
  onHistory,
  onPublishDraft,
  onViewAcceptances
}) => {
  const isMobile = useIsMobile();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не опубликован';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    if (!docType.current_version) {
      return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
    return <CheckCircle className="w-5 h-5 text-slate-400" />;
  };

  const getStatusBadge = () => {
    if (!docType.current_version) {
      return <Badge variant="secondary" className="bg-slate-700 text-slate-300">Не опубликован</Badge>;
    }
    return <Badge className="bg-slate-600 text-slate-200">v{docType.current_version.version}</Badge>;
  };

  return (
    <Card className="bg-slate-800 border-slate-700 h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-white text-lg leading-tight">
                {docType.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon()}
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Информация о текущей версии */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Дата публикации:</span>
            <span className="text-slate-300">
              {formatDate(docType.current_version?.published_at)}
            </span>
          </div>
          
          {docType.current_version?.editor_name && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Автор:</span>
              <span className="text-slate-300">{docType.current_version.editor_name}</span>
            </div>
          )}
        </div>

        {/* Статистика согласий */}
        {statistics && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-400">Подписали</div>
                <div className="text-slate-200 font-medium">
                  {statistics.accepted_users} / {statistics.total_users}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Процент</div>
                <div className="text-slate-200 font-medium">
                  {statistics.acceptance_percentage}%
                </div>
              </div>
            </div>
            
            {statistics.pending_users > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-300">
                  {statistics.pending_users} пользователей требуют согласия
                </span>
              </div>
            )}
          </div>
        )}

        {/* Действия */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-2'} mt-4`}>
          <Button
            onClick={() => onEdit(docType.code)}
            variant="outline" 
            size="sm"
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
          
          <Button
            onClick={() => onHistory(docType.code)}
            variant="outline"
            size="sm" 
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            <History className="w-4 h-4 mr-2" />
            История
          </Button>
          
          {docType.current_version && (
            <>
              <Button
                onClick={() => onViewAcceptances(docType.code)}
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Users className="w-4 h-4 mr-2" />
                Согласия
              </Button>
              
              <Button
                onClick={() => onPublishDraft(docType.code)}
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Новая версия
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function LegalDocuments() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeInfo[]>([]);
  const [statistics, setStatistics] = useState<DocumentStatistics[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем данные при монтировании
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [types, stats] = await Promise.all([
        legalDocumentsService.getDocumentTypes(),
        legalDocumentsService.getDocumentStatistics()
      ]);
      
      setDocumentTypes(types);
      setStatistics(stats);
    } catch (error) {
      console.error('Ошибка загрузки данных документов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики действий
  const handleEdit = (docType: DocumentType) => {
    navigate(`/admin/legal-documents/${docType}/edit`);
  };

  const handleHistory = (docType: DocumentType) => {
    console.log('View history:', docType);
    // TODO: Навигация к истории версий
  };

  const handlePublishDraft = (docType: DocumentType) => {
    navigate(`/admin/legal-documents/${docType}/create`);
  };

  const handleViewAcceptances = (docType: DocumentType) => {
    // Переход к общему списку пользователей с фильтрацией по типу документа
    navigate(`/admin/legal-documents/users-acceptances?docType=${docType}`);
  };

  const handleViewAuditLog = () => {
    console.log('View audit log');
    // TODO: Навигация к журналу действий
  };

  const handleExportAcceptances = () => {
    console.log('Export acceptances');
    // TODO: Экспорт журнала согласий в CSV
  };

  if (loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full report-full-width">
          <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
            <h1 className="text-2xl font-semibold text-white">Правовые документы</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400">Загрузка документов...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Правовые документы</h1>
              <p className="text-slate-400 mt-2">
                Управление пользовательскими соглашениями, политиками конфиденциальности и согласиями
              </p>
            </div>
            
            {!isMobile && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/admin/legal-documents/users-acceptances')}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Согласия пользователей
                </Button>
                
                <Button
                  onClick={handleExportAcceptances}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт согласий
                </Button>
                
                <Button
                  onClick={handleViewAuditLog}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Журнал действий
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Сводка по всем документам */}
        <div className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Общая статистика
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-4'}`}>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">
                    {documentTypes.length}
                  </div>
                  <div className="text-sm text-slate-400">Типов документов</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-white">
                    {documentTypes.filter(d => d.current_version).length}
                  </div>
                  <div className="text-sm text-slate-400">Опубликовано</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-white">
                    {statistics.reduce((sum, s) => sum + s.total_users, 0)}
                  </div>
                  <div className="text-sm text-slate-400">Всего пользователей</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Мобильные кнопки действий */}
        {isMobile && (
          <div className="mx-4 md:mx-6 lg:mx-8 mb-6">
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => navigate('/admin/legal-documents/users-acceptances')}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Users className="w-4 h-4 mr-2" />
                Согласия пользователей
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleExportAcceptances}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт согласий
                </Button>
                
                <Button
                  onClick={handleViewAuditLog}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Журнал действий
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Карточки документов */}
        <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
            {documentTypes.map((docType) => {
              const docStatistics = statistics.find(s => s.doc_type_code === docType.code);
              
              return (
                <DocumentCard
                  key={docType.code}
                  docType={docType}
                  statistics={docStatistics}
                  onEdit={handleEdit}
                  onHistory={handleHistory}
                  onPublishDraft={handlePublishDraft}
                  onViewAcceptances={handleViewAcceptances}
                />
              );
            })}
          </div>
          
          {documentTypes.length === 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Документы не найдены
                </h3>
                <p className="text-slate-400">
                  В системе пока нет правовых документов
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}