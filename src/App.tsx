import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/supabase/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SelectionProvider } from "./context/SelectionContext";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminUsersAndRoles from "./pages/AdminUsersAndRoles";
import AdminUsers from "./pages/AdminUsers";
import NewUsersAndRoles from "./pages/admin/UsersAndRoles";
import Users from "./pages/admin/Users";
import Roles from "./pages/admin/Roles";
import Instructions from "./pages/admin/Instructions";
import NetworksPage from "./pages/NetworksPage";
import Nomenclature from "./pages/Nomenclature";
import SalesAnalysisPage from "./pages/SalesAnalysisPage";
import AuditLog from "./pages/AuditLog";
import EquipmentTypes from "./pages/EquipmentTypes";
import ComponentTypes from "./pages/ComponentTypes";
import Equipment from "./pages/Equipment";
import CommandTemplates from "./pages/CommandTemplates";
import NewCommandTemplates from "./pages/NewCommandTemplates";
import Connections from "./pages/Connections";
import Workflows from "./pages/Workflows";
import NetworkOverview from "./pages/NetworkOverview";
import NetworkOverviewTest from "./pages/NetworkOverviewTest";
import NotificationRules from "./pages/NotificationRules";
import Messages from "./pages/Messages";
import Tanks from "./pages/Tanks";
import Prices from "./pages/Prices";
import ShiftReports from "./pages/ShiftReports";
import SalesAnalysisPageTest from "./pages/SalesAnalysisPageTest";
import OperationsTransactionsPage from "./pages/OperationsTransactionsPage";
import OperationsTransactionsPageSimple from "./pages/OperationsTransactionsPageSimple";
import PriceHistoryPage from "./pages/PriceHistoryPage";
import FuelStocksPage from "./pages/FuelStocksPage";
import SimpleProfile from "./pages/SimpleProfile";
import DatabaseSettings from "./pages/DatabaseSettings";
import PartialMigrationSettings from "./pages/PartialMigrationSettings";
import STSApiSettings from "./pages/STSApiSettings";
import ExternalDatabaseSettings from "./pages/ExternalDatabaseSettings";
import DatabaseInitialization from "./pages/DatabaseInitialization";
import DataMigration from "./pages/DataMigration";
import TestServices from "./pages/TestServices";
import TestServicesSimple from "./pages/TestServicesSimple";
import TestDebug from "./pages/TestDebug";
import DataInspector from "./pages/DataInspector";
import NetworkEquipmentLog from "./pages/NetworkEquipmentLog";
import LegalDocuments from "./pages/LegalDocuments";
import LegalDocumentEditor from "./pages/LegalDocumentEditor";
import LegalUsersAcceptances from "./pages/LegalUsersAcceptances";
import LoginPageWithLegal from "./pages/LoginPageWithLegal";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Используем предварительно настроенный queryClient из lib/supabase/queryClient

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SelectionProvider>
          <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPageWithLegal />} />
          <Route path="/" element={<ProtectedRoute><NetworkOverview /></ProtectedRoute>} />
          <Route path="/admin/users-and-roles" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/admin/users-and-roles-new" element={<ProtectedRoute><NewUsersAndRoles /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
          <Route path="/admin/instructions" element={<ProtectedRoute><Instructions /></ProtectedRoute>} />
          <Route path="/admin/networks" element={<ProtectedRoute><NetworksPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          <Route path="/settings/dictionaries/equipment-types" element={<ProtectedRoute><EquipmentTypes /></ProtectedRoute>} />
          <Route path="/settings/dictionaries/component-types" element={<ProtectedRoute><ComponentTypes /></ProtectedRoute>} />
          <Route path="/settings/dictionaries/command-templates" element={<ProtectedRoute><CommandTemplates /></ProtectedRoute>} />
          <Route path="/settings/templates/command-templates" element={<ProtectedRoute><NewCommandTemplates /></ProtectedRoute>} />
          <Route path="/settings/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
          <Route path="/settings/database" element={<ProtectedRoute><DatabaseSettings /></ProtectedRoute>} />
          <Route path="/settings/partial-migration" element={<ProtectedRoute><PartialMigrationSettings /></ProtectedRoute>} />
          <Route path="/settings/sts-api" element={<ProtectedRoute><STSApiSettings /></ProtectedRoute>} />
          <Route path="/settings/api-cts" element={<ProtectedRoute><STSApiSettings /></ProtectedRoute>} />
          <Route path="/settings/external-database" element={<ProtectedRoute><ExternalDatabaseSettings /></ProtectedRoute>} />
          <Route path="/settings/database-initialization" element={<ProtectedRoute><DatabaseInitialization /></ProtectedRoute>} />
          <Route path="/settings/nomenclature" element={<ProtectedRoute><Nomenclature /></ProtectedRoute>} />
          <Route path="/settings/workflows" element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
          <Route path="/network/overview" element={<ProtectedRoute><NetworkOverview /></ProtectedRoute>} />
          <Route path="/network/sales-analysis" element={<ProtectedRoute><SalesAnalysisPage /></ProtectedRoute>} />
          <Route path="/network/operations-transactions" element={<ProtectedRoute><OperationsTransactionsPageSimple /></ProtectedRoute>} />
          <Route path="/network/price-history" element={<ProtectedRoute><PriceHistoryPage /></ProtectedRoute>} />
          <Route path="/network/fuel-stocks" element={<ProtectedRoute><FuelStocksPage /></ProtectedRoute>} />
          <Route path="/network/equipment-log" element={<ProtectedRoute><NetworkEquipmentLog /></ProtectedRoute>} />
          <Route path="/network/notifications" element={<ProtectedRoute><NotificationRules /></ProtectedRoute>} />
          <Route path="/network/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/point/prices" element={<ProtectedRoute><Prices /></ProtectedRoute>} />
          <Route path="/point/tanks" element={<ProtectedRoute><Tanks /></ProtectedRoute>} />
          <Route path="/point/shift-reports" element={<ProtectedRoute><ShiftReports /></ProtectedRoute>} />
          <Route path="/point/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><SimpleProfile /></ProtectedRoute>} />
          <Route path="/admin/data-migration" element={<ProtectedRoute><DataMigration /></ProtectedRoute>} />
          <Route path="/admin/test-services" element={<ProtectedRoute><TestServices /></ProtectedRoute>} />
          <Route path="/admin/test-simple" element={<ProtectedRoute><TestServicesSimple /></ProtectedRoute>} />
          <Route path="/admin/test-debug" element={<ProtectedRoute><TestDebug /></ProtectedRoute>} />
          <Route path="/admin/data-inspector" element={<ProtectedRoute><DataInspector /></ProtectedRoute>} />
          <Route path="/admin/legal-documents" element={<ProtectedRoute><LegalDocuments /></ProtectedRoute>} />
          <Route path="/admin/legal-documents/users-acceptances" element={<ProtectedRoute><LegalUsersAcceptances /></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/edit" element={<ProtectedRoute><LegalDocumentEditor /></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/create" element={<ProtectedRoute><LegalDocumentEditor /></ProtectedRoute>} />
          <Route path="/admin/legal-documents/:docType/view" element={<ProtectedRoute><LegalDocumentEditor /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
          </BrowserRouter>
        </SelectionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
