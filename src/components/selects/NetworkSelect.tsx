import { Network, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NetworkSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

const networks = [
  { value: "network1", label: "Сеть АЗС №1", status: "active" },
  { value: "network2", label: "Сеть АЗС №2", status: "active" },
  { value: "network3", label: "Автодор", status: "inactive" },
];

export function NetworkSelect({ value, onValueChange, className }: NetworkSelectProps) {
  const selectedNetwork = networks.find(n => n.value === value);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("sel", className)}>
          <Network className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {selectedNetwork?.label || "Выберите сеть"}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <ul className="space-y-1">
          {networks.map((network) => (
            <li
              key={network.value}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer"
              onClick={() => onValueChange?.(network.value)}
            >
              <span 
                className={cn(
                  "h-2 w-2 rounded-full",
                  network.status === "active" ? "bg-emerald-400" : "bg-slate-500"
                )} 
                aria-hidden 
              />
              <span className="truncate">{network.label}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}