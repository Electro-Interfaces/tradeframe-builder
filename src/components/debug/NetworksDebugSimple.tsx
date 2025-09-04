/**
 * Простой отладочный компонент для диагностики торговых сетей
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { networksService } from '@/services/networksService';
import { apiConfigService } from '@/services/apiConfigService';
import { Network } from '@/types/network';
import { 
  Database, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  XCircle,
  Settings
} from 'lucide-react';

export function NetworksDebugSimple() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [apiMode, setApiMode] = useState<string>('loading...');
  const [connectionName, setConnectionName] = useState<string>('loading...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      setLastAction('Загрузка статуса...');
      
      // Получаем информацию о подключении
      const currentApiMode = apiConfigService.getApiMode();
      const currentConnection = apiConfigService.getCurrentConnection();
      
      setApiMode(currentApiMode);
      setConnectionName(currentConnection?.name || 'НЕ НАЙДЕНО');
      
      console.log('🔍 Debug - API Mode:', currentApiMode);
      console.log('🔍 Debug - Connection:', currentConnection?.name);
      
      // Загружаем сети
      const networksData = await networksService.getAll();
      setNetworks(networksData);
      
      console.log('🔍 Debug - Networks loaded:', networksData.length, 'networks');
      setLastAction(`Загружено ${networksData.length} сетей`);
      
    } catch (err) {
      console.error('❌ Debug error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setLastAction('Ошибка: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setLastAction('Запуск миграции...');
      
      console.log('🚀 Debug - Running migration...');
      const result = await networksService.migrateToSupabase();
      
      console.log('🚀 Debug - Migration result:', result);
      
      if (result.success) {
        setLastAction(`Миграция успешна! Перенесено: ${result.migrated}, пропущено: ${result.skipped}`);
        // Перезагружаем данные
        setTimeout(() => loadStatus(), 1000);
      } else {
        setError(result.message);
        setLastAction('Миграция не удалась: ' + result.message);
      }
      
    } catch (err) {
      console.error('❌ Migration error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setLastAction('Ошибка миграции: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const createTestNetwork = async () => {
    try {
      setLoading(true);
      setError(null);
      setLastAction('Создание тестовой сети...');
      
      const testData = {
        name: `Тест ${new Date().toLocaleTimeString()}`,
        description: 'Сеть создана отладочным компонентом',
        type: 'АЗС'
      };
      
      console.log('🏗️ Debug - Creating test network:', testData);
      const newNetwork = await networksService.create(testData);
      console.log('✅ Debug - Test network created:', newNetwork);
      
      setLastAction(`Создана сеть: ${newNetwork.name} (ID: ${newNetwork.id})`);
      
      // Перезагружаем данные
      setTimeout(() => loadStatus(), 500);
      
    } catch (err) {
      console.error('❌ Create error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setLastAction('Ошибка создания: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const getApiModeBadge = () => {
    switch (apiMode) {
      case 'supabase':
        return <Badge className="bg-green-600">Supabase</Badge>;
      case 'mock':
        return <Badge className="bg-yellow-600">Mock</Badge>;
      case 'http':
        return <Badge className="bg-blue-600">HTTP</Badge>;
      default:
        return <Badge variant="outline">{apiMode}</Badge>;
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          🏪 Отладка сетей
          {getApiModeBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* Статус */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Режим:</strong> {apiMode}
          </div>
          <div>
            <strong>Подключение:</strong> {connectionName}
          </div>
          <div>
            <strong>Сетей:</strong> {networks.length}
          </div>
        </div>

        {/* Последнее действие */}
        {lastAction && (
          <div className="text-sm text-slate-300 bg-slate-800 p-2 rounded">
            <strong>Статус:</strong> {lastAction}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={loadStatus} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          
          {apiMode === 'supabase' && (
            <Button 
              onClick={runMigration} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <Database className="w-4 h-4 mr-2" />
              Миграция
            </Button>
          )}
          
          <Button 
            onClick={createTestNetwork} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Тест сеть
          </Button>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-700 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <strong>Ошибка:</strong>
            </div>
            <div className="font-mono text-xs">{error}</div>
          </div>
        )}

        {/* Список сетей (компактный) */}
        {networks.length > 0 && (
          <div>
            <strong className="text-sm">Загруженные сети:</strong>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
              {networks.slice(0, 5).map((network) => (
                <div key={network.id} className="flex justify-between bg-slate-800 p-2 rounded">
                  <span>{network.name}</span>
                  <span className="text-slate-400">ID: {network.id}</span>
                </div>
              ))}
              {networks.length > 5 && (
                <div className="text-slate-400 text-center">
                  ... и еще {networks.length - 5} сетей
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}