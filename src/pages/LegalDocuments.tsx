/**
 * Страница "Администрирование → Документы"
 * Главная страница управления правовыми документами
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Edit3, 
  History, 
  Users, 
  Plus,
  Eye,
  Download
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { HelpButton } from "@/components/help/HelpButton";
import { legalDocumentsService } from '@/services/legalDocumentsService';
import { loadXlsx } from '@/utils/xlsxLoader';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';
import { 
  DocumentTypeInfo, 
  DocumentStatistics,
  DOCUMENT_TYPES,
  DocumentType 
} from '@/types/legal';

type PublishStatus = 'all' | 'published' | 'unpublished';

function formatDateTime(dateString?: string): string {
  if (!dateString) {
    return '—';
  }

  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatInteger(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function getStatusBadgeClass(docType: DocumentTypeInfo): string {
  return docType.current_version
    ? 'bg-secondary text-foreground border-border'
    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
}

function getStatusLabel(docType: DocumentTypeInfo): string {
  return docType.current_version ? 'Опубликован' : 'Не опубликован';
}

function getAcceptanceBadgeClass(statistics?: DocumentStatistics): string {
  return statistics && statistics.pending_users > 0
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
    : 'bg-secondary text-foreground border-border';
}

export default function LegalDocuments() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeInfo[]>([]);
  const [statistics, setStatistics] = useState<DocumentStatistics[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('all');

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

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return documentTypes.filter((docType) => {
      const matchesStatus = publishStatus === 'all'
        || (publishStatus === 'published' && Boolean(docType.current_version))
        || (publishStatus === 'unpublished' && !docType.current_version);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [docType.title, docType.code, DOCUMENT_TYPES[docType.code]]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [documentTypes, publishStatus, searchTerm]);

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
          <div className="flex items-center justify-between gap-4">
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

        <div className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <div className={FILTER_PANEL_CLASS}>
            <div className={FILTER_PANEL_HEADER_CLASS}>
              <div className={FILTER_PANEL_TITLE_CLASS}>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Фильтры</span>
                <span className="text-sm text-muted-foreground">
                  Найдено: {formatInteger(filteredDocuments.length)}
                </span>
              </div>
            </div>

            <div className={FILTER_PANEL_FIELDS_CLASS}>
              <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
                <Label htmlFor="legal-documents-search" className="text-xs text-muted-foreground">
                  Поиск
                </Label>
                <Input
                  id="legal-documents-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Название документа"
                  className={FILTER_PANEL_CONTROL_CLASS}
                />
              </div>

              <div className={FILTER_PANEL_FIELD_CLASS}>
                <Label htmlFor="legal-documents-status" className="text-xs text-muted-foreground">
                  Статус
                </Label>
                <Select value={publishStatus} onValueChange={(value) => setPublishStatus(value as PublishStatus)}>
                  <SelectTrigger id="legal-documents-status" className={FILTER_PANEL_CONTROL_CLASS}>
                    <SelectValue placeholder="Все документы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все документы</SelectItem>
                    <SelectItem value="published">Опубликованные</SelectItem>
                    <SelectItem value="unpublished">Не опубликованные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={`${FILTER_PANEL_FIELD_CLASS} sm:flex-none sm:min-w-[180px] sm:self-end`}>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSearchTerm('');
                    setPublishStatus('all');
                  }}
                >
                  Сбросить
                </Button>
              </div>
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
                    {formatInteger(documentTypes.length)}
                  </div>
                  <div className="text-sm text-muted-foreground">Типов документов</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {formatInteger(documentTypes.filter(d => d.current_version).length)}
                  </div>
                  <div className="text-sm text-muted-foreground">Опубликовано</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {formatInteger(statistics.length > 0 ? statistics[0].total_users : 0)}
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

        {/* Список документов */}
        <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
          {filteredDocuments.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <EmptyState
                  className="py-16"
                  title="Документы не найдены"
                  description={documentTypes.length === 0
                    ? 'В системе пока нет правовых документов.'
                    : 'Нет документов, соответствующих выбранным фильтрам.'}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[280px]">Документ</TableHead>
                        <TableHead className="w-[140px]">Статус</TableHead>
                        <TableHead className="w-[120px]">Версия</TableHead>
                        <TableHead className="w-[180px]">Публикация</TableHead>
                        <TableHead className="w-[180px]">Редактор</TableHead>
                        <TableHead className="w-[160px]">Согласия</TableHead>
                        <TableHead className="w-[260px] text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((docType) => {
                        const docStatistics = statistics.find((s) => s.doc_type_code === docType.code);

                        return (
                          <TableRow key={docType.code}>
                            <TableCell>
                              <div className="font-medium text-foreground">{docType.title}</div>
                              <div className="text-xs text-muted-foreground font-mono">{docType.code}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(docType)}>
                                {getStatusLabel(docType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-foreground/80">
                              {docType.current_version ? `v${docType.current_version.version}` : '—'}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {formatDateTime(docType.current_version?.published_at)}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {docType.current_version?.editor_name || '—'}
                            </TableCell>
                            <TableCell>
                              {docStatistics ? (
                                <div className="space-y-1">
                                  <div className="font-mono text-foreground/80">
                                    {formatInteger(docStatistics.accepted_users)} / {formatInteger(docStatistics.total_users)}
                                  </div>
                                  <Badge className={getAcceptanceBadgeClass(docStatistics)}>
                                    {docStatistics.acceptance_percentage}%
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(docType.code)}>
                                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                  Редактировать
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleHistory(docType.code)}>
                                  <History className="mr-1.5 h-3.5 w-3.5" />
                                  История
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewAcceptances(docType.code)}
                                  disabled={!docType.current_version}
                                >
                                  <Users className="mr-1.5 h-3.5 w-3.5" />
                                  Согласия
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handlePublishDraft(docType.code)}>
                                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                                  Новая версия
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Документ</TableHead>
                        <TableHead className="w-[88px] text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((docType) => {
                        const docStatistics = statistics.find((s) => s.doc_type_code === docType.code);

                        return (
                          <TableRow key={docType.code} className="align-top">
                            <TableCell className="align-top">
                              <div className="space-y-2">
                                <div>
                                  <div className="font-medium text-foreground">{docType.title}</div>
                                  <div className="text-xs font-mono text-muted-foreground">{docType.code}</div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  <Badge className={getStatusBadgeClass(docType)}>
                                    {getStatusLabel(docType)}
                                  </Badge>
                                  <Badge className="bg-secondary text-foreground border-border">
                                    {docType.current_version ? `v${docType.current_version.version}` : 'Без версии'}
                                  </Badge>
                                  {docStatistics && (
                                    <Badge className={getAcceptanceBadgeClass(docStatistics)}>
                                      {docStatistics.acceptance_percentage}%
                                    </Badge>
                                  )}
                                </div>

                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div>Публикация: {formatDateTime(docType.current_version?.published_at)}</div>
                                  <div>Редактор: {docType.current_version?.editor_name || '—'}</div>
                                  <div>
                                    Согласия: {docStatistics
                                      ? `${formatInteger(docStatistics.accepted_users)} / ${formatInteger(docStatistics.total_users)} (${docStatistics.acceptance_percentage}%)`
                                      : '—'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-right">
                              <div className="flex flex-col items-end gap-2">
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => handleEdit(docType.code)}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => handleHistory(docType.code)}>
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleViewAcceptances(docType.code)}
                                  disabled={!docType.current_version}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => handlePublishDraft(docType.code)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
