import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SafeRender from "@/components/common/SafeRender";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/supabase/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SelectionProvider } from "./contexts/SelectionContext";
import { NewAuthProvider } from "./contexts/NewAuthContext";
import { lazy, useEffect, useState } from "react";
import LazyLoader from "./components/LazyLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import PWAInstaller from "./components/pwa/PWAInstaller";
import UpdateNotification from "./components/pwa/UpdateNotification";
import "./cache-buster"; // Принудительное обновление кеша

// Критически важные страницы - загружаются сразу
import LoginPageWithLegal from "./pages/LoginPageWithLegal";
import NetworkOverview from "./pages/NetworkOverview";
import Equipment from "./pages/Equipment";
import NotFound from "./pages/NotFound";

// Самые тяжелые страницы - ленивая загрузка (приоритет 1)
const Prices = lazy(() => import("./pages/Prices"));
const STSApiSettings = lazy(() => import("./pages/STSApiSettings"));
const Tanks = lazy(() => import("./pages/Tanks"));
const OperationsTransactionsPageSimple = lazy(() => import("./pages/OperationsTransactionsPageSimple"));
const CouponsPage = lazy(() => import("./pages/CouponsPage"));

// Admin страницы - ленивая загрузка (приоритет 2)
const Users = lazy(() => import("./pages/admin/Users"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const Instructions = lazy(() => import("./pages/admin/Instructions"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const DataMigration = lazy(() => import("./pages/DataMigration"));

// Settings страницы - ленивая загрузка (приоритет 2)
const ExternalDatabaseSettings = lazy(() => import("./pages/ExternalDatabaseSettings"));

// Network страницы - ленивая загрузка (приоритет 3)
const SalesAnalysisPage = lazy(() => import("./pages/SalesAnalysisPage"));
const NotificationRules = lazy(() => import("./pages/NotificationRules"));
const Messages = lazy(() => import("./pages/Messages"));

// Equipment и остальные страницы - ленивая загрузка (приоритет 3)

// Остальные страницы - ленивая загрузка (приоритет 4)
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const NewUsersAndRoles = lazy(() => import("./pages/admin/UsersAndRoles"));
const NetworksPage = lazy(() => import("./pages/NetworksPage"));
const ShiftReportsV2 = lazy(() => import("./pages/ShiftReportsV2"));
const SimpleProfile = lazy(() => import("./pages/SimpleProfile"));
const TestServices = lazy(() => import("./pages/TestServices"));
const TestServicesSimple = lazy(() => import("./pages/TestServicesSimple"));
const TestDebug = lazy(() => import("./pages/TestDebug"));
const MobileBrowserTest = lazy(() => import("./pages/MobileBrowserTest"));
const LegalDocuments = lazy(() => import("./pages/LegalDocuments"));
const LegalDocumentEditor = lazy(() => import("./pages/LegalDocumentEditor"));
const LegalUsersAcceptances = lazy(() => import("./pages/LegalUsersAcceptances"));

// Используем предварительно настроенный queryClient из lib/supabase/queryClient

const App = () => {
  const [showPWAInstaller, setShowPWAInstaller] = useState(false);

  // Обработка перенаправления с GitHub Pages 404 с улучшенной защитой
  useEffect(() => {
    try {
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {

        // Валидация redirect path для предотвращения падений
        const validPaths = [
          '/', '/login', '/network/overview', '/network/operations-transactions',
          '/point/equipment', '/point/prices', '/point/tanks', '/admin/users'
        ];

        let targetPath = redirectPath;
        // Убираем базовый путь для GitHub Pages
        if (targetPath.startsWith('/tradeframe-builder')) {
          targetPath = targetPath.substring('/tradeframe-builder'.length) || '/';
        }

        const isValidPath = validPaths.some(path =>
          targetPath === path || targetPath.startsWith(path + '/')
        );

        if (!isValidPath) {
          console.warn('⚠️ App: Invalid redirect path detected, redirecting to home:', targetPath);
          targetPath = '/';
        }

        // ВАЖНО: Если пользователь авторизован, не перенаправляем на /login
        // Проверяем оба варианта ключей: старые и новые
        const isUserLoggedIn = (
          (localStorage.getItem('tradeframe_user') && localStorage.getItem('authToken')) ||
          (localStorage.getItem('tradeframe_user_v2') && localStorage.getItem('tradeframe_token_v2'))
        );
        if (targetPath === '/login' && isUserLoggedIn) {
          targetPath = '/';
        }

        sessionStorage.removeItem('redirectPath');

        // Безопасное обновление истории
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', targetPath);
        } else {
          // Fallback для старых браузеров
          window.location.href = targetPath;
        }
      }
    } catch (error) {
      console.error('🚫 App: Critical redirect error, falling back to home:', error);
      // В случае критической ошибки просто перенаправляем на главную
      try {
        sessionStorage.removeItem('redirectPath');
        window.history.replaceState(null, '', '/');
      } catch (fallbackError) {
        console.error('🚫 App: Fallback also failed:', fallbackError);
        window.location.href = '/';
      }
    }
  }, []);

  // Показываем PWA инсталлер через 3 секунды после загрузки приложения
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPWAInstaller(true);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SafeRender>
          <Toaster />
        </SafeRender>
        <NewAuthProvider>
          <SelectionProvider>
            <BrowserRouter basename={import.meta.env.PROD ? "/tradeframe-builder" : "/"}>
                <div data-testid="router-ready" style={{ display: 'none' }}></div>
            <Routes>
            {/* Критически важные страницы - без lazy loading */}
            <Route path="/login" element={<LoginPageWithLegal />} />
            <Route
              path="/"
              element={<ProtectedRoute><Equipment /></ProtectedRoute>}
            />
          <Route path="/network/overview" element={<ProtectedRoute><NetworkOverview /></ProtectedRoute>} />
          
          {/* Самые тяжелые страницы - приоритет 1 */}
          <Route path="/point/prices" element={<ProtectedRoute><LazyLoader><Prices /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/sts-api" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/api-cts" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/point/tanks" element={<ProtectedRoute><LazyLoader><Tanks /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/operations-transactions" element={<ProtectedRoute><LazyLoader><OperationsTransactionsPageSimple /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/coupons" element={<ProtectedRoute><LazyLoader><CouponsPage /></LazyLoader></ProtectedRoute>} />

          {/* Admin страницы - приоритет 2 */}
          <Route path="/admin/users-and-roles" element={<ProtectedRoute><LazyLoader><Users /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute><LazyLoader><Roles /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/instructions" element={<ProtectedRoute><LazyLoader><Instructions /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><LazyLoader><AuditLog /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/data-migration" element={<ProtectedRoute><LazyLoader><DataMigration /></LazyLoader></ProtectedRoute>} />
          
          {/* Settings страницы - приоритет 2 */}
          <Route path="/settings/external-database" element={<ProtectedRoute><LazyLoader><ExternalDatabaseSettings /></LazyLoader></ProtectedRoute>} />
          
          {/* Network страницы - приоритет 3 */}
          <Route path="/network/sales-analysis" element={<ProtectedRoute><LazyLoader><SalesAnalysisPage /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/notifications" element={<ProtectedRoute><LazyLoader><NotificationRules /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/messages" element={<ProtectedRoute><LazyLoader><Messages /></LazyLoader></ProtectedRoute>} />
          
          {/* Equipment страницы - приоритет 3 */}
          <Route path="/point/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
          
          {/* Остальные страницы - приоритет 4 */}
          <Route path="/admin/users-and-roles-new" element={<ProtectedRoute><LazyLoader><NewUsersAndRoles /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><LazyLoader><AdminUsers /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/networks" element={<ProtectedRoute><LazyLoader><NetworksPage /></LazyLoader></ProtectedRoute>} />
          <Route path="/point/shift-reports-v2" element={<ProtectedRoute><LazyLoader><ShiftReportsV2 /></LazyLoader></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><LazyLoader><SimpleProfile /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/test-services" element={<ProtectedRoute><LazyLoader><TestServices /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/test-simple" element={<ProtectedRoute><LazyLoader><TestServicesSimple /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/test-debug" element={<ProtectedRoute><LazyLoader><TestDebug /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/mobile-browser-test" element={<ProtectedRoute><LazyLoader><MobileBrowserTest /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents" element={<ProtectedRoute><LazyLoader><LegalDocuments /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/users-acceptances" element={<ProtectedRoute><LazyLoader><LegalUsersAcceptances /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/edit" element={<ProtectedRoute><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/create" element={<ProtectedRoute><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/view" element={<ProtectedRoute><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
          
          {/* Fallback routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
          </BrowserRouter>

          {showPWAInstaller && <PWAInstaller />}
          <UpdateNotification />
        </SelectionProvider>
      </NewAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
