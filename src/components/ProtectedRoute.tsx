import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import '../types/window';

console.log('📁 ProtectedRoute.tsx: Module loaded!');

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  console.log('🛡️ ProtectedRoute: component rendered');
  const { user, loading } = useAuth();
  console.log('🛡️ ProtectedRoute: user =', user, 'loading =', loading);
  const location = useLocation();

  // Показываем загрузку пока проверяем аутентификацию (полагаемся на index.html)
  if (loading) {
    console.log('🔄 ProtectedRoute: loading=true, возвращаем null (загрузку показывает index.html)');
    // Обновляем статус в index.html
    if (typeof window !== 'undefined' && window.updateLoadingStatus) {
      window.updateLoadingStatus('Проверка авторизации...');
    }
    return null; // Пусть index.html показывает загрузку
  }

  // Если пользователь не авторизован - перенаправляем на страницу входа
  if (!user) {
    // Сохраняем текущий путь для возврата после входа
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Пользователь авторизован - показываем защищенное содержимое
  return <>{children}</>;
};

export default ProtectedRoute;