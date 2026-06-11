import { useState, useEffect, useRef, memo } from "react";
import { NavLink } from "react-router-dom";
import { useMenuVisibility } from "@/hooks/useMenuVisibility";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronLeft,
  MapPin,
  Shield,
  Cog,
  Component,
  Receipt,
  Fuel,
  Building2,
  History,
  PackagePlus,
  Smartphone,
  Ticket,
  MessageCircleMore,
  TrendingUp,
  Mail,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useSupportContext } from "@/contexts/SupportContext";
import { useNewAuth } from "@/contexts/NewAuthContext";

interface AppSidebarProps {
  selectedTradingPoint: string;
  isMobile?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

const AppSidebarComponent = ({ selectedTradingPoint, isMobile = false, setMobileMenuOpen }: AppSidebarProps) => {
  const { state, toggleSidebar } = useSidebar();

  const getInitialOpenGroups = (): string[] => {
    try {
      const saved = localStorage.getItem('appSidebar_openGroups');
      return saved ? JSON.parse(saved) : ["main", "networks", "trading-point", "admin", "settings"];
    } catch {
      return ["main", "networks", "trading-point", "admin", "settings"];
    }
  };

  const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups);
  const menuVisibility = useMenuVisibility();
  const { isSuperAdmin } = useNewAuth();

  let unreadCounts = { tickets: 0, chat: 0, total: 0 };
  try {
    const supportCtx = useSupportContext();
    unreadCounts = supportCtx.unreadCounts;
  } catch {
    // Sidebar can render outside the support provider in lightweight/test contexts.
  }

  useEffect(() => {
    localStorage.setItem('appSidebar_openGroups', JSON.stringify(openGroups));
  }, [openGroups]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedScrollPos = localStorage.getItem('appSidebar_scrollPosition');
    if (savedScrollPos && scrollContainerRef.current) {
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
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('appSidebar_scrollPosition', scrollTop.toString());
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const collapsed = isMobile ? false : state === "collapsed";

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const isActive = (path: string) => window.location.pathname === path;
  const getNavCls = (active: boolean) =>
    active
      ? "bg-primary text-white font-medium transition-colors duration-200 shadow-md shadow-primary/20"
      : "transition-colors duration-200 hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground";

  const networkMenuItems = [
    { title: "Обзор", url: "/network/overview", icon: Network },
    { title: "Ценообразование", url: "/network/pricing", icon: DollarSign },
    { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
    { title: "Онлайн-заказы", url: "/network/online-orders", icon: Smartphone },
    { title: "Остатки", url: "/network/fuel-inventory", icon: Fuel },
    { title: "Поступления", url: "/network/receipts", icon: PackagePlus },
    { title: "Сменные отчеты", url: "/point/shift-reports-v2", icon: Clock },
    { title: "Купоны", url: "/network/coupons", icon: Component },
  ];

  const tradingPointMenuItems = [
    { title: "Цены", url: "/point/prices", icon: DollarSign },
    { title: "Резервуары", url: "/point/tanks", icon: Gauge },
    { title: "Оборудование", url: "/point/equipment", icon: Settings },
  ];

  const adminMenuItems = [
    { title: "Маркетинг", url: "/analytics/margins", icon: TrendingUp },
    { title: "Сети и ТТ", url: "/admin/networks", icon: Building2 },
    { title: "Пользователи", url: "/admin/users-and-roles", icon: Users },
    { title: "Роли", url: "/admin/roles", icon: Shield },
    { title: "Оповещения сети", url: "/network/notifications", icon: Bell },
    { title: "Правовые документы", url: "/admin/legal-documents", icon: FileText },
    // Редактор базы знаний ведёт поставщик: клиентскому network_admin пункт не показываем
    // (backend всё равно отдаст 403 — это UX-гейт, не безопасность)
    ...(isSuperAdmin() ? [{ title: "База знаний", url: "/admin/knowledge-base", icon: BookOpen }] : []),
    { title: "Рассылка инвентаризации", url: "/admin/inventory-recipients", icon: Mail },
    { title: "Журнал аудита", url: "/admin/audit", icon: History },
  ];

  const settingsMenuItems = [
    { title: "API CTC настройки", url: "/settings/api-cts", icon: Cog },
  ];

  /** Ссылка меню — в collapsed показывает tooltip */
  const MenuLink = ({ item, badge, onClick }: { item: { title: string; url: string; icon: any }; badge?: number; onClick?: () => void }) => {
    const active = isActive(item.url);
    const link = (
      <NavLink
        to={item.url}
        onClick={onClick}
        className={`flex items-center gap-3 ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'} rounded-md text-sm font-medium transition-all duration-200 touch-manipulation ${getNavCls(active)}`}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate flex-1">{item.title}</span>}
        {!collapsed && badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
            {badge}
          </span>
        )}
        {collapsed && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">{link}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
            {badge !== undefined && badge > 0 && <span className="ml-1.5 text-red-400">({badge})</span>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  /** Заголовок секции с toggle */
  const SectionHeader = ({ groupId, icon: Icon, label }: { groupId: string; icon: any; label: string }) => {
    const isOpen = openGroups.includes(groupId);

    if (collapsed) return null;

    return (
      <button
        className="w-full text-sidebar-foreground text-xs font-semibold tracking-wider hover:text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent transition-all duration-200 flex items-center gap-2 mb-2 uppercase px-2 py-2 rounded-md"
        onClick={() => toggleGroup(groupId)}
        type="button"
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </button>
    );
  };

  const handleMobileClose = () => {
    if (isMobile && setMobileMenuOpen) setMobileMenuOpen(false);
  };

  function renderMenuContent() {
    return (
      <>
        {/* ТОРГОВЫЕ СЕТИ — теперь сворачиваемые */}
        {menuVisibility.networks && (
          <div className={collapsed ? 'px-2 py-3' : 'px-4 py-3'}>
            <SectionHeader groupId="networks" icon={Network} label="ТОРГОВЫЕ СЕТИ" />
            {(collapsed || openGroups.includes("networks")) && (
              <div className={collapsed ? 'space-y-0.5' : 'space-y-1'}>
                {networkMenuItems.map((item) => (
                  <MenuLink key={item.title} item={item} onClick={handleMobileClose} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ТОРГОВАЯ ТОЧКА */}
        {menuVisibility.tradingPoint && (
          <div className={`border-t border-sidebar-border ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
            <SectionHeader groupId="trading-point" icon={MapPin} label="ТОРГОВАЯ ТОЧКА" />
            {(collapsed || openGroups.includes("trading-point")) && (
              <div className={collapsed ? 'space-y-0.5' : 'space-y-1'}>
                {tradingPointMenuItems.map((item) => (
                  <MenuLink key={item.title} item={item} onClick={handleMobileClose} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* АДМИНИСТРИРОВАНИЕ */}
        {menuVisibility.admin && (
          <div className={`border-t border-sidebar-border ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
            <SectionHeader groupId="admin" icon={Shield} label="АДМИНИСТРИРОВАНИЕ" />
            {(collapsed || openGroups.includes("admin")) && (
              <div className={collapsed ? 'space-y-0.5' : 'space-y-1'}>
                {adminMenuItems.map((item) => {
                  return <MenuLink key={item.title} item={item} onClick={handleMobileClose} />;
                })}
              </div>
            )}
          </div>
        )}

        {/* НАСТРОЙКИ */}
        {menuVisibility.settings && (
          <div className={`border-t border-sidebar-border ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
            <SectionHeader groupId="settings" icon={Cog} label="НАСТРОЙКИ" />
            {(collapsed || openGroups.includes("settings")) && (
              <div className={collapsed ? 'space-y-0.5' : 'space-y-1'}>
                {settingsMenuItems.map((item) => (
                  <MenuLink key={item.title} item={item} onClick={handleMobileClose} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toggle button removed from bottom — moved to top */}
      </>
    );
  }

  return (
    <div className={`${isMobile ? 'h-full bg-sidebar' : ''}`}>
      {isMobile ? (
        <div
          className="scrollbar-hide h-full overflow-y-auto bg-sidebar text-sidebar-foreground overscroll-contain touch-auto pt-14 pb-6 mobile-safe-top mobile-safe-bottom"
          onScroll={handleScroll}
          ref={scrollContainerRef}
        >
          {renderMenuContent()}
        </div>
      ) : (
        <Sidebar collapsible="icon" className="border-r-0 bg-sidebar shadow-[4px_0_16px_0_rgba(13,28,46,0.04)]">
          <SidebarContent
            className="pt-header scrollbar-hide bg-sidebar"
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
