import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import PriceHistoryPage from "./pages/PriceHistoryPage";
import FuelStocksPage from "./pages/FuelStocksPageFixed";
import Profile from "./pages/Profile";
import DatabaseSettings from "./pages/DatabaseSettings";
import PartialMigrationSettings from "./pages/PartialMigrationSettings";
import DataMigration from "./pages/DataMigration";
import TestServices from "./pages/TestServices";
import TestServicesSimple from "./pages/TestServicesSimple";
import TestDebug from "./pages/TestDebug";
import DataInspector from "./pages/DataInspector";
import NetworkEquipmentLog from "./pages/NetworkEquipmentLog";
import LegalDocuments from "./pages/LegalDocuments";
import LegalDocumentEditor from "./pages/LegalDocumentEditor";
import LegalUsersAcceptances from "./pages/LegalUsersAcceptances";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SelectionProvider>
          <BrowserRouter>
          <Routes>
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
          <Route path="/settings/database" element={<DatabaseSettings />} />
          <Route path="/settings/partial-migration" element={<PartialMigrationSettings />} />
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
          </BrowserRouter>
        </SelectionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
