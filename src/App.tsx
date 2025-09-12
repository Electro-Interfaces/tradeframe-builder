import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/supabase/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SelectionProvider } from "./context/SelectionContext";
import { AuthProvider } from "./contexts/AuthContext";
import { lazy } from "react";
import LazyLoader from "./components/LazyLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";

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

// Admin страницы - ленивая загрузка (приоритет 2)
const Users = lazy(() => import("./pages/admin/Users"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const Instructions = lazy(() => import("./pages/admin/Instructions"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const DataInspector = lazy(() => import("./pages/DataInspector"));
const DataMigration = lazy(() => import("./pages/DataMigration"));

// Settings страницы - ленивая загрузка (приоритет 2)
const DatabaseSettings = lazy(() => import("./pages/DatabaseSettings"));
const ExternalDatabaseSettings = lazy(() => import("./pages/ExternalDatabaseSettings"));
const PartialMigrationSettings = lazy(() => import("./pages/PartialMigrationSettings"));
const DatabaseInitialization = lazy(() => import("./pages/DatabaseInitialization"));

// Network страницы - ленивая загрузка (приоритет 3)
const SalesAnalysisPage = lazy(() => import("./pages/SalesAnalysisPage"));
const PriceHistoryPage = lazy(() => import("./pages/PriceHistoryPage"));
const FuelStocksPage = lazy(() => import("./pages/FuelStocksPage"));
const NetworkEquipmentLog = lazy(() => import("./pages/NetworkEquipmentLog"));
const NotificationRules = lazy(() => import("./pages/NotificationRules"));
const Messages = lazy(() => import("./pages/Messages"));

// Equipment и остальные страницы - ленивая загрузка (приоритет 3)
const EquipmentTypes = lazy(() => import("./pages/EquipmentTypes"));
const ComponentTypes = lazy(() => import("./pages/ComponentTypes"));
const CommandTemplates = lazy(() => import("./pages/CommandTemplates"));
const NewCommandTemplates = lazy(() => import("./pages/NewCommandTemplates"));

// Остальные страницы - ленивая загрузка (приоритет 4)
const AdminUsersAndRoles = lazy(() => import("./pages/AdminUsersAndRoles"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const NewUsersAndRoles = lazy(() => import("./pages/admin/UsersAndRoles"));
const NetworksPage = lazy(() => import("./pages/NetworksPage"));
const Nomenclature = lazy(() => import("./pages/Nomenclature"));
const Connections = lazy(() => import("./pages/Connections"));
const Workflows = lazy(() => import("./pages/Workflows"));
const NetworkOverviewTest = lazy(() => import("./pages/NetworkOverviewTest"));
const ShiftReports = lazy(() => import("./pages/ShiftReports"));
const SalesAnalysisPageTest = lazy(() => import("./pages/SalesAnalysisPageTest"));
const OperationsTransactionsPage = lazy(() => import("./pages/OperationsTransactionsPage"));
const SimpleProfile = lazy(() => import("./pages/SimpleProfile"));
const TestServices = lazy(() => import("./pages/TestServices"));
const TestServicesSimple = lazy(() => import("./pages/TestServicesSimple"));
const TestDebug = lazy(() => import("./pages/TestDebug"));
const LegalDocuments = lazy(() => import("./pages/LegalDocuments"));
const LegalDocumentEditor = lazy(() => import("./pages/LegalDocumentEditor"));
const LegalUsersAcceptances = lazy(() => import("./pages/LegalUsersAcceptances"));

// Используем предварительно настроенный queryClient из lib/supabase/queryClient

const App = () => {
  console.log('🚀 App: component rendering');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <SelectionProvider>
            <BrowserRouter>
            <Routes>
            {/* Критически важные страницы - без lazy loading */}
            <Route path="/login" element={<LoginPageWithLegal />} />
            <Route 
              path="/" 
              element={
                <>
                  {console.log('🚀 App: Rendering home route with ProtectedRoute + Equipment')}
                  <ProtectedRoute><Equipment /></ProtectedRoute>
                </>
              } 
            />
          <Route path="/network/overview" element={<ProtectedRoute><NetworkOverview /></ProtectedRoute>} />
          
          {/* Самые тяжелые страницы - приоритет 1 */}
          <Route path="/point/prices" element={<ProtectedRoute><LazyLoader><Prices /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/sts-api" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/api-cts" element={<ProtectedRoute><LazyLoader><STSApiSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/point/tanks" element={<ProtectedRoute><LazyLoader><Tanks /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/operations-transactions" element={<ProtectedRoute><LazyLoader><OperationsTransactionsPageSimple /></LazyLoader></ProtectedRoute>} />
          
          {/* Admin страницы - приоритет 2 */}
          <Route path="/admin/users-and-roles" element={<ProtectedRoute><LazyLoader><Users /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute><LazyLoader><Roles /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/instructions" element={<ProtectedRoute><LazyLoader><Instructions /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><LazyLoader><AuditLog /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/data-inspector" element={<ProtectedRoute><LazyLoader><DataInspector /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/data-migration" element={<ProtectedRoute><LazyLoader><DataMigration /></LazyLoader></ProtectedRoute>} />
          
          {/* Settings страницы - приоритет 2 */}
          <Route path="/settings/database" element={<ProtectedRoute><LazyLoader><DatabaseSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/external-database" element={<ProtectedRoute><LazyLoader><ExternalDatabaseSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/partial-migration" element={<ProtectedRoute><LazyLoader><PartialMigrationSettings /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/database-initialization" element={<ProtectedRoute><LazyLoader><DatabaseInitialization /></LazyLoader></ProtectedRoute>} />
          
          {/* Network страницы - приоритет 3 */}
          <Route path="/network/sales-analysis" element={<ProtectedRoute><LazyLoader><SalesAnalysisPage /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/price-history" element={<ProtectedRoute><LazyLoader><PriceHistoryPage /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/fuel-stocks" element={<ProtectedRoute><LazyLoader><FuelStocksPage /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/equipment-log" element={<ProtectedRoute><LazyLoader><NetworkEquipmentLog /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/notifications" element={<ProtectedRoute><LazyLoader><NotificationRules /></LazyLoader></ProtectedRoute>} />
          <Route path="/network/messages" element={<ProtectedRoute><LazyLoader><Messages /></LazyLoader></ProtectedRoute>} />
          
          {/* Equipment страницы - приоритет 3 */}
          <Route path="/point/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
          <Route path="/settings/dictionaries/equipment-types" element={<ProtectedRoute><LazyLoader><EquipmentTypes /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/dictionaries/component-types" element={<ProtectedRoute><LazyLoader><ComponentTypes /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/dictionaries/command-templates" element={<ProtectedRoute><LazyLoader><CommandTemplates /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/templates/command-templates" element={<ProtectedRoute><LazyLoader><NewCommandTemplates /></LazyLoader></ProtectedRoute>} />
          
          {/* Остальные страницы - приоритет 4 */}
          <Route path="/admin/users-and-roles-new" element={<ProtectedRoute><LazyLoader><NewUsersAndRoles /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><LazyLoader><AdminUsers /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/networks" element={<ProtectedRoute><LazyLoader><NetworksPage /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/connections" element={<ProtectedRoute><LazyLoader><Connections /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/nomenclature" element={<ProtectedRoute><LazyLoader><Nomenclature /></LazyLoader></ProtectedRoute>} />
          <Route path="/settings/workflows" element={<ProtectedRoute><LazyLoader><Workflows /></LazyLoader></ProtectedRoute>} />
          <Route path="/point/shift-reports" element={<ProtectedRoute><LazyLoader><ShiftReports /></LazyLoader></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><LazyLoader><SimpleProfile /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/test-services" element={<ProtectedRoute><LazyLoader><TestServices /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/test-simple" element={<ProtectedRoute><LazyLoader><TestServicesSimple /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/test-debug" element={<ProtectedRoute><LazyLoader><TestDebug /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents" element={<ProtectedRoute><LazyLoader><LegalDocuments /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/users-acceptances" element={<ProtectedRoute><LazyLoader><LegalUsersAcceptances /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/edit" element={<ProtectedRoute><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/create" element={<ProtectedRoute><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/view" element={<ProtectedRoute><LazyLoader><LegalDocumentEditor /></LazyLoader></ProtectedRoute>} />
          
          {/* Fallback routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
          </BrowserRouter>
        </SelectionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
