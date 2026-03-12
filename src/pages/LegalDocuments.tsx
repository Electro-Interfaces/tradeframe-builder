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
import { HelpButton } from "@/components/help/HelpButton";
import { legalDocumentsService } from '@/services/legalDocumentsService';
import { loadXlsx } from '@/utils/xlsxLoader';
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
      return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
    return <CheckCircle className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusBadge = () => {
    if (!docType.current_version) {
      return <Badge variant="secondary" className="bg-secondary text-foreground/80">Не опубликован</Badge>;
    }
    return <Badge className="bg-secondary text-foreground">v{docType.current_version.version}</Badge>;
  };

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-foreground text-base leading-tight mb-1 h-10 flex items-center">
                {docType.title}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Информация о текущей версии - компактно */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground/80 truncate">
              {formatDate(docType.current_version?.published_at).split(',')[0]}
            </span>
          </div>

          {docType.current_version?.editor_name && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground/80 truncate">{docType.current_version.editor_name}</span>
            </div>
          )}
        </div>

        {/* Статистика согласий - компактно */}
        {statistics && (
          <div className="bg-secondary/50 rounded-lg p-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Подписали</div>
                  <div className="text-sm text-foreground font-semibold">
                    {statistics.accepted_users} / {statistics.total_users}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Процент</div>
                  <div className="text-sm text-foreground font-semibold">
                    {statistics.acceptance_percentage}%
                  </div>
                </div>
              </div>

              {statistics.pending_users > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <span className="text-xs text-foreground/80">
                    {statistics.pending_users}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Действия - сетка 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onEdit(docType.code)}
            variant="outline"
            size="sm"
            className="bg-secondary border-border text-foreground hover:bg-secondary h-8 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Редактировать
          </Button>

          <Button
            onClick={() => onHistory(docType.code)}
            variant="outline"
            size="sm"
            className="bg-secondary border-border text-foreground hover:bg-secondary h-8 text-xs"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            История
          </Button>

          {docType.current_version && (
            <>
              <Button
                onClick={() => onViewAcceptances(docType.code)}
                variant="outline"
                size="sm"
                className="bg-secondary border-border text-foreground hover:bg-secondary h-8 text-xs"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Согласия
              </Button>

              <Button
                onClick={() => onPublishDraft(docType.code)}
                variant="outline"
                size="sm"
                className="bg-secondary border-border text-foreground hover:bg-secondary h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
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
    navigate(`/admin/legal-documents/${docType}/history`);
  };

  const handlePublishDraft = (docType: DocumentType) => {
    navigate(`/admin/legal-documents/${docType}/create`);
  };

  const handleViewAcceptances = (docType: DocumentType) => {
    // Переход к общему списку пользователей с фильтрацией по типу документа
    navigate(`/admin/legal-documents/users-acceptances?docType=${docType}`);
  };

  const handleViewAuditLog = () => {
    navigate('/admin/audit');
  };

  const handleExportAcceptances = async () => {
    try {
      const XLSX = await loadXlsx();

      // Получаем все согласия
      const acceptances = await legalDocumentsService.getAcceptanceJournal();

      if (acceptances.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }

      // Подготавливаем данные для Excel
      const data = acceptances.map((acc, index) => ({
        '№': index + 1,
        'Пользователь': acc.user_name,
        'Email': acc.user_email,
        'Тип документа': DOCUMENT_TYPES[acc.doc_type_code],
        'Версия': acc.doc_version,
        'Дата согласия': new Date(acc.accepted_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        'Источник': acc.source === 'web' ? 'Веб' : acc.source === 'mobile' ? 'Мобильное приложение' : acc.source,
        'IP адрес': acc.ip_address || '-'
      }));

      // Создаем книгу и лист
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Настраиваем ширину столбцов
      ws['!cols'] = [
        { wch: 5 },  // №
        { wch: 25 }, // Пользователь
        { wch: 30 }, // Email
        { wch: 35 }, // Тип документа
        { wch: 10 }, // Версия
        { wch: 20 }, // Дата согласия
        { wch: 20 }, // Источник
        { wch: 15 }  // IP адрес
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Согласия пользователей');

      // Формируем имя файла с датой
      const fileName = `Согласия_пользователей_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;

      // Скачиваем файл
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка при экспорте данных');
    }
  };

  if (loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full report-full-width">
          <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
            <h1 className="text-2xl font-semibold text-foreground">Правовые документы</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Загрузка документов...</div>
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
              <h1 className="text-2xl font-semibold text-foreground">Правовые документы</h1>
              <p className="text-muted-foreground mt-2">
                Управление пользовательскими соглашениями, политиками конфиденциальности и согласиями
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <HelpButton route="/admin/legal-documents" variant="text" className="flex-shrink-0" />
            
              {!isMobile && (
                <>
                <Button
                  onClick={() => navigate('/admin/legal-documents/users-acceptances')}
                  variant="outline"
                  className="bg-secondary border-border text-foreground hover:bg-secondary"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Согласия пользователей
                </Button>
                
                <Button
                  onClick={handleExportAcceptances}
                  variant="outline"
                  className="bg-secondary border-border text-foreground hover:bg-secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт согласий
                </Button>
                
                <Button
                  onClick={handleViewAuditLog}
                  variant="outline"
                  className="bg-secondary border-border text-foreground hover:bg-secondary"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Журнал действий
                </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Сводка по всем документам */}
        <div className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Общая статистика
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-4'}`}>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {documentTypes.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Типов документов</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {documentTypes.filter(d => d.current_version).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Опубликовано</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {statistics.length > 0 ? statistics[0].total_users : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Всего пользователей</div>
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
                className="bg-secondary border-border text-foreground hover:bg-secondary"
              >
                <Users className="w-4 h-4 mr-2" />
                Согласия пользователей
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleExportAcceptances}
                  variant="outline"
                  className="bg-secondary border-border text-foreground hover:bg-secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт согласий
                </Button>
                
                <Button
                  onClick={handleViewAuditLog}
                  variant="outline"
                  className="bg-secondary border-border text-foreground hover:bg-secondary"
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
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Документы не найдены
                </h3>
                <p className="text-muted-foreground">
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
