import React, { Component, ErrorInfo, ReactNode } from 'react';
import { clearTradeFrameAppStorage, clearTradeFrameAuthStorage } from '@/utils/storageCleanup';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

function getLoginPath(): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${basePath}/login`;
}

function handleLoginRedirect() {
  clearTradeFrameAuthStorage();
  window.location.assign(getLoginPath());
}

function handleStorageReset() {
  if (!window.confirm('Все локальные данные будут удалены. Продолжить?')) return;
  clearTradeFrameAppStorage();
  window.location.reload();
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Сохраняем детали ошибки в состоянии
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    if (this.state.retryCount < 2) {
      // Простая попытка сброса состояния
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1
      });
    } else {
      // После 2 попыток предлагаем полную перезагрузку
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card border border-red-600 rounded-lg p-8 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-500 mb-4">⚠️ Ошибка приложения</h1>
            <div className="text-foreground space-y-4">
              <p className="text-lg">Произошла непредвиденная ошибка:</p>

              {this.state.error && (
                <div className="bg-secondary p-4 rounded border-l-4 border-red-500">
                  <p className="font-mono text-sm text-red-600 dark:text-red-300">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-muted-foreground cursor-pointer hover:text-foreground/80">
                        Показать технические детали
                      </summary>
                      <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Показываем информацию о попытках восстановления */}
              {this.state.retryCount > 0 && (
                <div className="bg-amber-100 dark:bg-amber-900/50 border border-amber-600 p-3 rounded">
                  <p className="text-amber-700 dark:text-amber-200 text-sm">
                    Попытка восстановления #{this.state.retryCount} из 2
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Кнопка повторной попытки */}
                <button
                  onClick={this.handleRetry}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                >
                  {this.state.retryCount < 2 ? 'Повторить попытку' : 'Принудительная перезагрузка'}
                </button>

                {/* Кнопка возврата к авторизации */}
                <button
                  onClick={handleLoginRedirect}
                  className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded"
                >
                  Войти заново
                </button>

                {/* Кнопка очистки данных и перезагрузки */}
                <button
                  onClick={handleStorageReset}
                  className="bg-secondary hover:bg-secondary text-foreground px-4 py-2 rounded"
                >
                  Очистить данные
                </button>
              </div>

              {/* Инструкции для пользователя */}
              <div className="text-sm text-muted-foreground border-t border-border pt-4">
                <p><strong>Что делать:</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Попробуйте <strong>"Повторить попытку"</strong> - часто помогает</li>
                  <li>Если не помогает - нажмите <strong>"Войти заново"</strong></li>
                  <li>В крайнем случае - <strong>"Очистить данные"</strong> (потеряются несохраненные изменения)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
