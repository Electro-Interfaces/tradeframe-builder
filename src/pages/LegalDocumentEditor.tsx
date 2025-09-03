/**
 * Страница редактора правовых документов
 * Позволяет создавать новые версии и редактировать черновики документов
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  User,
  Hash
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MarkdownEditor } from '@/components/legal/MarkdownEditor';
import { 
  DocumentType, 
  DocumentVersion,
  DocumentStatus,
  DOCUMENT_TYPES
} from '@/types/legal';
import { 
  legalDocumentsService, 
  getCurrentUser 
} from '@/services/legalDocumentsService';

interface LegalDocumentEditorParams {
  docType?: DocumentType;
}

export default function LegalDocumentEditor() {
  const { docType } = useParams<LegalDocumentEditorParams>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Определяем режим работы
  const mode = searchParams.get('mode') || 'edit'; // edit | create | view
  const versionId = searchParams.get('version');
  const isCreateMode = mode === 'create';
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  
  // Состояние документа
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    content: '',
    changelog: ''
  });

  // Инициализация при загрузке компонента
  useEffect(() => {
    initializeEditor();
  }, [docType, mode, versionId]);

  const initializeEditor = async () => {
    if (!docType || !DOCUMENT_TYPES[docType]) {
      setError('Неизвестный тип документа');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Получаем информацию о документе
      const docInfo = await legalDocumentsService.getDocumentTypeInfo(docType);
      setDocumentInfo(docInfo);

      if (isCreateMode) {
        // Создание новой версии
        const nextVersion = generateNextVersion(docInfo.current_version?.version);
        setFormData({
          version: nextVersion,
          title: docInfo.title,
          content: docInfo.current_version?.content_md || getDefaultContent(docType),
          changelog: ''
        });
        setCurrentVersion(null);
      } else {
        // Редактирование существующей версии
        const targetVersionId = versionId || docInfo.current_version?.id;
        if (targetVersionId) {
          const version = await legalDocumentsService.getDocumentVersion(targetVersionId);
          if (version) {
            setCurrentVersion(version);
            setFormData({
              version: version.version,
              title: docInfo.title, // title не хранится в версии, берем из типа документа
              content: version.content_md || '',
              changelog: version.changelog || ''
            });
          }
        }
      }
      
    } catch (err) {
      console.error('Ошибка инициализации редактора:', err);
      setError('Не удалось загрузить данные документа');
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация следующей версии
  const generateNextVersion = (currentVersion?: string): string => {
    if (!currentVersion) return '1.0.0';
    
    const parts = currentVersion.split('.').map(Number);
    if (parts.length !== 3) return '1.0.0';
    
    // Увеличиваем минорную версию
    return `${parts[0]}.${parts[1] + 1}.0`;
  };

  // Получение контента по умолчанию для нового документа
  const getDefaultContent = (type: DocumentType): string => {
    const templates = {
      'terms-of-service': `# Пользовательское соглашение

## 1. Общие положения

Настоящее пользовательское соглашение регулирует отношения между...

## 2. Права и обязанности сторон

### 2.1 Права пользователя

### 2.2 Обязанности пользователя

## 3. Ответственность сторон

## 4. Заключительные положения`,
      
      'privacy-policy': `# Политика конфиденциальности

## 1. Общие положения

Настоящая Политика конфиденциальности определяет порядок обработки...

## 2. Персональные данные

### 2.1 Категории персональных данных

### 2.2 Цели обработки данных

## 3. Права субъектов персональных данных

## 4. Безопасность персональных данных`,
      
      'personal-data-protection': `# Политика защиты персональных данных

## 1. Основные принципы

При обработке персональных данных применяются следующие принципы...

## 2. Организационные меры защиты

## 3. Технические меры защиты

## 4. Контроль и аудит`
    };
    
    return templates[type] || `# ${DOCUMENT_TYPES[type]}\n\nСодержание документа...`;
  };

  // Обработчики формы
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Сбрасываем сообщения при изменении
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSaveDraft = async () => {
    if (!docType) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const currentUser = getCurrentUser();
      
      if (isCreateMode || !currentVersion) {
        // Создание нового черновика
        const newVersion = await legalDocumentsService.createDocumentDraft({
          doc_type_code: docType,
          version: formData.version,
          content_md: formData.content,
          changelog: formData.changelog
        });
        
        setCurrentVersion(newVersion);
        setSuccess('Черновик успешно создан');
        
        // Обновляем URL для редактирования созданного черновика
        navigate(`/admin/legal-documents/${docType}/edit?version=${newVersion.id}`, { replace: true });
        
      } else {
        // Обновление существующего черновика
        const updatedVersion = await legalDocumentsService.updateDocumentVersion(currentVersion.id, {
          version: formData.version,
          content_md: formData.content,
          changelog: formData.changelog
        });
        
        setCurrentVersion(updatedVersion);
        setSuccess('Черновик успешно обновлен');
      }
      
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Не удалось сохранить черновик');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentVersion || !docType) return;

    try {
      setIsPublishing(true);
      setError(null);
      
      await legalDocumentsService.publishDocumentVersion(currentVersion.id);
      setSuccess('Документ успешно опубликован!');
      
      // Возвращаемся к списку документов через 2 секунды
      setTimeout(() => {
        navigate('/admin/legal-documents');
      }, 2000);
      
    } catch (err) {
      console.error('Ошибка публикации:', err);
      setError('Не удалось опубликовать документ');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/legal-documents');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded mb-4"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !documentInfo) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBack} className="mt-4" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к документам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Заголовок и навигация */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isCreateMode ? 'Создание версии' : isViewMode ? 'Просмотр документа' : 'Редактирование'}
              </h1>
              <p className="text-slate-400">{documentInfo?.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isViewMode && (
              <>
                <Button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Сохранение...' : 'Сохранить черновик'}
                </Button>
                
                {currentVersion && currentVersion.status === 'draft' && (
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isPublishing ? 'Публикация...' : 'Опубликовать'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Уведомления */}
        {error && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Основной контент - редактор */}
          <div className="lg:col-span-3">
            <MarkdownEditor
              content={formData.content}
              onChange={(content) => handleInputChange('content', content)}
              onSave={handleSaveDraft}
              readOnly={isViewMode}
              placeholder={`Введите содержание документа "${documentInfo?.title}" в формате Markdown...`}
            />
          </div>

          {/* Боковая панель с метаданными */}
          <div className="space-y-6">
            
            {/* Информация о версии */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Метаданные
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Версия */}
                <div>
                  <Label htmlFor="version" className="text-slate-300">Версия</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    placeholder="1.0.0"
                    className="bg-slate-700 border-slate-600 text-white"
                    readOnly={isViewMode}
                  />
                </div>

                {/* Заголовок */}
                <div>
                  <Label htmlFor="title" className="text-slate-300">Заголовок</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Заголовок документа"
                    className="bg-slate-700 border-slate-600 text-white"
                    readOnly={isViewMode}
                  />
                </div>

                {/* Changelog */}
                <div>
                  <Label htmlFor="changelog" className="text-slate-300">Описание изменений</Label>
                  <Textarea
                    id="changelog"
                    value={formData.changelog}
                    onChange={(e) => handleInputChange('changelog', e.target.value)}
                    placeholder="Краткое описание изменений в этой версии..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                    readOnly={isViewMode}
                  />
                </div>

              </CardContent>
            </Card>

            {/* Статус версии */}
            {currentVersion && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Статус
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Статус:</span>
                    <Badge className={
                      currentVersion.status === 'published' ? 'bg-green-600' :
                      currentVersion.status === 'draft' ? 'bg-yellow-600' :
                      'bg-slate-600'
                    }>
                      {currentVersion.status === 'published' ? 'Опубликован' :
                       currentVersion.status === 'draft' ? 'Черновик' :
                       'Архив'}
                    </Badge>
                  </div>

                  {currentVersion.created_at && (
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-slate-400">Создан:</div>
                        <div className="text-slate-300">
                          {new Date(currentVersion.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentVersion.published_at && (
                    <div className="flex items-start gap-2 text-sm">
                      <Upload className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-slate-400">Опубликован:</div>
                        <div className="text-slate-300">
                          {new Date(currentVersion.published_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentVersion.editor_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-slate-400">Автор:</div>
                        <div className="text-slate-300">{currentVersion.editor_name}</div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {/* Подсказки */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Подсказки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-400 space-y-2">
                  <p>• Используйте Markdown для форматирования</p>
                  <p>• Черновики можно редактировать многократно</p>
                  <p>• После публикации версия становится неизменяемой</p>
                  <p>• Пользователи получат уведомление о новой версии</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}