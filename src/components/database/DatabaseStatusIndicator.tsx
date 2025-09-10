import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { externalUsersService } from '@/services/externalUsersService';

interface DatabaseStatus {
  connected: boolean;
  url: string;
  error?: string;
}

export const DatabaseStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<DatabaseStatus>({
    connected: false,
    url: ''
  });

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const savedSettings = localStorage.getItem('externalDatabase');
      if (!savedSettings) {
        setStatus({ connected: false, url: 'Не настроено' });
        return;
      }

      const parsed = JSON.parse(savedSettings);
      if (!parsed.url || !parsed.apiKey) {
        setStatus({ connected: false, url: 'Неполные настройки' });
        return;
      }

      console.log('DatabaseStatusIndicator: Testing connection with:', { 
        url: parsed.url, 
        hasApiKey: !!parsed.apiKey 
      });

      // Тестируем подключение
      const testResult = await externalUsersService.testConnection();
      console.log('DatabaseStatusIndicator: Test result:', testResult);
      
      setStatus({
        connected: testResult.success,
        url: parsed.url,
        error: testResult.error
      });
    } catch (error: any) {
      console.error('DatabaseStatusIndicator: Error checking status:', error);
      setStatus({
        connected: false,
        url: 'Ошибка проверки',
        error: error.message
      });
    }
  };

  const getStatusBadge = () => {
    if (status.connected) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Подключено к внешней БД
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Внешняя БД недоступна
        </Badge>
      );
    }
  };

  const getTooltipContent = () => {
    if (status.connected) {
      return (
        <div className="text-sm">
          <p><strong>Статус:</strong> Подключено</p>
          <p><strong>URL:</strong> {status.url}</p>
          <p><strong>Тип:</strong> Supabase PostgreSQL</p>
          <p className="text-green-400 mt-1">✓ Используется внешняя база данных</p>
        </div>
      );
    } else {
      return (
        <div className="text-sm">
          <p><strong>Статус:</strong> Не подключено</p>
          <p><strong>URL:</strong> {status.url}</p>
          {status.error && (
            <p className="text-red-400 mt-1">
              <strong>Ошибка:</strong> {status.error}
            </p>
          )}
          <p className="text-yellow-400 mt-1">⚠ Настройте подключение к внешней БД</p>
        </div>
      );
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <Database className="w-4 h-4 text-muted-foreground" />
            {getStatusBadge()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};