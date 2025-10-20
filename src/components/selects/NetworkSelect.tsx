import { useState } from "react";
import { Network as NetworkIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Network } from "@/types/network";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { useQuery } from "@tanstack/react-query";
import { networksService } from "@/services/networksService";

interface NetworkSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function NetworkSelect({ value, onValueChange, className }: NetworkSelectProps) {
  const [open, setOpen] = useState(false);
  const { user } = useNewAuth();

  // ✅ ИСПРАВЛЕНИЕ: Используем React Query для кэширования
  const { data: networks = [] } = useQuery({
    queryKey: ['networks', user?.role],
    queryFn: () => networksService.getAll(user?.role),
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 30 * 60 * 1000, // 30 минут - время хранения в кэше
  });

  const selectedNetwork = networks.find(n => n.id === value);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };
  
  const handleSelect = (networkId: string) => {
    onValueChange?.(networkId);
    setOpen(false); // Закрываем селектор после выбора
  };
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]",
          className
        )}>
          <NetworkIcon className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {selectedNetwork?.name || "Выберите сеть"}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <ul className="space-y-1">
          {networks.map((network) => (
            <li
              key={network.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer"
              onClick={() => handleSelect(network.id)}
            >
              <span 
                className={cn(
                  "h-2 w-2 rounded-full",
                  "bg-emerald-400"
                )} 
                aria-hidden 
              />
              <span className="truncate">{network.name}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}