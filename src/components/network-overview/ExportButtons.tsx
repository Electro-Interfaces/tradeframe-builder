/**
 * Компонент кнопок экспорта для страницы обзора сети
 */

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  loading: boolean;
  exportingPdf: boolean;
}

export function ExportButtons({
  onExportExcel,
  onExportPdf,
  loading,
  exportingPdf
}: ExportButtonsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-slate-800 border-slate-600 shadow-xl rounded-lg">
        <DropdownMenuItem
          onClick={onExportExcel}
          className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">Экспорт в Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onExportPdf}
          disabled={loading || exportingPdf}
          className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5"
        >
          <FileText className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium">{exportingPdf ? 'PDF…' : 'Экспорт в PDF'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
