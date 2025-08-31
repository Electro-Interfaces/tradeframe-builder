import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

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
                    <pre className="mt-2 text-xs text-slate-400 overflow-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Перезагрузить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;