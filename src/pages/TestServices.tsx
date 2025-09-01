import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { testBasicServices, logTestResults } from '@/utils/testServicesSimple';
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2, Play, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  service: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export default function TestServices() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ successCount: number; errorCount: number; total: number } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    
    try {
      const testResults = await testBasicServices();
      setResults(testResults);
      
      const summary = logTestResults(testResults);
      setSummary(summary);
      
    } catch (error) {
      console.error('Ошибка при запуске тестов:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'success' | 'error') => {
    return status === 'success' ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (status: 'success' | 'error') => {
    return status === 'success' ? 
      <Badge variant="secondary" className="bg-green-100 text-green-800">Успешно</Badge> :
      <Badge variant="destructive">Ошибка</Badge>;
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Тестирование сервисов</h1>
            <p className="text-muted-foreground">Проверка работоспособности всех созданных сервисов</p>
          </div>
          
          <Button onClick={runTests} disabled={isRunning} size="lg">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Тестирование...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Запустить тесты
              </>
            )}
          </Button>
        </div>

        {summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Сводка результатов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Успешно: {summary.successCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">Ошибки: {summary.errorCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Всего: {summary.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-medium">{result.service}</h3>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                
                {result.data && result.status === 'success' && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      Показать пример данных
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {results.length === 0 && !isRunning && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нажмите "Запустить тесты" для проверки всех сервисов</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}