import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { useMenuVisibility } from "@/hooks/useMenuVisibility";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Network,
  BarChart3,
  Bell,
  DollarSign,
  Gauge,
  Settings,
  Clock,
  Users,
  FileText,
  Wifi,
  Book,
  Wrench,
  ChevronRight,
  MapPin,
  Shield,
  Cog,
  MessageSquare,
  HardDrive,
  Component,
  Receipt,
  TrendingUp,
  Fuel,
  FileText as FuelIcon,
  Database,
  Box,
  Wrench as Tool
} from "lucide-react";

interface AppSidebarProps {
  selectedTradingPoint: string;
  isMobile?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export function AppSidebar({ selectedTradingPoint, isMobile = false, setMobileMenuOpen }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>(["main", "networks", "trading-point", "admin", "settings", "service", "misc"]);
  const menuVisibility = useMenuVisibility();
  
  // В мобильном режиме никогда не сворачиваем меню
  const collapsed = isMobile ? false : state === "collapsed";
  
  console.log("AppSidebar render:", { isMobile, collapsed, openGroups });

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = (active: boolean) => 
    active ? "bg-blue-600 text-white font-medium transition-colors duration-200" : "transition-colors duration-200 hover:bg-slate-700 text-gray-400 hover:text-white";


  const networkMenuItems = [
    { title: "Обзор", url: "/network/overview", icon: Network },
    { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
    { title: "История цен", url: "/network/price-history", icon: TrendingUp },
    { title: "Остатки топлива", url: "/network/fuel-stocks", icon: Fuel },
    { title: "Журнал оборудования", url: "/network/equipment-log", icon: Database },
    { title: "Оповещения сети", url: "/network/notifications", icon: Bell },
    { title: "Сообщения", url: "/network/messages", icon: MessageSquare },
  ];

  const tradingPointMenuItems = [
    { title: "Цены", url: "/point/prices", icon: DollarSign },
    { title: "Резервуары", url: "/point/tanks", icon: Gauge },
    { title: "Оборудование", url: "/point/equipment", icon: Settings },
    { title: "Сменные отчеты", url: "/point/shift-reports", icon: Clock },
  ];

  const adminMenuItems = [
    { title: "Сети и ТТ", url: "/admin/networks", icon: Network },
    { title: "Пользователи", url: "/admin/users-and-roles", icon: Users },
    { title: "Роли", url: "/admin/roles", icon: Shield },
    { title: "Журнал аудита", url: "/admin/audit", icon: FileText },
  ];

  const settingsMenuItems = [
    { title: "Настройки подключения", url: "/settings/connections", icon: Wifi },
    { title: "Номенклатура", url: "/settings/nomenclature", icon: FuelIcon },
    { title: "Типы оборудования", url: "/settings/dictionaries/equipment-types", icon: HardDrive },
    { title: "Типы компонентов", url: "/settings/dictionaries/component-types", icon: Component },
    { title: "Команды", url: "/settings/commands", icon: Wrench },
    { title: "Регламенты", url: "/settings/workflows", icon: Clock },
  ];

  const serviceMenuItems = [
    { title: "Частичная миграция", url: "/settings/partial-migration", icon: Cog },
    { title: "Настройки БД", url: "/settings/database", icon: Database },
    { title: "Инспектор данных", url: "/admin/data-inspector", icon: HardDrive },
  ];

  const miscMenuItems = [
    { title: "Шаблоны команд", url: "/settings/dictionaries/command-templates", icon: Cog },
  ];

  function renderMenuContent() {
    return (
      <>
        {/* ТОРГОВЫЕ СЕТИ */}
        {menuVisibility.networks && (
        <div className="px-4 py-3">
          <div 
            className="text-slate-200 text-xs font-semibold tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase"
            onClick={() => toggleGroup("networks")}
          >
            <Network className="w-4 h-4 flex-shrink-0" />
            ТОРГОВЫЕ СЕТИ
            <ChevronRight 
              className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                openGroups.includes("networks") ? "rotate-90" : ""
              }`} 
            />
          </div>
          {openGroups.includes("networks") && (
            <div className="space-y-1">
              {networkMenuItems.map((item) => (
                <div key={item.title}>
                  <NavLink 
                    to={item.url} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ТОРГОВАЯ ТОЧКА */}
        {menuVisibility.tradingPoint && (
        <div className="border-t border-slate-600 px-4 py-3">
          <div 
            className="text-slate-200 text-xs font-semibold tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase"
            onClick={() => toggleGroup("trading-point")}
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            ТОРГОВАЯ ТОЧКА
            <ChevronRight 
              className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                openGroups.includes("trading-point") ? "rotate-90" : ""
              }`} 
            />
          </div>
          {openGroups.includes("trading-point") && (
            <div className="space-y-1">
              {tradingPointMenuItems.map((item) => (
                <div key={item.title}>
                  <div 
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      getNavCls(isActive(item.url))
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 w-full"
                      onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* АДМИНИСТРИРОВАНИЕ */}
        {menuVisibility.admin && (
        <div className="border-t border-slate-600 px-4 py-3">
          <div 
            className="text-slate-200 text-xs font-semibold tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase"
            onClick={() => toggleGroup("admin")}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            АДМИНИСТРИРОВАНИЕ
            <ChevronRight 
              className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                openGroups.includes("admin") ? "rotate-90" : ""
              }`} 
            />
          </div>
          {openGroups.includes("admin") && (
            <div className="space-y-1">
              {adminMenuItems.map((item) => (
                <div key={item.title}>
                  <NavLink 
                    to={item.url} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* НАСТРОЙКИ */}
        {menuVisibility.settings && (
        <div className="border-t border-slate-600 px-4 py-3">
          <div 
            className="text-slate-200 text-xs font-semibold tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase"
            onClick={() => toggleGroup("settings")}
          >
            <Cog className="w-4 h-4 flex-shrink-0" />
            НАСТРОЙКИ
            <ChevronRight 
              className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                openGroups.includes("settings") ? "rotate-90" : ""
              }`} 
            />
          </div>
          {openGroups.includes("settings") && (
            <div className="space-y-3">
              {/* Основные настройки */}
              <div className="space-y-1">
                {settingsMenuItems.map((item) => (
                  <div key={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                      onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </div>
                ))}
              </div>

              {/* Сервис */}
              <div>
                <div 
                  className="text-slate-300 text-xs font-medium tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-2 px-1"
                  onClick={() => toggleGroup("service")}
                >
                  <Tool className="w-3 h-3 flex-shrink-0" />
                  СЕРВИС
                  <ChevronRight 
                    className={`w-3 h-3 ml-auto transition-transform duration-200 ${
                      openGroups.includes("service") ? "rotate-90" : ""
                    }`} 
                  />
                </div>
                {openGroups.includes("service") && (
                  <div className="space-y-1 ml-2">
                    {serviceMenuItems.map((item) => (
                      <div key={item.title}>
                        <NavLink 
                          to={item.url} 
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                          onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </NavLink>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Разное */}
              <div>
                <div 
                  className="text-slate-300 text-xs font-medium tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-2 px-1"
                  onClick={() => toggleGroup("misc")}
                >
                  <Box className="w-3 h-3 flex-shrink-0" />
                  РАЗНОЕ
                  <ChevronRight 
                    className={`w-3 h-3 ml-auto transition-transform duration-200 ${
                      openGroups.includes("misc") ? "rotate-90" : ""
                    }`} 
                  />
                </div>
                {openGroups.includes("misc") && (
                  <div className="space-y-1 ml-2">
                    {miscMenuItems.map((item) => (
                      <div key={item.title}>
                        <NavLink 
                          to={item.url} 
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                          onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </NavLink>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </>
    );
  }

  return (
    <div className={`${isMobile ? 'h-full bg-sidebar' : ''}`}>
      {isMobile ? (
        // Mobile version without Sidebar wrapper
        <div className="scrollbar-hide h-full overflow-y-auto bg-slate-800 text-slate-100">
          {renderMenuContent()}
        </div>
      ) : (
        // Desktop version with Sidebar wrapper
        <Sidebar className="border-r border-slate-600 shadow-md bg-slate-800">
          <SidebarContent className="pt-header scrollbar-hide bg-slate-800">
            {renderMenuContent()}
          </SidebarContent>
        </Sidebar>
      )}
    </div>
  );
}
