import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNewAuth } from '../contexts/NewAuthContext';
import { Loader2 } from 'lucide-react';
import '../types/window';

console.log('📁 ProtectedRoute.tsx: Module loaded!');

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  console.log('🛡️ ProtectedRoute: component rendered');
  const { user, loading } = useNewAuth();
  console.log('🛡️ ProtectedRoute: user =', user, 'loading =', loading);
  const location = useLocation();

  // Показываем загрузку пока проверяем аутентификацию
  if (loading) {
    console.log('🔄 ProtectedRoute: loading=true, показываем лоадер');
    // Обновляем статус в index.html если возможно
    if (typeof window !== 'undefined' && window.updateLoadingStatus) {
      window.updateLoadingStatus('Проверка авторизации...');
    }

    // Показываем собственный лоадер для надежности
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9998,
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: '#3b82f6',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
        }}>
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          margin: 0
        }}>Проверка авторизации...</p>
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