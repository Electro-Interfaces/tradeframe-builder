import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ErrorBoundary: React error caught:', error);
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary: Detailed error info:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      location: window.location.href,
      userAgent: navigator.userAgent.substring(0, 50) + '...',
      timestamp: new Date().toISOString(),
      localStorage: {
        hasUser: !!localStorage.getItem('tradeframe_user'),
        hasToken: !!localStorage.getItem('authToken')
      }
    });

    // Сохраняем детали ошибки в состоянии
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    console.log('🔄 ErrorBoundary: Пользователь пытается восстановить приложение');

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
      console.log('🔄 ErrorBoundary: Максимум попыток достигнут, перезагружаем страницу');
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-600 rounded-lg p-8 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-500 mb-4">⚠️ Ошибка приложения</h1>
            <div className="text-white space-y-4">
              <p className="text-lg">Произошла непредвиденная ошибка:</p>

              {this.state.error && (
                <div className="bg-slate-700 p-4 rounded border-l-4 border-red-500">
                  <p className="font-mono text-sm text-red-300">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
                        Показать технические детали
                      </summary>
                      <pre className="mt-2 text-xs text-slate-400 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Показываем информацию о попытках восстановления */}
              {this.state.retryCount > 0 && (
                <div className="bg-amber-900/50 border border-amber-600 p-3 rounded">
                  <p className="text-amber-200 text-sm">
                    Попытка восстановления #{this.state.retryCount} из 2
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Кнопка повторной попытки */}
                <button
                  onClick={this.handleRetry}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  {this.state.retryCount < 2 ? 'Повторить попытку' : 'Принудительная перезагрузка'}
                </button>

                {/* Кнопка возврата к авторизации */}
                <button
                  onClick={() => {
                    console.log('🔄 ErrorBoundary: Переход к авторизации после ошибки');
                    localStorage.removeItem('tradeframe_user');
                    localStorage.removeItem('authToken');
                    window.location.href = '/login';
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Войти заново
                </button>

                {/* Кнопка очистки данных и перезагрузки */}
                <button
                  onClick={() => {
                    console.log('🔄 ErrorBoundary: Полная очистка данных пользователем');
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded"
                >
                  Очистить данные
                </button>
              </div>

              {/* Инструкции для пользователя */}
              <div className="text-sm text-slate-400 border-t border-slate-600 pt-4">
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