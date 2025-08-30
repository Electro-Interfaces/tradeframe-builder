import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
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
  MessageSquare
} from "lucide-react";

interface AppSidebarProps {
  selectedTradingPoint: string;
  isMobile?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export function AppSidebar({ selectedTradingPoint, isMobile = false, setMobileMenuOpen }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>(["main", "networks", "trading-point", "admin", "settings"]);
  
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

  const isTradingPointSelected = Boolean(selectedTradingPoint);

  const mainMenuItems = [
    { title: "Главная панель", url: "/", icon: Home },
  ];

  const networkMenuItems = [
    { title: "Обзор", url: "/network/overview", icon: Network },
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
    { title: "Пользователи и роли", url: "/admin/users", icon: Users },
    { title: "Журнал аудита", url: "/admin/audit", icon: FileText },
  ];

  const settingsMenuItems = [
    { title: "Настройки подключения", url: "/settings/connections", icon: Wifi },
    { 
      title: "Справочники", 
      url: "/settings/references", 
      icon: Book,
      submenu: [
        { title: "Типы оборудования", url: "/settings/dictionaries/equipment-types" },
        { title: "Типы компонентов", url: "/settings/dictionaries/component-types" },
      ]
    },
    { title: "Команды", url: "/settings/commands", icon: Wrench },
    { title: "Регламенты", url: "/settings/workflows", icon: Clock },
  ];

  function renderMenuContent() {
    return (
      <>
        {/* ГЛАВНАЯ */}
        <div className="p-4">
          <div className="text-gray-100 text-sm font-semibold mb-3">
            ГЛАВНАЯ
          </div>
          <div className="space-y-1">
            {mainMenuItems.map((item) => (
              <div key={item.title}>
                <NavLink 
                  to={item.url} 
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${getNavCls(isActive(item.url))}`}
                  onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </NavLink>
              </div>
            ))}
          </div>
        </div>

        {/* ТОРГОВЫЕ СЕТИ */}
        <div className="border-t border-gray-700 mt-2 pt-2 p-4">
          <div 
            className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3"
            onClick={() => toggleGroup("networks")}
          >
            <Network className="w-4 h-4" />
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${getNavCls(isActive(item.url))}`}
                    onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ТОРГОВАЯ ТОЧКА */}
        <div className="border-t border-gray-700 mt-2 pt-2 p-4">
          <div 
            className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3"
            onClick={() => toggleGroup("trading-point")}
          >
            <MapPin className="w-4 h-4" />
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                      !isTradingPointSelected ? "opacity-50 cursor-not-allowed" : 
                      isTradingPointSelected ? getNavCls(isActive(item.url)) : ""
                    }`}
                  >
                    {isTradingPointSelected ? (
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 w-full"
                        onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    ) : (
                      <>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* АДМИНИСТРИРОВАНИЕ */}
        <div className="border-t border-gray-700 mt-2 pt-2 p-4">
          <div 
            className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3"
            onClick={() => toggleGroup("admin")}
          >
            <Shield className="w-4 h-4" />
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${getNavCls(isActive(item.url))}`}
                    onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* НАСТРОЙКИ */}
        <div className="border-t border-gray-700 mt-2 pt-2 p-4">
          <div 
            className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3"
            onClick={() => toggleGroup("settings")}
          >
            <Cog className="w-4 h-4" />
            НАСТРОЙКИ
            <ChevronRight 
              className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                openGroups.includes("settings") ? "rotate-90" : ""
              }`} 
            />
          </div>
          {openGroups.includes("settings") && (
            <div className="space-y-1">
              {settingsMenuItems.map((item) => (
                <div key={item.title}>
                  {item.submenu ? (
                    <div>
                      <div 
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-200 hover:bg-slate-700 text-gray-400 hover:text-white cursor-pointer"
                        onClick={() => toggleGroup(item.title)}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        <ChevronRight 
                          className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                            openGroups.includes(item.title) ? "rotate-90" : ""
                          }`} 
                        />
                      </div>
                      {openGroups.includes(item.title) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.submenu.map((subItem) => (
                            <NavLink 
                              key={subItem.title}
                              to={subItem.url}
                              className={`block px-3 py-2 rounded-md text-sm ${getNavCls(isActive(subItem.url))}`}
                              onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                            >
                              {subItem.title}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-md ${getNavCls(isActive(item.url))}`}
                      onClick={() => isMobile && setMobileMenuOpen && setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className={`${isMobile ? 'h-full bg-sidebar' : ''}`}>
      {isMobile ? (
        // Mobile version without Sidebar wrapper
        <div className="scrollbar-hide h-full overflow-y-auto bg-slate-900 text-slate-100">
          {renderMenuContent()}
        </div>
      ) : (
        // Desktop version with Sidebar wrapper
        <Sidebar className="border-r border-sidebar-border shadow-md">
          <SidebarContent className="pt-header scrollbar-hide">
            {renderMenuContent()}
          </SidebarContent>
        </Sidebar>
      )}
    </div>
  );
}
