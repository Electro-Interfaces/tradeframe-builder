import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

console.log('📁 ProtectedRoute.tsx: Module loaded!');

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  console.log('🛡️ ProtectedRoute: component rendered');
  const { user, loading } = useAuth();
  console.log('🛡️ ProtectedRoute: user =', user, 'loading =', loading);
  const location = useLocation();

  // Показываем загрузку пока проверяем аутентификацию
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Проверка авторизации...</p>
        </div>
      </div>
    );
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