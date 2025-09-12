/**
 * Компонент для тестирования совместимости с мобильными браузерами
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrowserDetection } from '@/hooks/useBrowserDetection';
import { mobileUtils } from '@/utils/mobileUtils';
import { CheckCircle2, XCircle, AlertCircle, Smartphone, Wifi, Zap } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export function MobileBrowserTester() {
  const browserInfo = useBrowserDetection();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);

  useEffect(() => {
    // Проверяем доступность install prompt
    const checkInstallPrompt = () => {
      setInstallPromptAvailable(mobileUtils.isPWAInstalled() === false);
    };
    
    checkInstallPrompt();
  }, []);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Тест 1: Основные возможности браузера
    results.push({
      name: 'Определение браузера',
      status: browserInfo.name !== 'Unknown' ? 'pass' : 'fail',
      message: `${browserInfo.name} ${browserInfo.version} на ${browserInfo.platform}`,
      details: `Движок: ${browserInfo.engine}, WebView: ${browserInfo.isWebView ? 'Да' : 'Нет'}`
    });

    // Тест 2: PWA поддержка
    results.push({
      name: 'PWA поддержка',
      status: browserInfo.supportsPWA ? 'pass' : 'fail',
      message: browserInfo.supportsPWA ? 'Service Worker и Cache API поддерживаются' : 'PWA не поддерживается',
      details: `Install prompt: ${browserInfo.capabilities.hasInstallPrompt ? 'Доступен' : 'Недоступен'}`
    });

    // Тест 3: Тач возможности
    const touchSupport = browserInfo.capabilities.maxTouchPoints > 0;
    results.push({
      name: 'Поддержка касаний',
      status: touchSupport ? 'pass' : 'warning',
      message: `Максимум точек касания: ${browserInfo.capabilities.maxTouchPoints}`,
      details: touchSupport ? 'Multi-touch поддерживается' : 'Touch события могут работать некорректно'
    });

    // Тест 4: CSS функции
    results.push({
      name: 'CSS Viewport Units',
      status: browserInfo.cssFeatures.hasViewportUnits ? 'pass' : 'warning',
      message: browserInfo.cssFeatures.hasViewportUnits ? 'vh/vw поддерживаются' : 'Могут быть проблемы с viewport',
      details: `Safe Area: ${browserInfo.cssFeatures.hasSafeArea ? 'Да' : 'Нет'}, Hover: ${browserInfo.cssFeatures.hasHover ? 'Да' : 'Нет'}`
    });

    // Тест 5: Локальное хранилище
    const storageWorks = browserInfo.capabilities.localStorage && browserInfo.capabilities.sessionStorage;
    results.push({
      name: 'Локальное хранилище',
      status: storageWorks ? 'pass' : 'fail',
      message: storageWorks ? 'localStorage и sessionStorage работают' : 'Проблемы с хранилищем',
      details: `IndexedDB: ${browserInfo.capabilities.indexedDB ? 'Доступен' : 'Недоступен'}`
    });

    // Тест 6: Сетевое соединение
    const deviceInfo = mobileUtils.detectDeviceInfo();
    if (deviceInfo.connection) {
      const isGoodConnection = deviceInfo.connection.effectiveType === '4g' && deviceInfo.connection.downlink > 2;
      results.push({
        name: 'Сетевое соединение',
        status: isGoodConnection ? 'pass' : 'warning',
        message: `${deviceInfo.connection.effectiveType} (${deviceInfo.connection.downlink} Мбит/с)`,
        details: `RTT: ${deviceInfo.connection.rtt}мс, Save Data: ${deviceInfo.connection.saveData ? 'Включен' : 'Выключен'}`
      });
    }

    // Тест 7: Производительность устройства
    const isHighPerformance = deviceInfo.hardwareConcurrency >= 4 && (deviceInfo.deviceMemory || 4) >= 4;
    results.push({
      name: 'Производительность',
      status: isHighPerformance ? 'pass' : 'warning',
      message: `${deviceInfo.hardwareConcurrency} ядер, ${deviceInfo.deviceMemory || '?'} ГБ RAM`,
      details: `Пиксельное отношение: ${deviceInfo.screenSize.pixelRatio}x`
    });

    // Тест 8: Quirks и совместимость
    const hasQuirks = browserInfo.viewportQuirks.length > 0;
    results.push({
      name: 'Браузерные особенности',
      status: hasQuirks ? 'warning' : 'pass',
      message: hasQuirks ? `Обнаружено ${browserInfo.viewportQuirks.length} особенностей` : 'Особенности не обнаружены',
      details: hasQuirks ? browserInfo.viewportQuirks.join(', ') : 'Стандартное поведение браузера'
    });

    // Тест 9: Полифиллы
    const needsPolyfills = browserInfo.requiredPolyfills.length > 0;
    results.push({
      name: 'Требуемые полифиллы',
      status: needsPolyfills ? 'warning' : 'pass',
      message: needsPolyfills ? `Требуется ${browserInfo.requiredPolyfills.length} полифиллов` : 'Полифиллы не требуются',
      details: needsPolyfills ? browserInfo.requiredPolyfills.join(', ') : 'Все современные функции поддерживаются'
    });

    // Тест 10: Дополнительные возможности
    const features = [
      browserInfo.capabilities.hasVibration && 'Вибрация',
      browserInfo.capabilities.hasGeolocation && 'Геолокация',
      browserInfo.capabilities.hasFullscreen && 'Полный экран',
      browserInfo.capabilities.hasOrientation && 'Ориентация'
    ].filter(Boolean);

    results.push({
      name: 'Дополнительные API',
      status: features.length > 2 ? 'pass' : 'warning',
      message: `Доступно ${features.length} API`,
      details: features.join(', ') || 'Базовые функции браузера'
    });

    await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация тестов
    setTestResults(results);
    setIsRunning(false);
  };

  const testVibration = () => {
    const success = mobileUtils.contextVibrate('success');
    if (!success) {
      alert('Вибрация не поддерживается или отключена');
    }
  };

  const testInstallPrompt = async () => {
    const success = await mobileUtils.showInstallPrompt();
    if (!success) {
      alert('Install prompt недоступен или уже установлено');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'fail': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const diagnostics = mobileUtils.generateDiagnostics();
  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold">Тестирование мобильных браузеров</h1>
        </div>
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunning ? 'Тестирование...' : 'Запустить тесты'}
        </Button>
      </div>

      {/* Общая информация */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Информация о браузере
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Браузер</h4>
              <p className="text-sm text-slate-300">
                {browserInfo.name} {browserInfo.version}
              </p>
              <p className="text-xs text-slate-400">
                Движок: {browserInfo.engine}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Платформа</h4>
              <p className="text-sm text-slate-300">
                {browserInfo.platform.toUpperCase()}
              </p>
              <p className="text-xs text-slate-400">
                {browserInfo.isWebView ? 'WebView' : 'Нативный браузер'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Экран</h4>
              <p className="text-sm text-slate-300">
                {diagnostics.viewport.width}×{diagnostics.viewport.height}
              </p>
              <p className="text-xs text-slate-400">
                DPR: {diagnostics.device.screenSize.pixelRatio}x
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Результаты тестов */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Результаты тестов</span>
              <div className="flex gap-2">
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  ✓ {passCount}
                </Badge>
                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                  ⚠ {warningCount}
                </Badge>
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                  ✗ {failCount}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                  </div>
                  <p className="text-sm mt-1 ml-6">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-slate-400 mt-1 ml-6">{result.details}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Интерактивные тесты */}
      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="features">Функции</TabsTrigger>
          <TabsTrigger value="diagnostics">Диагностика</TabsTrigger>
          <TabsTrigger value="performance">Производительность</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Интерактивное тестирование</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={testVibration} 
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!browserInfo.capabilities.hasVibration}
                >
                  <Zap className="h-4 w-4" />
                  Тест вибрации
                </Button>
                
                <Button 
                  onClick={testInstallPrompt} 
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!installPromptAvailable}
                >
                  <Smartphone className="h-4 w-4" />
                  Установить PWA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Полная диагностика</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-slate-800 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Производительность и сеть
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostics.network && (
                  <div>
                    <h4 className="font-semibold mb-2">Сетевое соединение</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-slate-400">Тип</span>
                        <p className="font-mono">{diagnostics.network.effectiveType}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Скорость</span>
                        <p className="font-mono">{diagnostics.network.downlink} Мбит/с</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">RTT</span>
                        <p className="font-mono">{diagnostics.network.rtt} мс</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Экономия</span>
                        <p className="font-mono">{diagnostics.network.saveData ? 'Вкл' : 'Выкл'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2">Устройство</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-slate-400">CPU ядра</span>
                      <p className="font-mono">{diagnostics.performance.hardwareConcurrency}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">RAM</span>
                      <p className="font-mono">{diagnostics.performance.deviceMemory || '?'} ГБ</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Соединение</span>
                      <p className="font-mono">{diagnostics.performance.connection || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}