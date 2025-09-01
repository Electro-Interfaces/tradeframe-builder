import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database,
  Globe,
  AlertCircle
} from 'lucide-react';

import { 
  testApiConnection, 
  getApiStatus 
} from '@/services/apiSwitch';

interface ApiTestResult {
  success: boolean;
  service: string;
  error?: string;
}

export function ApiSwitchPanel() {
  const [testResults, setTestResults] = useState<ApiTestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [apiStatus] = useState(() => getApiStatus());

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const results = await testApiConnection();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleForceSwitch = (mode: 'http' | 'mock') => {
    if (mode === 'http') {
      localStorage.setItem('FORCE_HTTP_API', 'true');
    } else {
      localStorage.removeItem('FORCE_HTTP_API');
    }
    window.location.reload();
  };

  // Показывать только в dev режиме
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-500/20 bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-300">
          <Settings className="w-5 h-5" />
          🔧 API Switch Panel (DEV)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Текущий статус */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Текущий режим:</span>
            <Badge variant={apiStatus.mode === 'HTTP' ? 'default' : 'secondary'}>
              {apiStatus.mode === 'HTTP' ? (
                <><Globe className="w-3 h-3 mr-1" /> HTTP API</>
              ) : (
                <><Database className="w-3 h-3 mr-1" /> MOCK API</>
              )}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleForceSwitch('mock')}
              disabled={apiStatus.mode === 'MOCK'}
            >
              Mock режим
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleForceSwitch('http')}
              disabled={apiStatus.mode === 'HTTP'}
            >
              HTTP режим
            </Button>
          </div>
        </div>

        {/* Информация о конфигурации */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Base URL:</strong> {apiStatus.baseUrl}<br/>
            <strong>Debug Mode:</strong> {apiStatus.debugMode ? 'Включен' : 'Выключен'}
          </AlertDescription>
        </Alert>

        {/* Тестирование подключения */}
        {apiStatus.mode === 'HTTP' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Тест подключения к API:</span>
              <Button
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Тестировать'
                )}
              </Button>
            </div>

            {/* Результаты тестирования */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded border border-slate-600 bg-slate-800"
                  >
                    <span className="text-xs text-slate-300">{result.service}</span>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs">
                        {result.success ? 'OK' : result.error}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Инструкции */}
        <Alert className="bg-amber-950/20 border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-xs text-amber-300">
            <strong>Для production:</strong><br/>
            1. Настроить VITE_API_URL в .env<br/>
            2. Заменить импорты в services/ на apiSwitch.ts<br/>
            3. Убрать этот компонент из UI
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}