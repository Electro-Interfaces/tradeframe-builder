/**
 * Компонент карточки документа для отображения в списке
 * Показывает основную информацию о документе и статистику согласий
 */

import React from 'react';
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
  Eye
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DocumentTypeInfo, 
  DocumentStatistics,
  DocumentType 
} from '@/types/legal';

interface DocumentCardProps {
  docType: DocumentTypeInfo;
  statistics?: DocumentStatistics;
  onEdit: (docType: DocumentType) => void;
  onHistory: (docType: DocumentType) => void;
  onPublishDraft: (docType: DocumentType) => void;
  onViewAcceptances: (docType: DocumentType) => void;
  className?: string;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  docType,
  statistics,
  onEdit,
  onHistory,
  onPublishDraft,
  onViewAcceptances,
  className = ''
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
      return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-400" />;
  };

  const getStatusBadge = () => {
    if (!docType.current_version) {
      return <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">Не опубликован</Badge>;
    }
    return <Badge className="bg-blue-600 text-white">v{docType.current_version.version}</Badge>;
  };

  const getAcceptanceIndicator = () => {
    if (!statistics) return null;
    
    const percentage = statistics.acceptance_percentage;
    let colorClass = 'text-red-400';
    let icon = AlertCircle;
    
    if (percentage >= 90) {
      colorClass = 'text-green-400';
      icon = CheckCircle;
    } else if (percentage >= 70) {
      colorClass = 'text-yellow-400';
      icon = AlertCircle;
    }
    
    const Icon = icon;
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
    );
  };

  return (
    <Card className={`bg-slate-800 border-slate-700 h-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-white text-lg leading-tight">
                {docType.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon()}
                {getStatusBadge()}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            {getAcceptanceIndicator()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Информация о текущей версии */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-400">Дата публикации:</span>
            <span className="text-slate-300 min-w-0">
              {formatDate(docType.current_version?.published_at)}
            </span>
          </div>
          
          {docType.current_version?.editor_name && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400">Автор:</span>
              <span className="text-slate-300 min-w-0 truncate" title={docType.current_version.editor_name}>
                {docType.current_version.editor_name}
              </span>
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
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">
                  {statistics.pending_users} пользовател{statistics.pending_users === 1 ? 'ь требует' : statistics.pending_users < 5 ? 'я требуют' : 'ей требуют'} согласия
                </span>
              </div>
            )}
            
            {statistics.avg_acceptance_time_hours && (
              <div className="mt-2 text-sm text-slate-400">
                Среднее время согласия: {Math.round(statistics.avg_acceptance_time_hours)} ч
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
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500 transition-colors"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
          
          <Button
            onClick={() => onHistory(docType.code)}
            variant="outline"
            size="sm" 
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500 transition-colors"
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
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Согласия ({statistics?.accepted_users || 0})
              </Button>
              
              <Button
                onClick={() => onPublishDraft(docType.code)}
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Новая версия
              </Button>
            </>
          )}
        </div>

        {/* Дополнительная информация для неопубликованного документа */}
        {!docType.current_version && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Документ не опубликован</span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Создайте первую версию документа и опубликуйте её для начала работы с согласиями пользователей.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentCard;