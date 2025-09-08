/**
 * PriceHistoryJournal - Журнал изменений цен
 * 
 * Показывает историю всех изменений цен с фильтрацией и поиском
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileText
} from 'lucide-react';

import { 
  pricesSupabaseService, 
  PriceHistoryEntry 
} from '@/services/pricesSupabaseService';

interface PriceHistoryJournalProps {
  tradingPointId: string;
  tradingPointName: string;
}

export const PriceHistoryJournal: React.FC<PriceHistoryJournalProps> = ({
  tradingPointId,
  tradingPointName
}) => {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Загружаем историю при монтировании
  useEffect(() => {
    loadHistory();
  }, [tradingPointId]);

  const loadHistory = async () => {
    console.log(`📋 [PRICE HISTORY] Загрузка истории для ${tradingPointId}`);
    setLoading(true);
    
    try {
      const historyData = await pricesSupabaseService.getPriceHistory(tradingPointId);
      setHistory(historyData);
      console.log(`✅ [PRICE HISTORY] Загружено ${historyData.length} записей`);
    } catch (error) {
      console.error('❌ [PRICE HISTORY] Ошибка загрузки истории:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация истории
  const filteredHistory = history.filter(entry => {
    // Поиск по названию топлива или примечаниям
    if (searchQuery && !entry.fuel_type.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !entry.notes?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Фильтр по виду топлива
    if (selectedFuelType !== 'all' && entry.fuel_type !== selectedFuelType) {
      return false;
    }

    // Фильтр по действию
    if (selectedAction !== 'all' && entry.action !== selectedAction) {
      return false;
    }

    // Фильтр по датам
    if (dateFrom) {
      const entryDate = new Date(entry.created_at);
      const fromDate = new Date(dateFrom);
      if (entryDate < fromDate) {
        return false;
      }
    }

    if (dateTo) {
      const entryDate = new Date(entry.created_at);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // До конца дня
      if (entryDate > toDate) {
        return false;
      }
    }

    return true;
  });

  // Получаем уникальные виды топлива для фильтра
  const fuelTypes = Array.from(new Set(history.map(h => h.fuel_type))).sort();

  const formatPrice = (priceKopecks: number) => {
    return (priceKopecks / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'update':
        return <ArrowUp className="w-4 h-4 text-blue-400" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      'create': 'Создание',
      'update': 'Обновление',
      'sync': 'Синхронизация',
      'import': 'Импорт'
    };
    return actionMap[action] || action;
  };

  const getSourceText = (source: string) => {
    const sourceMap: Record<string, string> = {
      'manual': 'Вручную',
      'api_sync': 'API синхронизация',
      'import': 'Импорт'
    };
    return sourceMap[source] || source;
  };

  const exportHistory = () => {
    // TODO: Реализовать экспорт в CSV/Excel
    console.log('Экспорт истории цен');
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Журнал изменений цен
          </CardTitle>
          
          <div className="flex gap-2">
            <Button onClick={loadHistory} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            
            <Button onClick={exportHistory} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </div>
        
        <p className="text-slate-400 text-sm">
          История изменений цен для {tradingPointName}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-slate-400 text-sm">Поиск</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по топливу..."
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-slate-400 text-sm">Вид топлива</Label>
            <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Все виды" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все виды</SelectItem>
                {fuelTypes.map(fuelType => (
                  <SelectItem key={fuelType} value={fuelType}>
                    {fuelType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-slate-400 text-sm">Действие</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Все действия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все действия</SelectItem>
                <SelectItem value="create">Создание</SelectItem>
                <SelectItem value="update">Обновление</SelectItem>
                <SelectItem value="sync">Синхронизация</SelectItem>
                <SelectItem value="import">Импорт</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-slate-400 text-sm">Дата с</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <div>
            <Label className="text-slate-400 text-sm">Дата по</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>

        {/* Статистика */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Показано {filteredHistory.length} из {history.length} записей
          </span>
          
          {(searchQuery || selectedFuelType !== 'all' || selectedAction !== 'all' || dateFrom || dateTo) && (
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedFuelType('all');
                setSelectedAction('all');
                setDateFrom('');
                setDateTo('');
              }}
              variant="ghost"
              size="sm"
            >
              Сбросить фильтры
            </Button>
          )}
        </div>

        {/* История изменений */}
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2" />
              <p>История изменений пуста</p>
              {history.length === 0 ? (
                <p className="text-sm">Установите первую цену на топливо</p>
              ) : (
                <p className="text-sm">Попробуйте изменить фильтры поиска</p>
              )}
            </div>
          ) : (
            filteredHistory.map(entry => (
              <div
                key={entry.id}
                className="bg-slate-700 rounded-lg p-4 border border-slate-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getActionIcon(entry.action)}
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {entry.fuel_type}
                        </span>
                        
                        <Badge variant="outline" className="text-xs">
                          {getActionText(entry.action)}
                        </Badge>
                        
                        <Badge variant="secondary" className="text-xs">
                          {getSourceText(entry.source)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        {entry.old_price && (
                          <span>
                            Было: <span className="font-medium">{formatPrice(entry.old_price)} ₽/л</span>
                          </span>
                        )}
                        
                        <span>
                          Стало: <span className="font-medium text-white">{formatPrice(entry.new_price)} ₽/л</span>
                        </span>
                      </div>
                      
                      {entry.notes && (
                        <p className="text-sm text-slate-400">{entry.notes}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.created_at)}
                        </span>
                        
                        {entry.created_by && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entry.created_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {entry.old_price ? (
                        <div className="flex items-center gap-1">
                          {entry.new_price > entry.old_price ? (
                            <ArrowUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-red-400" />
                          )}
                          <span>
                            {((entry.new_price - entry.old_price) / entry.old_price * 100).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-green-400">Новая</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceHistoryJournal;