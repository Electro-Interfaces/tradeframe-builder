import { useState } from "react";
import { Network, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { networksStore } from "@/mock/networksStore";

interface NetworkSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function NetworkSelect({ value, onValueChange, className }: NetworkSelectProps) {
  const [open, setOpen] = useState(false);
  const networks = networksStore.getAll();
  const selectedNetwork = networks.find(n => n.id === value);
  
  const handleSelect = (networkId: string) => {
    onValueChange?.(networkId);
    setOpen(false); // Закрываем селектор после выбора
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("sel", className)}>
          <Network className="inline h-4 w-4 mr-2 opacity-70" />
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