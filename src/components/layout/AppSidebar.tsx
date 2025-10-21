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
  Bell,
  DollarSign,
  Gauge,
  Settings,
  Clock,
  Users,
  FileText,
  ChevronRight,
  MapPin,
  Shield,
  Cog,
  MessageSquare,
  Component,
  Receipt,
  Fuel,
  Database
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
      return saved ? JSON.parse(saved) : ["main", "networks", "trading-point", "admin", "settings", "service", "database"];
    } catch {
      return ["main", "networks", "trading-point", "admin", "settings", "service", "database"];
    }
  };
  
  const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups);
  const menuVisibility = useMenuVisibility();
  
  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('appSidebar_openGroups', JSON.stringify(openGroups));
  }, [openGroups]);
  
  // Простое сохранение позиции скролла
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Оптимизированное инициальное восстановление позиции скролла через requestAnimationFrame
  useEffect(() => {
    const savedScrollPos = localStorage.getItem('appSidebar_scrollPosition');
    if (savedScrollPos && scrollContainerRef.current) {
      // Используем requestAnimationFrame для избежания forced reflow
      const rafId = requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = parseFloat(savedScrollPos);
        }
      });
      return () => cancelAnimationFrame(rafId);
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
  

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const newGroups = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      return newGroups;
    });
  };

  const isActive = (path: string) => window.location.pathname === path;
  const getNavCls = (active: boolean) => 
    active ? "bg-blue-600 text-white font-medium transition-colors duration-200" : "transition-colors duration-200 hover:bg-slate-700 text-gray-400 hover:text-white";


  const networkMenuItems = [
    { title: "Обзор", url: "/network/overview", icon: Network },
    { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
    { title: "Поступления", url: "/network/receipts", icon: Fuel },
    { title: "Сменные отчеты", url: "/point/shift-reports-v2", icon: Clock },
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
    { title: "Оповещения сети", url: "/network/notifications", icon: Bell },
    { title: "Рассылка сообщений", url: "/network/broadcast-messages", icon: MessageSquare },
    { title: "Правовые документы", url: "/admin/legal-documents", icon: FileText },
    { title: "Журнал аудита", url: "/admin/audit", icon: FileText },
  ];

  const settingsMenuItems = [
    { title: "API CTC настройки", url: "/settings/api-cts", icon: Cog },
    { title: "Внешняя БД", url: "/settings/external-database", icon: Database },
  ];


  const databaseMenuItems = [
  ];

  function renderMenuContent() {
    return (
      <>
        {/* ТОРГОВЫЕ СЕТИ */}
        {menuVisibility.networks && (
        <div className="px-4 py-3">
          <div className="w-full text-slate-200 text-xs font-semibold tracking-wider flex items-center gap-2 mb-3 uppercase px-2 py-2">
            <Network className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">ТОРГОВЫЕ СЕТИ</span>
          </div>
          {(
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
          <button
            className="w-full text-slate-200 text-xs font-semibold tracking-wider hover:text-white hover:bg-slate-700/50 active:bg-slate-700 transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase px-2 py-2 rounded-md -mx-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("trading-point");
            }}
            type="button"
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">ТОРГОВАЯ ТОЧКА</span>
            <ChevronRight
              className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                openGroups.includes("trading-point") ? "rotate-90" : ""
              }`}
            />
          </button>
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
          <button
            className="w-full text-slate-200 text-xs font-semibold tracking-wider hover:text-white hover:bg-slate-700/50 active:bg-slate-700 transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase px-2 py-2 rounded-md -mx-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("admin");
            }}
            type="button"
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">АДМИНИСТРИРОВАНИЕ</span>
            <ChevronRight
              className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                openGroups.includes("admin") ? "rotate-90" : ""
              }`}
            />
          </button>
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
          <button
            className="w-full text-slate-200 text-xs font-semibold tracking-wider hover:text-white hover:bg-slate-700/50 active:bg-slate-700 transition-all duration-200 ease-in-out flex items-center gap-2 mb-3 uppercase px-2 py-2 rounded-md -mx-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup("settings");
            }}
            type="button"
          >
            <Cog className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">НАСТРОЙКИ</span>
            <ChevronRight
              className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                openGroups.includes("settings") ? "rotate-90" : ""
              }`}
            />
          </button>
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
      </>
    );
  }

  return (
    <div className={`${isMobile ? 'h-full bg-sidebar' : ''}`}>
      {isMobile ? (
        // Mobile version without Sidebar wrapper
        <div
          className="scrollbar-hide h-full overflow-y-auto bg-slate-800 text-slate-100 overscroll-contain touch-auto pt-12 mobile-safe-top"
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
