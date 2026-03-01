import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * SafeRender - компонент для безопасного рендеринга на мобильных устройствах
 * Перехватывает ошибки insertBefore и другие DOM ошибки
 */
class SafeRender extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Проверяем если это DOM ошибка
    if (error.message && (
      error.message.includes('insertBefore') ||
      error.message.includes('appendChild') ||
      error.message.includes('removeChild') ||
      error.message.includes('Node')
    )) {
      return { hasError: true, error };
    }

    // Для других ошибок пробрасываем выше
    throw error;
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // DOM error caught, handled by getDerivedStateFromError
  }

  public render() {
    if (this.state.hasError) {
      // Возвращаем fallback или пустой div
      return this.props.fallback || <div className="safe-render-fallback" />;
    }

    return this.props.children;
  }
}

export default SafeRender;

// Хук для безопасного рендеринга
export function useSafeRender() {
  const [renderKey, setRenderKey] = React.useState(0);

  const forceRerender = React.useCallback(() => {
    setRenderKey(prev => prev + 1);
  }, []);

  return { renderKey, forceRerender };
}

// HOC для оборачивания компонентов в SafeRender
export function withSafeRender<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return React.forwardRef<any, P>((props, ref) => (
    <SafeRender fallback={fallback}>
      <Component {...props} ref={ref} />
    </SafeRender>
  ));
}