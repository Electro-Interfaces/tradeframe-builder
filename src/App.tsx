import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Index from "./pages/Index";
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
import NotificationRules from "./pages/NotificationRules";
import Messages from "./pages/Messages";
import Tanks from "./pages/Tanks";
import Prices from "./pages/Prices";
import ShiftReports from "./pages/ShiftReports";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/users-and-roles" element={<AdminUsersAndRoles />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/networks" element={<MainLayout><NetworksPage /></MainLayout>} />
          <Route path="/admin/audit" element={<AuditLog />} />
          <Route path="/settings/dictionaries/equipment-types" element={<EquipmentTypes />} />
          <Route path="/settings/dictionaries/component-types" element={<ComponentTypes />} />
          <Route path="/settings/commands" element={<Commands />} />
          <Route path="/settings/connections" element={<Connections />} />
          <Route path="/settings/workflows" element={<Workflows />} />
          <Route path="/network/overview" element={<NetworkOverview />} />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
