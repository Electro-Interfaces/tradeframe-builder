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
  MapPin
} from "lucide-react";

interface AppSidebarProps {
  selectedTradingPoint: string;
}

export function AppSidebar({ selectedTradingPoint }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>(["main"]);
  
  const collapsed = state === "collapsed";

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = (active: boolean) => 
    active ? "bg-blue-600 text-white font-medium transition-colors duration-200" : "transition-colors duration-200 hover:bg-gray-700";

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
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="pt-header">
        {/* ГЛАВНАЯ */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-200 text-xs font-semibold">
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
        <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
          <SidebarGroupLabel className="text-gray-200 text-xs font-semibold">
            ТОРГОВЫЕ СЕТИ
          </SidebarGroupLabel>
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
        </SidebarGroup>

        {/* ТОРГОВАЯ ТОЧКА */}
        <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
          <SidebarGroupLabel className="text-gray-200 text-xs font-semibold">
            ТОРГОВАЯ ТОЧКА
          </SidebarGroupLabel>
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
        </SidebarGroup>

        {/* АДМИНИСТРИРОВАНИЕ */}
        <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
          <SidebarGroupLabel className="text-gray-200 text-xs font-semibold">
            АДМИНИСТРИРОВАНИЕ
          </SidebarGroupLabel>
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
        </SidebarGroup>

        {/* НАСТРОЙКИ */}
        <SidebarGroup className="border-t border-gray-700 mt-2 pt-2">
          <SidebarGroupLabel className="text-gray-200 text-xs font-semibold">
            НАСТРОЙКИ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.submenu ? (
                    <Collapsible
                      open={openGroups.includes(item.title)}
                      onOpenChange={() => toggleGroup(item.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <item.icon className="w-4 h-4" />
                          {!collapsed && (
                            <>
                              <span>{item.title}</span>
                              <ChevronRight 
                                className={`w-4 h-4 ml-auto transition-transform ${
                                  openGroups.includes(item.title) ? "rotate-90" : ""
                                }`} 
                              />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent>
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
                      )}
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}