/**
 * Страница истории версий правового документа
 * Показывает все версии конкретного документа с возможностью просмотра
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Eye,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { legalDocumentsService } from '@/services/legalDocumentsService';
import {
  DocumentVersion,
  DocumentType,
  DOCUMENT_TYPES,
  DocumentStatus
} from '@/types/legal';

export default function LegalDocumentHistory() {
  const navigate = useNavigate();
  const { docType } = useParams<{ docType: DocumentType }>();
  const isMobile = useIsMobile();

  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (docType) {
      loadVersionHistory();
    }
  }, [docType]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const allVersions = await legalDocumentsService.getDocumentVersions(docType as DocumentType);
      setVersions(allVersions);
    } catch (error) {
      console.error('Ошибка загрузки истории версий:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: DocumentStatus, isCurrent: boolean) => {
    if (isCurrent && status === 'published') {
      return <Badge className="bg-emerald-600 text-white">Текущая</Badge>;
    }

    switch (status) {
      case 'published':
        return <Badge className="bg-primary text-white">Опубликована</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="bg-secondary text-foreground">Черновик</Badge>;
      case 'archived':
        return <Badge variant="secondary" className="bg-secondary text-muted-foreground">Архивная</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: DocumentStatus, isCurrent: boolean) => {
    if (isCurrent && status === 'published') {
      return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }

    switch (status) {
      case 'published':
        return <CheckCircle className="w-5 h-5 text-primary dark:text-primary/70" />;
      case 'draft':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      case 'archived':
        return <Archive className="w-5 h-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const handleViewVersion = (versionId: string) => {
    navigate(`/admin/legal-documents/${docType}/view?versionId=${versionId}`);
  };

  if (loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full report-full-width">
          <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
            <h1 className="text-2xl font-semibold text-foreground">История версий</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Загрузка истории...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const documentTitle = docType ? DOCUMENT_TYPES[docType as DocumentType] : 'Документ';

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">

        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/admin/legal-documents')}
                variant="outline"
                size="sm"
                className="bg-secondary border-border text-foreground hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к документам
              </Button>

              <div>
                <h1 className="text-2xl font-semibold text-foreground">История версий</h1>
                <p className="text-muted-foreground mt-1">
                  {documentTitle}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Список версий */}
        <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
          {versions.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Версии не найдены
                </h3>
                <p className="text-muted-foreground">
                  У этого документа пока нет версий
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <Card
                  key={version.id}
                  className="bg-card border-border hover:bg-secondary transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">

                      {/* Информация о версии */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(version.status as DocumentStatus, version.is_current)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-foreground font-medium text-lg">
                              Версия {version.version}
                            </h3>
                            {getStatusBadge(version.status as DocumentStatus, version.is_current)}
                          </div>

                          <div className="space-y-1">
                            {version.editor_name && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>Автор: {version.editor_name}</span>
                              </div>
                            )}

                            {version.published_at && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Опубликована: {formatDate(version.published_at)}</span>
                              </div>
                            )}

                            {!version.published_at && version.created_at && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Создана: {formatDate(version.created_at)}</span>
                              </div>
                            )}

                            {version.changelog && (
                              <div className="text-sm text-foreground/80 mt-2">
                                <span className="text-muted-foreground">Изменения: </span>
                                {version.changelog}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleViewVersion(version.id)}
                          variant="outline"
                          size="sm"
                          className="bg-secondary border-border text-foreground hover:bg-secondary"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Просмотр
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
