import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/supabase/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SelectionProvider } from "./contexts/SelectionContext";
import { AuthProvider } from "./contexts/AuthContext";
import { lazy, useEffect } from "react";
import LazyLoader from "./components/LazyLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import PWAInstaller from "./components/pwa/PWAInstaller";
import UpdateNotification from "./components/pwa/UpdateNotification";

// Критически важные страницы - загружаются сразу
import LoginPageWithLegal from "./pages/LoginPageWithLegal";
import NetworkOverview from "./pages/NetworkOverview";
import Equipment from "./pages/Equipment";
import NotFound from "./pages/NotFound";

// Самые тяжелые страницы - ленивая загрузка (приоритет 1)
const Prices = lazy(() => import("./pages/Prices"));
const PricesSimple = lazy(() => import("./pages/PricesSimple"));
const STSApiSettings = lazy(() => import("./pages/STSApiSettings"));
const Tanks = lazy(() => import("./pages/Tanks"));
const OperationsTransactionsPageSimple = lazy(() => import("./pages/OperationsTransactionsPageSimple"));

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
const ShiftReports = lazy(() => import("./pages/ShiftReports"));
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
  console.log('🚀 App: component rendering');

  // Обработка перенаправления с GitHub Pages 404
  useEffect(() => {
    try {
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {
        console.log('🔄 App: Found redirect path, navigating to:', redirectPath);
        sessionStorage.removeItem('redirectPath');
        // Используем replace чтобы заменить историю, а не добавлять новую запись
        window.history.replaceState(null, '', redirectPath);
      }
    } catch (error) {
      console.error('🚫 App useEffect error:', error);
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <SelectionProvider>
            <BrowserRouter basename={import.meta.env.PROD ? "/tradeframe-builder" : "/"}>
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
          <Route path="/point/prices-simple" element={<ProtectedRoute><LazyLoader><PricesSimple /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/sts-api" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/api-cts" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/point/tanks" element={<ProtectedRoute><LazyLoader><Tanks /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/operations-transactions" element={<ProtectedRoute><LazyLoader><OperationsTransactionsPageSimple /></LazyLoader></ProtectedRoute>} />
          
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
          <Route path="/point/shift-reports" element={<ProtectedRoute><LazyLoader><ShiftReports /></LazyLoader></ProtectedRoute>} />
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

          <PWAInstaller />
          <UpdateNotification />
        </SelectionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
