import { useState, useEffect, useRef, memo } from "react";
import { NavLink } from "react-router-dom";
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

const AppSidebarComponent = ({ selectedTradingPoint, isMobile = false, setMobileMenuOpen }: AppSidebarProps) => {
  const { state } = useSidebar();
  
  // Загружаем состояние открытых групп из localStorage
  const getInitialOpenGroups = (): string[] => {
    try {
      const saved = localStorage.getItem('appSidebar_openGroups');
      return saved ? JSON.parse(saved) : ["main", "networks", "trading-point", "admin", "settings", "service", "database", "misc"];
    } catch {
      return ["main", "networks", "trading-point", "admin", "settings", "service", "database", "misc"];
    }
  };
  
  const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups);
  const menuVisibility = useMenuVisibility();
  
  // Логирование в AppSidebar
  console.log('🗂️ AppSidebar: menuVisibility result:', menuVisibility);
  const visibleSections = Object.entries(menuVisibility).filter(([key, value]) => value);
  console.log('🗂️ AppSidebar: visible sections:', visibleSections.map(([key]) => key));
  
  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('appSidebar_openGroups', JSON.stringify(openGroups));
  }, [openGroups]);
  
  // Простое сохранение позиции скролла
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Простое инициальное восстановление позиции скролла
  useEffect(() => {
    const savedScrollPos = localStorage.getItem('appSidebar_scrollPosition');
    if (savedScrollPos && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseFloat(savedScrollPos);
    }
  }, []);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    // Дебаунсинг для сохранения в localStorage
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('appSidebar_scrollPosition', scrollTop.toString());
    }, 150);
  };
  
  // Очищаем таймеры при размонтировании компонента
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  // В мобильном режиме никогда не сворачиваем меню
  const collapsed = isMobile ? false : state === "collapsed";
  
  // console.log("AppSidebar render:", { isMobile, collapsed, openGroups });

  const toggleGroup = (groupId: string) => {
    console.log('🔄 AppSidebar: toggleGroup called for', groupId);
    setOpenGroups(prev => {
      const newGroups = prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      console.log('🔄 AppSidebar: openGroups changed from', prev, 'to', newGroups);
      return newGroups;
    });
  };

  const isActive = (path: string) => window.location.pathname === path;
  const getNavCls = (active: boolean) => 
    active ? "bg-blue-600 text-white font-medium transition-colors duration-200" : "transition-colors duration-200 hover:bg-slate-700 text-gray-400 hover:text-white";


  const networkMenuItems = [
    { title: "Обзор", url: "/network/overview", icon: Network },
    { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
    { title: "Купоны", url: "/network/coupons", icon: Component },
  ];

  const tradingPointMenuItems = [
    { title: "Цены", url: "/point/prices", icon: DollarSign },
    { title: "Резервуары", url: "/point/tanks", icon: Gauge },
    { title: "Оборудование", url: "/point/equipment", icon: Settings },
  ];

  const adminMenuItems = [
    { title: "Сети и ТТ", url: "/admin/networks", icon: Network },
    { title: "Пользователи", url: "/admin/users-and-roles", icon: Users },
    { title: "Роли", url: "/admin/roles", icon: Shield },
    { title: "Инструкции", url: "/admin/instructions", icon: Book },
    { title: "Правовые документы", url: "/admin/legal-documents", icon: FileText },
    { title: "Журнал аудита", url: "/admin/audit", icon: FileText },
  ];

  const settingsMenuItems = [
    { title: "API CTC настройки", url: "/settings/api-cts", icon: Cog },
    { title: "Внешняя БД", url: "/settings/external-database", icon: Database },
  ];


  const databaseMenuItems = [
  ];

  // 🚫 НЕИСПОЛЬЗУЕМЫЕ РАЗДЕЛЫ - НЕ РЕАЛИЗОВАНЫ В ТЕКУЩЕЙ ВЕРСИИ
  // Эти разделы отображаются в меню, но не имеют функциональной реализации
  // Запланированы для будущих версий приложения
  const miscMenuItems = [
    { title: "Оповещения сети", url: "/network/notifications", icon: Bell }, // 🚫 НЕ РЕАЛИЗОВАНО
    { title: "Сообщения", url: "/network/messages", icon: MessageSquare }, // 🚫 НЕ РЕАЛИЗОВАНО
    { title: "Сменные отчеты", url: "/point/shift-reports", icon: Clock }, // 🚫 НЕ РЕАЛИЗОВАНО
  ];

  function renderMenuContent() {
    return (
      <>
        {/* ТОРГОВЫЕ СЕТИ */}
        {menuVisibility.networks && (
        <div className="px-4 py-3">
          <div 
            className="text-slate-200 text-xs font-semibold tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("networks");
            }}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("trading-point");
            }}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("admin");
            }}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("settings");
            }}
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


            </div>
          )}
        </div>
        )}


        {/* РАЗНОЕ - 🚫 НЕИСПОЛЬЗУЕМЫЕ РАЗДЕЛЫ */}
        {menuVisibility.misc && miscMenuItems.length > 0 && (
        <div className="border-t border-slate-600 px-4 py-3">
          <div 
            className="text-slate-200 text-xs font-semibold tracking-wider cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("misc");
            }}
            title="Эти разделы не реализованы в текущей версии"
          >
            <Box className="w-4 h-4 flex-shrink-0" />
            РАЗНОЕ (НЕ ИСПОЛЬЗУЕТСЯ)
            <ChevronRight 
              className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                openGroups.includes("misc") ? "rotate-90" : ""
              }`} 
            />
          </div>
          {openGroups.includes("misc") && (
            <div className="space-y-1">
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
        )}
      </>
    );
  }

  return (
    <div className={`${isMobile ? 'h-full bg-sidebar' : ''}`}>
      {isMobile ? (
        // Mobile version without Sidebar wrapper
        <div
          className="scrollbar-hide h-full overflow-y-auto bg-slate-800 text-slate-100 overscroll-contain touch-auto"
          onScroll={handleScroll}
          ref={scrollContainerRef}
        >
          {renderMenuContent()}
        </div>
      ) : (
        // Desktop version with Sidebar wrapper
        <Sidebar className="border-r border-slate-600 shadow-md bg-slate-800">
          <SidebarContent 
            className="pt-header scrollbar-hide bg-slate-800"
            onScroll={handleScroll}
            ref={scrollContainerRef}
          >
            {renderMenuContent()}
          </SidebarContent>
        </Sidebar>
      )}
    </div>
  );
};

export const AppSidebar = memo(AppSidebarComponent);
