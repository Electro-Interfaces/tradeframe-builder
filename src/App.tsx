import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SelectionProvider } from "./context/SelectionContext";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy загрузка всех страниц
const AdminUsersAndRoles = lazy(() => import("./pages/AdminUsersAndRoles"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const NewUsersAndRoles = lazy(() => import("./pages/admin/UsersAndRoles"));
const Users = lazy(() => import("./pages/admin/Users"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const Instructions = lazy(() => import("./pages/admin/Instructions"));
const NetworksPage = lazy(() => import("./pages/NetworksPage"));
const Nomenclature = lazy(() => import("./pages/Nomenclature"));
const SalesAnalysisPage = lazy(() => import("./pages/SalesAnalysisPage"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const EquipmentTypes = lazy(() => import("./pages/EquipmentTypes"));
const ComponentTypes = lazy(() => import("./pages/ComponentTypes"));
const Equipment = lazy(() => import("./pages/Equipment"));
const CommandTemplates = lazy(() => import("./pages/CommandTemplates"));
const NewCommandTemplates = lazy(() => import("./pages/NewCommandTemplates"));
const Connections = lazy(() => import("./pages/Connections"));
const Workflows = lazy(() => import("./pages/Workflows"));
const NetworkOverview = lazy(() => import("./pages/NetworkOverview"));
const NetworkOverviewTest = lazy(() => import("./pages/NetworkOverviewTest"));
const NotificationRules = lazy(() => import("./pages/NotificationRules"));
const Messages = lazy(() => import("./pages/Messages"));
const Tanks = lazy(() => import("./pages/Tanks"));
const Prices = lazy(() => import("./pages/Prices"));
const ShiftReports = lazy(() => import("./pages/ShiftReports"));
const SalesAnalysisPageTest = lazy(() => import("./pages/SalesAnalysisPageTest"));
const OperationsTransactionsPage = lazy(() => import("./pages/OperationsTransactionsPage"));
const OperationsTransactionsPageSimple = lazy(() => import("./pages/OperationsTransactionsPageSimple"));
const PriceHistoryPage = lazy(() => import("./pages/PriceHistoryPage"));
const FuelStocksPage = lazy(() => import("./pages/FuelStocksPage"));
const Profile = lazy(() => import("./pages/Profile"));
const DatabaseSettings = lazy(() => import("./pages/DatabaseSettings"));
const PartialMigrationSettings = lazy(() => import("./pages/PartialMigrationSettings"));
const SystemIntegrations = lazy(() => import("./pages/SystemIntegrations"));
const DataMigration = lazy(() => import("./pages/DataMigration"));
const TestServices = lazy(() => import("./pages/TestServices"));
const TestServicesSimple = lazy(() => import("./pages/TestServicesSimple"));
const TestDebug = lazy(() => import("./pages/TestDebug"));
const DataInspector = lazy(() => import("./pages/DataInspector"));
const NetworkEquipmentLog = lazy(() => import("./pages/NetworkEquipmentLog"));
const LegalDocuments = lazy(() => import("./pages/LegalDocuments"));
const LegalDocumentEditor = lazy(() => import("./pages/LegalDocumentEditor"));
const LegalUsersAcceptances = lazy(() => import("./pages/LegalUsersAcceptances"));
const LoginPageWithLegal = lazy(() => import("./pages/LoginPageWithLegal"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading компонент
const PageLoading = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SelectionProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/login" element={<LoginPageWithLegal />} />
                <Route path="/" element={<NetworkOverview />} />
                <Route path="/admin/users-and-roles" element={<Users />} />
                <Route path="/admin/users-and-roles-new" element={<NewUsersAndRoles />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/roles" element={<Roles />} />
                <Route path="/admin/instructions" element={<Instructions />} />
                <Route path="/admin/networks" element={<NetworksPage />} />
                <Route path="/admin/audit" element={<AuditLog />} />
                <Route path="/settings/dictionaries/equipment-types" element={<EquipmentTypes />} />
                <Route path="/settings/dictionaries/component-types" element={<ComponentTypes />} />
                <Route path="/settings/dictionaries/command-templates" element={<CommandTemplates />} />
                <Route path="/settings/templates/command-templates" element={<NewCommandTemplates />} />
                <Route path="/settings/connections" element={<Connections />} />
                <Route path="/settings/data-exchange" element={<DatabaseSettings />} />
                <Route path="/settings/database" element={<DatabaseSettings />} /> {/* Backward compatibility */}
                <Route path="/settings/partial-migration" element={<PartialMigrationSettings />} />
                <Route path="/settings/integrations" element={<SystemIntegrations />} />
                <Route path="/settings/nomenclature" element={<Nomenclature />} />
                <Route path="/settings/workflows" element={<Workflows />} />
                <Route path="/network/overview" element={<NetworkOverview />} />
                <Route path="/network/sales-analysis" element={<SalesAnalysisPage />} />
                <Route path="/network/operations-transactions" element={<OperationsTransactionsPage />} />
                <Route path="/network/price-history" element={<PriceHistoryPage />} />
                <Route path="/network/fuel-stocks" element={<FuelStocksPage />} />
                <Route path="/network/equipment-log" element={<NetworkEquipmentLog />} />
                <Route path="/network/notifications" element={<NotificationRules />} />
                <Route path="/network/messages" element={<Messages />} />
                <Route path="/point/prices" element={<Prices />} />
                <Route path="/point/tanks" element={<Tanks />} />
                <Route path="/point/shift-reports" element={<ShiftReports />} />
                <Route path="/point/equipment" element={<Equipment />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/data-migration" element={<DataMigration />} />
                <Route path="/admin/test-services" element={<TestServices />} />
                <Route path="/admin/test-simple" element={<TestServicesSimple />} />
                <Route path="/admin/test-debug" element={<TestDebug />} />
                <Route path="/admin/data-inspector" element={<DataInspector />} />
                <Route path="/admin/legal-documents" element={<LegalDocuments />} />
                <Route path="/admin/legal-documents/users-acceptances" element={<LegalUsersAcceptances />} />
                <Route path="/admin/legal-documents/:docType/edit" element={<LegalDocumentEditor />} />
                <Route path="/admin/legal-documents/:docType/create" element={<LegalDocumentEditor />} />
                <Route path="/admin/legal-documents/:docType/view" element={<LegalDocumentEditor />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SelectionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
