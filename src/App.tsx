import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SafeRender from "@/components/common/SafeRender";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SelectionProvider } from "./contexts/SelectionContext";
import { NewAuthProvider } from "./contexts/NewAuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SupportProvider } from "./contexts/SupportContext";
import { getToken } from "./utils/authStorage";
import CreateTicketDialog from "./components/support/CreateTicketDialog";
import { lazy, useEffect, useState } from "react";
import LazyLoader from "./components/LazyLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import PWAInstaller from "./components/pwa/PWAInstaller";
import SafariPWAInstaller from "./components/pwa/SafariPWAInstaller";
import UpdateNotification from "./components/pwa/UpdateNotification";
import OfflineIndicator from "./components/common/OfflineIndicator";
import "./cache-buster"; // Принудительное обновление кеша

// Критически важные страницы - загружаются сразу (первый экран / fallback)
import LoginPageWithLegal from "./pages/LoginPageWithLegal";
import NotFound from "./pages/NotFound";

// Главные страницы — lazy (после авторизации)
const Equipment = lazy(() => import("./pages/Equipment"));
const NetworkOverview = lazy(() => import("./pages/NetworkOverview"));

// Самые тяжелые страницы - ленивая загрузка (приоритет 1)
const Prices = lazy(() => import("./pages/Prices"));
const STSApiSettings = lazy(() => import("./pages/STSApiSettings"));
const Tanks = lazy(() => import("./pages/Tanks"));
const OperationsTransactionsPageSimple = lazy(() => import("./pages/OperationsTransactionsPageSimple"));
const CouponsPage = lazy(() => import("./pages/CouponsPage"));
const FuelInventory = lazy(() => import("./pages/FuelInventory"));

// Admin страницы - ленивая загрузка (приоритет 2)
const Users = lazy(() => import("./pages/admin/Users"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const DataMigration = lazy(() => import("./pages/DataMigration"));

// Settings страницы - ленивая загрузка (приоритет 2)
const UserNotificationSettings = lazy(() => import("./pages/UserNotificationSettings"));

// Network страницы - ленивая загрузка (приоритет 3)
const SalesAnalysisPage = lazy(() => import("./pages/SalesAnalysisPage"));
const NetworkNotifications = lazy(() => import("./pages/NetworkNotifications"));
const Messages = lazy(() => import("./pages/Messages"));
const BroadcastMessages = lazy(() => import("./pages/BroadcastMessages"));
const Receipts = lazy(() => import("./pages/network/Receipts"));
const NetworkPricing = lazy(() => import("./pages/NetworkPricing"));
const ReconciliationPage = lazy(() => import("./pages/ReconciliationPage"));
const MarginAnalytics = lazy(() => import("./pages/analytics/MarginAnalytics"));
const OnlineOrdersMonitor = lazy(() => import("./pages/OnlineOrdersMonitor"));

// Equipment и остальные страницы - ленивая загрузка (приоритет 3)

// Остальные страницы - ленивая загрузка (приоритет 4)
const NewUsersAndRoles = lazy(() => import("./pages/admin/UsersAndRoles"));
const NetworksPage = lazy(() => import("./pages/NetworksPage"));
const ShiftReportsV2 = lazy(() => import("./pages/ShiftReportsV2"));
const ShiftDashboard = lazy(() => import("./pages/ShiftDashboard"));
const SimpleProfile = lazy(() => import("./pages/SimpleProfile"));
const TestServices = lazy(() => import("./pages/TestServices"));
const TestServicesSimple = lazy(() => import("./pages/TestServicesSimple"));
const TestDebug = lazy(() => import("./pages/TestDebug"));
const MobileBrowserTest = lazy(() => import("./pages/MobileBrowserTest"));
const LegalDocuments = lazy(() => import("./pages/LegalDocuments"));
const LegalDocumentEditor = lazy(() => import("./pages/LegalDocumentEditor"));
const LegalDocumentHistory = lazy(() => import("./pages/LegalDocumentHistory"));
const LegalUsersAcceptances = lazy(() => import("./pages/LegalUsersAcceptances"));
const LogoVariants = lazy(() => import("./pages/LogoVariants"));

// Support страницы
const TicketsPage = lazy(() => import("./pages/support/TicketsPage"));
const ChatPage = lazy(() => import("./pages/support/ChatPage"));

// Используем предварительно настроенный queryClient из lib/queryClient

function isChunkLoadError(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
}

const App = () => {
  const [showPWAInstaller, setShowPWAInstaller] = useState(false);

  // Глобальный обработчик ошибок динамического импорта
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';

      // Проверяем, является ли это ошибкой динамического импорта
      if (isChunkLoadError(errorMessage)) {
        // Dynamic import error detected, reloading page

        // Предотвращаем бесконечную перезагрузку
        const lastReload = sessionStorage.getItem('lastChunkErrorReload');
        const now = Date.now();

        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('lastChunkErrorReload', now.toString());
          window.location.reload();
        }

        event.preventDefault();
      }
    };

    window.addEventListener('error', handleChunkError);

    return () => {
      window.removeEventListener('error', handleChunkError);
    };
  }, []);

  // Обработка перенаправления с GitHub Pages 404 с улучшенной защитой
  useEffect(() => {
    try {
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {

        // Валидация redirect path для предотвращения падений
        const validPaths = [
          '/', '/login', '/network/overview', '/network/operations-transactions',
          '/point/equipment', '/point/prices', '/point/tanks', '/admin/users-and-roles'
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
          targetPath = '/';
        }

        // ВАЖНО: Если пользователь авторизован, не перенаправляем на /login
        const isUserLoggedIn = !!getToken();
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
      // В случае критической ошибки просто перенаправляем на главную
      try {
        sessionStorage.removeItem('redirectPath');
        window.history.replaceState(null, '', '/');
      } catch (fallbackError) {
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
    <ErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SafeRender>
            <Toaster />
            <SonnerToaster position="top-right" richColors />
          </SafeRender>
          <NewAuthProvider>
            <SelectionProvider>
              <BrowserRouter
                basename={import.meta.env.BASE_URL}
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <div data-testid="router-ready" style={{ display: 'none' }}></div>
                <OfflineIndicator />
                <SupportProvider>
                <CreateTicketDialog />
                <Routes>
                  {/* Критически важные страницы - без lazy loading */}
                  <Route path="/login" element={<LoginPageWithLegal />} />
                  <Route path="/" element={<ProtectedRoute><LazyLoader><Equipment /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/overview" element={<ProtectedRoute><LazyLoader><NetworkOverview /></LazyLoader></ProtectedRoute>} />

                  {/* Самые тяжелые страницы - приоритет 1 */}
                  <Route path="/point/prices" element={<ProtectedRoute><LazyLoader><Prices /></LazyLoader></ProtectedRoute>} />
                  <Route path="/settings/sts-api" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
                  <Route path="/settings/api-cts" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
                  <Route path="/point/tanks" element={<ProtectedRoute><LazyLoader><Tanks /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/operations-transactions" element={<ProtectedRoute><LazyLoader><OperationsTransactionsPageSimple /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/coupons" element={<ProtectedRoute><LazyLoader><CouponsPage /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/fuel-inventory" element={<ProtectedRoute><LazyLoader><FuelInventory /></LazyLoader></ProtectedRoute>} />

                  {/* Admin страницы - приоритет 2 (requireAdmin — проверка роли) */}
                  <Route path="/admin/users-and-roles" element={<ProtectedRoute requireAdmin><LazyLoader><Users /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><LazyLoader><Roles /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/audit" element={<ProtectedRoute requireAdmin><LazyLoader><AuditLog /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/data-migration" element={<ProtectedRoute requireAdmin><LazyLoader><DataMigration /></LazyLoader></ProtectedRoute>} />

                  {/* Settings страницы - приоритет 2 */}
                  <Route path="/settings/notifications" element={<ProtectedRoute><LazyLoader><UserNotificationSettings /></LazyLoader></ProtectedRoute>} />

                  {/* Network страницы - приоритет 3 */}
                  <Route path="/network/sales-analysis" element={<ProtectedRoute><LazyLoader><SalesAnalysisPage /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/pricing" element={<ProtectedRoute><LazyLoader><NetworkPricing /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/notifications" element={<ProtectedRoute><LazyLoader><NetworkNotifications /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/messages" element={<ProtectedRoute><LazyLoader><Messages /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/broadcast-messages" element={<ProtectedRoute><LazyLoader><BroadcastMessages /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/receipts" element={<ProtectedRoute><LazyLoader><Receipts /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/reconciliation" element={<ProtectedRoute><LazyLoader><ReconciliationPage /></LazyLoader></ProtectedRoute>} />
                  <Route path="/analytics/margins" element={<ProtectedRoute><LazyLoader><MarginAnalytics /></LazyLoader></ProtectedRoute>} />
                  <Route path="/network/online-orders" element={<ProtectedRoute><LazyLoader><OnlineOrdersMonitor /></LazyLoader></ProtectedRoute>} />

                  {/* Equipment страницы - приоритет 3 */}
                  <Route path="/point/equipment" element={<ProtectedRoute><LazyLoader><Equipment /></LazyLoader></ProtectedRoute>} />

                  {/* Остальные страницы - приоритет 4 */}
                  <Route path="/admin/users-and-roles-new" element={<ProtectedRoute requireAdmin><LazyLoader><NewUsersAndRoles /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/networks" element={<ProtectedRoute requireAdmin><LazyLoader><NetworksPage /></LazyLoader></ProtectedRoute>} />
                  <Route path="/point/shift-reports-v2" element={<ProtectedRoute><LazyLoader><ShiftReportsV2 /></LazyLoader></ProtectedRoute>} />
                  <Route path="/point/shift-dashboard" element={<ProtectedRoute><LazyLoader><ShiftDashboard /></LazyLoader></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><LazyLoader><SimpleProfile /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/test-services" element={<ProtectedRoute requireAdmin><LazyLoader><TestServices /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/test-simple" element={<ProtectedRoute requireAdmin><LazyLoader><TestServicesSimple /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/test-debug" element={<ProtectedRoute requireAdmin><LazyLoader><TestDebug /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/mobile-browser-test" element={<ProtectedRoute requireAdmin><LazyLoader><MobileBrowserTest /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/legal-documents" element={<ProtectedRoute requireAdmin><LazyLoader><LegalDocuments /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/legal-documents/users-acceptances" element={<ProtectedRoute requireAdmin><LazyLoader><LegalUsersAcceptances /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/legal-documents/:docType/history" element={<ProtectedRoute requireAdmin><LazyLoader><LegalDocumentHistory /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/legal-documents/:docType/edit" element={<ProtectedRoute requireAdmin><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/legal-documents/:docType/create" element={<ProtectedRoute requireAdmin><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
                  <Route path="/admin/legal-documents/:docType/view" element={<ProtectedRoute requireAdmin><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
                  <Route path="/logos" element={<LazyLoader><LogoVariants /></LazyLoader>} />

                  {/* Support страницы */}
                  <Route path="/support/tickets" element={<ProtectedRoute><LazyLoader><TicketsPage /></LazyLoader></ProtectedRoute>} />
                  <Route path="/support/chat" element={<ProtectedRoute><LazyLoader><ChatPage /></LazyLoader></ProtectedRoute>} />

                  {/* Fallback routes */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </SupportProvider>
              </BrowserRouter>

              {/* PWA Installers: общий для Chrome/Edge + специальный для Safari */}
              {showPWAInstaller && <PWAInstaller />}
              <SafariPWAInstaller />
              <UpdateNotification />
            </SelectionProvider>
          </NewAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
