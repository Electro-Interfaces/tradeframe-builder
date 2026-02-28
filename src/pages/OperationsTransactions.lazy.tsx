import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Ленивая загрузка компонента страницы Операций
const OperationsTransactionsPageSimple = lazy(() => import('./OperationsTransactionsPageSimple'));

// Компонент загрузки
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-background">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground text-lg">Загрузка страницы операций...</p>
    </div>
  </div>
);

// Обёртка с Suspense для безопасной ленивой загрузки
export default function OperationsTransactionsLazy() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OperationsTransactionsPageSimple />
    </Suspense>
  );
}
