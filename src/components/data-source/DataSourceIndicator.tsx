/**
 * Компонент для отображения источника данных на странице
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, FileText, Cloud, Server, Wifi, WifiOff } from 'lucide-react';

export type DataSourceType = 
  | 'external-database' 
  | 'mock'
  | 'local-api'
  | 'supabase'
  | 'cache'
  | 'mixed';

export interface DataSourceInfo {
  type: DataSourceType;
  label: string;
  description?: string;
  connected?: boolean;
  count?: number;
}

interface DataSourceIndicatorProps {
  sources: DataSourceInfo[];
  size?: 'sm' | 'default' | 'lg';
  showDescription?: boolean;
}

const getSourceIcon = (type: DataSourceType, connected?: boolean) => {
  switch (type) {
    case 'external-database':
      return connected === false ? <WifiOff className="h-3 w-3" /> : <Database className="h-3 w-3" />;
    case 'supabase':
      return connected === false ? <WifiOff className="h-3 w-3" /> : <Cloud className="h-3 w-3" />;
    case 'local-api':
      return <Server className="h-3 w-3" />;
    case 'mock':
      return <FileText className="h-3 w-3" />;
    case 'cache':
      return <Wifi className="h-3 w-3" />;
    case 'mixed':
    default:
      return <Database className="h-3 w-3" />;
  }
};

const getSourceVariant = (type: DataSourceType, connected?: boolean) => {
  if (connected === false) return 'destructive';
  
  switch (type) {
    case 'external-database':
    case 'supabase':
      return 'default';
    case 'mock':
      return 'secondary';
    case 'local-api':
      return 'outline';
    case 'cache':
      return 'secondary';
    case 'mixed':
    default:
      return 'outline';
  }
};

export function DataSourceIndicator({ 
  sources, 
  size = 'default',
  showDescription = false 
}: DataSourceIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Источник данных:</span>
      {sources.map((source, index) => (
        <div key={index} className="flex items-center gap-1">
          <Badge 
            variant={getSourceVariant(source.type, source.connected)}
            className="flex items-center gap-1"
          >
            {getSourceIcon(source.type, source.connected)}
            <span>{source.label}</span>
            {source.count !== undefined && (
              <span className="ml-1 px-1 py-0.5 bg-background/20 rounded text-xs">
                {source.count}
              </span>
            )}
          </Badge>
          {showDescription && source.description && (
            <span className="text-xs text-muted-foreground">
              ({source.description})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Хук для определения источника данных с отслеживанием изменений localStorage
export function useDataSourceInfo() {
  const [hasExternalDatabase, setHasExternalDatabase] = useState(false);
  const [hasSupabaseConnection, setHasSupabaseConnection] = useState(false);

  const checkExternalDatabase = (): boolean => {
    // Всегда возвращаем true, так как настройки зафиксированы в коде
    return true;
  };

  const checkSupabaseConnection = (): boolean => {
    // Всегда возвращаем true, так как настройки зафиксированы в коде
    return true;
  };

  // Функция для обновления состояний
  const updateConnectionStatus = () => {
    setHasExternalDatabase(checkExternalDatabase());
    setHasSupabaseConnection(checkSupabaseConnection());
  };

  // Отслеживаем изменения при монтировании
  useEffect(() => {
    updateConnectionStatus();
  }, []);

  // Отслеживаем изменения localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'externalDatabase' || e.key === 'supabaseSettings' || e.key === null) {
        updateConnectionStatus();
      }
    };

    // Слушаем события изменения localStorage
    window.addEventListener('storage', handleStorageChange);

    // Также слушаем кастомное событие для изменений в том же окне
    const handleCustomStorageChange = () => {
      updateConnectionStatus();
    };
    
    window.addEventListener('localStorageChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChanged', handleCustomStorageChange);
    };
  }, []);

  return {
    checkExternalDatabase,
    checkSupabaseConnection,
    hasExternalDatabase,
    hasSupabaseConnection,
    refreshConnectionStatus: updateConnectionStatus,
  };
}