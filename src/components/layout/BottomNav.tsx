import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Network, Receipt, Clock, Menu } from "lucide-react";

interface BottomNavProps {
  onMenuToggle: () => void;
}

const navItems = [
  { title: "Обзор", url: "/network/overview", icon: Network },
  { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
  { title: "Смены", url: "/point/shift-reports-v2", icon: Clock },
];

const BottomNavComponent = ({ onMenuToggle }: BottomNavProps) => {
  const location = useLocation();

  const isActive = (url: string) => location.pathname === url;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border mobile-safe-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200 touch-manipulation ${
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
            </NavLink>
          );
        })}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-muted-foreground transition-colors duration-200 touch-manipulation"
          type="button"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Меню</span>
        </button>
      </div>
    </nav>
  );
};

export const BottomNav = memo(BottomNavComponent);
