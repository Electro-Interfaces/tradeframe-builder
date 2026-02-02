/**
 * Страница просмотра согласий пользователей
 * Показывает список всех пользователей с их статусом согласий
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft,
  Search,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Download,
  Eye
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { legalDocumentsService } from '@/services/legalDocumentsService';
import { 
  UserDocumentAcceptance,
  DocumentType,
  DOCUMENT_TYPES
} from '@/types/legal';

interface UserAcceptanceStatus {
  user_id: string;
  user_name: string;
  user_email: string;
  acceptances: UserDocumentAcceptance[];
  last_acceptance_date: string | null;
  total_documents: number;
  accepted_documents: number;
  completion_percentage: number;
}

export default function LegalUsersAcceptances() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [users, setUsers] = useState<UserAcceptanceStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserAcceptanceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAcceptanceStatus | null>(null);

  useEffect(() => {
    loadUsersAcceptances();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const loadUsersAcceptances = async () => {
    try {
      setLoading(true);
      
      // Получаем все согласия пользователей
      const allAcceptances = await legalDocumentsService.getAcceptanceJournal();
      
      // Группируем по пользователям
      const userMap = new Map<string, UserAcceptanceStatus>();
      
      // Добавляем пользователей с согласиями
      allAcceptances.forEach(acceptance => {
        if (!userMap.has(acceptance.user_id)) {
          userMap.set(acceptance.user_id, {
            user_id: acceptance.user_id,
            user_name: acceptance.user_name,
            user_email: acceptance.user_email,
            acceptances: [],
            last_acceptance_date: null,
            total_documents: 3, // Всегда 3 документа
            accepted_documents: 0,
            completion_percentage: 0
          });
        }
        
        const user = userMap.get(acceptance.user_id)!;
        user.acceptances.push(acceptance);
      });

      // РЕАЛЬНЫЕ ПОЛЬЗОВАТЕЛИ - загружаем из базы данных, НЕТ MOCK данных!

      // Вычисляем статистику для каждого пользователя
      const usersArray = Array.from(userMap.values()).map(user => {
        // Получаем уникальные типы документов, которые подписал пользователь
        const uniqueDocTypes = new Set(user.acceptances.map(a => a.doc_type_code));
        user.accepted_documents = uniqueDocTypes.size;
        user.completion_percentage = Math.round((user.accepted_documents / user.total_documents) * 100);
        
        // Находим дату последнего согласия
        if (user.acceptances.length > 0) {
          const sortedAcceptances = user.acceptances.sort((a, b) => 
            new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime()
          );
          user.last_acceptance_date = sortedAcceptances[0].accepted_at;
        }
        
        return user;
      });

      // Сортируем по проценту завершения и дате последнего согласия
      usersArray.sort((a, b) => {
        if (a.completion_percentage !== b.completion_percentage) {
          return b.completion_percentage - a.completion_percentage;
        }
        if (a.last_acceptance_date && b.last_acceptance_date) {
          return new Date(b.last_acceptance_date).getTime() - new Date(a.last_acceptance_date).getTime();
        }
        if (a.last_acceptance_date && !b.last_acceptance_date) return -1;
        if (!a.last_acceptance_date && b.last_acceptance_date) return 1;
        return a.user_name.localeCompare(b.user_name);
      });

      setUsers(usersArray);
      
    } catch (error) {
      console.error('Ошибка загрузки согласий пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.user_name.toLowerCase().includes(query) ||
      user.user_email.toLowerCase().includes(query) ||
      user.user_id.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Никогда';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (percentage > 0) return <Clock className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage === 100) {
      return <Badge className="bg-emerald-600 text-white">Завершено</Badge>;
    }
    if (percentage > 0) {
      return <Badge className="bg-yellow-600 text-white">Частично</Badge>;
    }
    return <Badge variant="destructive">Не подписано</Badge>;
  };

  const handleUserClick = (user: UserAcceptanceStatus) => {
    setSelectedUser(user);
  };

  const handleExportAcceptances = async () => {
    try {
      // Динамический импорт xlsx для уменьшения размера бандла
      const XLSX = await import('xlsx');

      if (users.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }

      // Подготавливаем данные для Excel
      const data = users.map((user, index) => ({
        '№': index + 1,
        'Пользователь': user.user_name,
        'Email': user.user_email,
        'Подписано документов': `${user.accepted_documents} из ${user.total_documents}`,
        'Процент завершения': `${user.completion_percentage}%`,
        'Последнее согласие': formatDate(user.last_acceptance_date),
        'Пользовательское соглашение': user.acceptances.some(a => a.doc_type_code === 'tos') ? 'Да' : 'Нет',
        'Политика конфиденциальности': user.acceptances.some(a => a.doc_type_code === 'privacy') ? 'Да' : 'Нет',
        'Защита ПДн': user.acceptances.some(a => a.doc_type_code === 'pdn') ? 'Да' : 'Нет',
        'Статус': user.completion_percentage === 100 ? 'Завершено' :
                  user.completion_percentage > 0 ? 'Частично' : 'Не подписано'
      }));

      // Создаем книгу и лист
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Настраиваем ширину столбцов
      ws['!cols'] = [
        { wch: 5 },  // №
        { wch: 25 }, // Пользователь
        { wch: 30 }, // Email
        { wch: 20 }, // Подписано документов
        { wch: 18 }, // Процент завершения
        { wch: 20 }, // Последнее согласие
        { wch: 25 }, // Пользовательское соглашение
        { wch: 30 }, // Политика конфиденциальности
        { wch: 15 }, // Защита ПДн
        { wch: 15 }  // Статус
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
            <h1 className="text-2xl font-semibold text-white">Согласия пользователей</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400">Загрузка данных...</div>
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
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/admin/legal-documents')}
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к документам
              </Button>
              
              <div>
                <h1 className="text-2xl font-semibold text-white">Согласия пользователей</h1>
                <p className="text-slate-400 mt-1">
                  Статус подписания правовых документов всеми пользователями системы
                </p>
              </div>
            </div>
            
            {!isMobile && (
              <Button
                onClick={handleExportAcceptances}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт в Excel
              </Button>
            )}
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Поиск пользователя..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="w-4 h-4" />
              Найдено: {filteredUsers.length}
            </div>
          </div>
        </div>

        {/* Список пользователей */}
        <div className="mx-4 md:mx-6 lg:mx-8 pb-6">
          {filteredUsers.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Пользователи не найдены
                </h3>
                <p className="text-slate-400">
                  {searchQuery ? 'Попробуйте изменить критерии поиска' : 'В системе пока нет пользователей с согласиями'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card 
                  key={user.user_id} 
                  className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      
                      {/* Информация о пользователе */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-medium text-lg leading-tight">
                            {user.user_name}
                          </h3>
                          <p className="text-slate-400 text-sm truncate">
                            {user.user_email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusIcon(user.completion_percentage)}
                            <span className="text-sm text-slate-300">
                              {user.accepted_documents} из {user.total_documents} документов
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Статистика согласий */}
                      <div className="flex items-center gap-6 text-sm">
                        
                        {/* Статус */}
                        <div className="text-center">
                          <div className="text-slate-400 mb-1">Статус</div>
                          {getStatusBadge(user.completion_percentage)}
                        </div>

                        {/* Процент завершения */}
                        <div className="text-center">
                          <div className="text-slate-400 mb-1">Прогресс</div>
                          <div className="text-white font-medium">
                            {user.completion_percentage}%
                          </div>
                        </div>

                        {/* Последнее согласие */}
                        <div className="text-center min-w-[140px]">
                          <div className="text-slate-400 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Последнее согласие
                          </div>
                          <div className="text-slate-300 text-xs">
                            {formatDate(user.last_acceptance_date)}
                          </div>
                        </div>

                        {/* Детали согласий */}
                        {user.acceptances.length > 0 && (
                          <div className="text-center">
                            <div className="text-slate-400 mb-1">Документы</div>
                            <div className="flex gap-1">
                              {['tos', 'privacy', 'pdn'].map((docType) => {
                                const hasAcceptance = user.acceptances.some(a => a.doc_type_code === docType);
                                return (
                                  <div
                                    key={docType}
                                    className={`w-2 h-2 rounded-full ${
                                      hasAcceptance ? 'bg-emerald-400' : 'bg-slate-600'
                                    }`}
                                    title={`${DOCUMENT_TYPES[docType as DocumentType]} - ${hasAcceptance ? 'Подписано' : 'Не подписано'}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

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