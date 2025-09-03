/**
 * Компонент Markdown редактора для правовых документов
 * Поддерживает редактирование, предпросмотр и конвертацию в HTML
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit3, 
  Code, 
  Save, 
  Download,
  Info,
  Hash
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  onPreviewHtml?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

// Простой конвертер Markdown в HTML для демонстрации
// В реальном проекте следует использовать библиотеки типа marked, remark или similar
const convertMarkdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  // Заголовки
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Жирный текст
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Курсив
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Списки (упрощенная версия)
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  
  // Параграфы (очень упрощенно)
  const paragraphs = html.split('\n\n').filter(p => p.trim());
  html = paragraphs.map(p => {
    // Не оборачиваем в <p> если уже есть HTML теги
    if (p.trim().startsWith('<')) {
      return p.trim();
    }
    return `<p>${p.trim()}</p>`;
  }).join('\n');
  
  return html;
};

// Получение статистики текста
const getTextStatistics = (text: string) => {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const characters = text.length;
  const charactersWithoutSpaces = text.replace(/\s/g, '').length;
  const paragraphs = text.split('\n\n').filter(p => p.trim()).length;
  const lines = text.split('\n').length;
  
  return {
    words: words.length,
    characters,
    charactersWithoutSpaces,
    paragraphs,
    lines
  };
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  onSave,
  onPreviewHtml,
  readOnly = false,
  placeholder = 'Введите текст документа в формате Markdown...',
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [localContent, setLocalContent] = useState(content);

  // Синхронизируем локальный контент с внешним
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Обрабатываем изменения с небольшой задержкой для производительности
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localContent !== content) {
        onChange(localContent);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localContent, content, onChange]);

  // Конвертируем Markdown в HTML
  const htmlPreview = useMemo(() => {
    const html = convertMarkdownToHtml(localContent);
    if (onPreviewHtml) {
      onPreviewHtml(html);
    }
    return html;
  }, [localContent, onPreviewHtml]);

  // Статистика текста
  const textStats = useMemo(() => getTextStatistics(localContent), [localContent]);

  const handleContentChange = (value: string) => {
    if (!readOnly) {
      setLocalContent(value);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([localContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`w-full ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              {!isMobile && "Редактирование"}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {!isMobile && "Предпросмотр"}
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              {!isMobile && "Статистика"}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <Download className="w-4 h-4 mr-2" />
              {!isMobile && "Скачать"}
            </Button>
            
            {onSave && (
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white"
                disabled={readOnly}
              >
                <Save className="w-4 h-4 mr-2" />
                {!isMobile && "Сохранить"}
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="edit" className="mt-0">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Редактирование документа
                <Badge variant="outline" className="ml-auto text-xs">
                  Markdown
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={localContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={placeholder}
                className="min-h-[500px] bg-slate-700 border-slate-600 text-white font-mono text-sm resize-none focus:ring-blue-500"
                readOnly={readOnly}
              />
              
              {/* Краткая статистика под редактором */}
              <div className="flex items-center justify-between mt-3 text-sm text-slate-400">
                <div className="flex items-center gap-4">
                  <span>Слов: {textStats.words}</span>
                  <span>Символов: {textStats.characters}</span>
                  <span>Строк: {textStats.lines}</span>
                </div>
                
                {readOnly && (
                  <Badge variant="outline" className="text-xs">
                    Только чтение
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Предпросмотр документа
                <Badge variant="outline" className="ml-auto text-xs">
                  HTML
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="min-h-[500px] p-4 bg-white rounded-md border prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.6',
                  color: '#1e293b'
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="w-5 h-5" />
                Статистика документа
                <Badge variant="outline" className="ml-auto text-xs">
                  Анализ
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{textStats.words}</div>
                  <div className="text-sm text-slate-400">Слов</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{textStats.characters}</div>
                  <div className="text-sm text-slate-400">Символов</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{textStats.charactersWithoutSpaces}</div>
                  <div className="text-sm text-slate-400">Без пробелов</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{textStats.paragraphs}</div>
                  <div className="text-sm text-slate-400">Абзацев</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{textStats.lines}</div>
                  <div className="text-sm text-slate-400">Строк</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {textStats.words > 0 ? Math.round(textStats.characters / textStats.words * 10) / 10 : 0}
                  </div>
                  <div className="text-sm text-slate-400">Символов/слово</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {Math.round((textStats.words / 200) * 10) / 10}
                  </div>
                  <div className="text-sm text-slate-400">Минут чтения</div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {textStats.paragraphs > 0 ? Math.round(textStats.words / textStats.paragraphs * 10) / 10 : 0}
                  </div>
                  <div className="text-sm text-slate-400">Слов/абзац</div>
                </div>
              </div>
              
              {/* Дополнительная информация */}
              <div className="mt-6 space-y-3">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Рекомендации по тексту
                  </h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {textStats.words < 100 && (
                      <li>• Документ довольно короткий - рассмотрите добавление деталей</li>
                    )}
                    {textStats.words > 2000 && (
                      <li>• Документ длинный - рассмотрите разбивку на разделы</li>
                    )}
                    {textStats.paragraphs > 0 && textStats.words / textStats.paragraphs > 100 && (
                      <li>• Некоторые абзацы могут быть слишком длинными</li>
                    )}
                    {textStats.words === 0 && (
                      <li>• Документ пустой - начните с заголовка и основного содержания</li>
                    )}
                    {textStats.words > 0 && textStats.words < 2000 && textStats.paragraphs < 10 && (
                      <li>• Хорошая длина для правового документа</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarkdownEditor;