import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Cog
} from "lucide-react";

interface AppSidebarProps {
  selectedTradingPoint: string;
  isMobile?: boolean;
}

export function AppSidebar({ selectedTradingPoint, isMobile = false }: AppSidebarProps) {
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
    { title: "Обзор сети", url: "/network/overview", icon: Network },
    { title: "Отчеты по сети", url: "/network/reports", icon: BarChart3 },
    { title: "Оповещения сети", url: "/network/alerts", icon: Bell },
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
  ];

  return (
    <Sidebar className="border-r border-sidebar-border shadow-md">
      <SidebarContent className="pt-header scrollbar-hide">
        {/* ГЛАВНАЯ */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-100 text-sm font-semibold">
            ГЛАВНАЯ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls(isActive(item.url))}
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ТОРГОВЫЕ СЕТИ */}
        <Collapsible
          open={isMobile || openGroups.includes("networks")}
          onOpenChange={() => !isMobile && toggleGroup("networks")}
        >
          <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2">
                <Network className="w-4 h-4" />
                {!collapsed && "ТОРГОВЫЕ СЕТИ"}
                {!collapsed && (
                  <ChevronRight 
                    className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                      openGroups.includes("networks") ? "rotate-90" : ""
                    }`} 
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-200 ease-in-out">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {networkMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.url} 
                            className={getNavCls(isActive(item.url))}
                          >
                            <item.icon className="w-4 h-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ТОРГОВАЯ ТОЧКА */}
        <Collapsible
          open={isMobile || openGroups.includes("trading-point")}
          onOpenChange={() => !isMobile && toggleGroup("trading-point")}
        >
          <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {!collapsed && "ТОРГОВАЯ ТОЧКА"}
                {!collapsed && (
                  <ChevronRight 
                    className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                      openGroups.includes("trading-point") ? "rotate-90" : ""
                    }`} 
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-200 ease-in-out">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {tradingPointMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          disabled={!isTradingPointSelected}
                          className={!isTradingPointSelected ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <NavLink 
                            to={isTradingPointSelected ? item.url : "#"} 
                            className={isTradingPointSelected ? getNavCls(isActive(item.url)) : ""}
                            onClick={(e) => !isTradingPointSelected && e.preventDefault()}
                          >
                            <item.icon className="w-4 h-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* АДМИНИСТРИРОВАНИЕ */}
        <Collapsible
          open={isMobile || openGroups.includes("admin")}
          onOpenChange={() => !isMobile && toggleGroup("admin")}
        >
          <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {!collapsed && "АДМИНИСТРИРОВАНИЕ"}
                {!collapsed && (
                  <ChevronRight 
                    className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                      openGroups.includes("admin") ? "rotate-90" : ""
                    }`} 
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-200 ease-in-out">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.url} 
                            className={getNavCls(isActive(item.url))}
                          >
                            <item.icon className="w-4 h-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* НАСТРОЙКИ */}
        <Collapsible
          open={isMobile || openGroups.includes("settings")}
          onOpenChange={() => !isMobile && toggleGroup("settings")}
        >
          <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-gray-100 text-sm font-semibold cursor-pointer hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2">
                <Cog className="w-4 h-4" />
                {!collapsed && "НАСТРОЙКИ"}
                {!collapsed && (
                  <ChevronRight 
                    className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                      openGroups.includes("settings") ? "rotate-90" : ""
                    }`} 
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-200 ease-in-out">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        {item.submenu ? (
                            <Collapsible
                              open={isMobile || openGroups.includes(item.title)}
                              onOpenChange={() => !isMobile && toggleGroup(item.title)}
                            >
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="w-full">
                                <item.icon className="w-4 h-4" />
                                {!collapsed && (
                                  <>
                                    <span>{item.title}</span>
                                    <ChevronRight 
                                      className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                                        openGroups.includes(item.title) ? "rotate-90" : ""
                                      }`} 
                                    />
                                  </>
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="transition-all duration-200 ease-in-out">
                                <SidebarMenuSub>
                                  {item.submenu.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton asChild>
                                        <NavLink 
                                          to={subItem.url}
                                          className={getNavCls(isActive(subItem.url))}
                                        >
                                          {subItem.title}
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <SidebarMenuButton asChild>
                            <NavLink 
                              to={item.url} 
                              className={getNavCls(isActive(item.url))}
                            >
                              <item.icon className="w-4 h-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}