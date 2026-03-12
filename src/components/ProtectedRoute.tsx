import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNewAuth } from '../contexts/NewAuthContext';
import { Loader2 } from 'lucide-react';
import '../types/window';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Требовать административный доступ (super_admin, system_admin, network_admin или permission manage) */
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin }) => {
  const { user, loading, isAdmin } = useNewAuth();
  const location = useLocation();

  // Показываем загрузку пока проверяем аутентификацию
  if (loading) {
    // Обновляем статус в index.html если возможно
    if (typeof window !== 'undefined' && window.updateLoadingStatus) {
      window.updateLoadingStatus('Проверка авторизации...');
    }

    // Показываем собственный лоадер для надежности
    return (
      <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-background font-sans">
        <div className="w-[60px] h-[60px] bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
        <p className="text-base text-muted-foreground m-0">Проверка авторизации...</p>
      </div>
    );
  }

  // Если пользователь не авторизован - перенаправляем на страницу входа
  if (!user) {
    // Сохраняем текущий путь для возврата после входа
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если требуется админский доступ, проверяем роль
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Пользователь авторизован - показываем защищенное содержимое
  return <>{children}</>;
};

export default ProtectedRoute;
