import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { SelectionProvider } from "./context/SelectionContext";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminUsersAndRoles from "./pages/AdminUsersAndRoles";
import AdminUsers from "./pages/AdminUsers";
import AdminNetworks from "./pages/AdminNetworks";
import NetworksPage from "./pages/NetworksPage";
import AuditLog from "./pages/AuditLog";
import EquipmentTypes from "./pages/EquipmentTypes";
import ComponentTypes from "./pages/ComponentTypes";
import Equipment from "./pages/Equipment";
import Commands from "./pages/Commands";
import Connections from "./pages/Connections";
import Workflows from "./pages/Workflows";
import NetworkOverview from "./pages/NetworkOverview";
import NetworkOverviewTest from "./pages/NetworkOverviewTest";
import NotificationRules from "./pages/NotificationRules";
import Messages from "./pages/Messages";
import Tanks from "./pages/Tanks";
import Prices from "./pages/Prices";
import ShiftReports from "./pages/ShiftReports";
import SalesAnalysisPage from "./pages/SalesAnalysisPage";
import SalesAnalysisPageTest from "./pages/SalesAnalysisPageTest";
import OperationsTransactionsPage from "./pages/OperationsTransactionsPage";
import PriceHistoryPage from "./pages/PriceHistoryPage";
import FuelStocksPage from "./pages/FuelStocksPage";
import Nomenclature from "./pages/Nomenclature";
import Profile from "./pages/Profile";
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
          <Route path="/" element={<MainLayout><NetworkOverview /></MainLayout>} />
          <Route path="/admin/users-and-roles" element={<AdminUsersAndRoles />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/networks" element={<MainLayout><NetworksPage /></MainLayout>} />
          <Route path="/admin/audit" element={<AuditLog />} />
          <Route path="/settings/dictionaries/equipment-types" element={<EquipmentTypes />} />
          <Route path="/settings/dictionaries/component-types" element={<ComponentTypes />} />
          <Route path="/settings/commands" element={<Commands />} />
          <Route path="/settings/connections" element={<MainLayout><Connections /></MainLayout>} />
          <Route path="/settings/nomenclature" element={<MainLayout><Nomenclature /></MainLayout>} />
          <Route path="/settings/workflows" element={<Workflows />} />
          <Route path="/network/overview" element={<NetworkOverview />} />
          <Route path="/network/sales-analysis" element={<MainLayout><SalesAnalysisPage /></MainLayout>} />
          <Route path="/network/operations-transactions" element={<OperationsTransactionsPage />} />
          <Route path="/network/price-history" element={<PriceHistoryPage />} />
          <Route path="/network/fuel-stocks" element={<FuelStocksPage />} />
          <Route path="/network/notifications" element={<NotificationRules />} />
          <Route path="/network/messages" element={<Messages />} />
          <Route path="/point/prices" element={<Prices />} />
          <Route path="/point/tanks" element={<Tanks />} />
          <Route path="/point/shift-reports" element={<ShiftReports />} />
          <Route path="/point/equipment" element={<Equipment />} />
          <Route path="/profile" element={<Profile />} />
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
