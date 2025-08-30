import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Terminal, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export interface CommandExecutionHistory {
  id: string;
  commandId: string;
  commandName: string;
  commandCode: string;
  userId: string;
  userName: string;
  executedAt: Date;
  status: "success" | "error" | "pending";
  parameters?: any;
  result?: any;
  errorMessage?: string;
  duration?: number; // в миллисекундах
}

interface CommandHistoryProps {
  history: CommandExecutionHistory[];
  equipmentId: string;
  equipmentName: string;
}

export function CommandHistory({ history, equipmentId, equipmentName }: CommandHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "Успешно";
      case "error":
        return "Ошибка";
      case "pending":
        return "Выполняется";
      default:
        return "Неизвестно";
    }
  };

  const filteredHistory = history.filter(item => item.commandCode && item.userName);

  if (filteredHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            История команд для {equipmentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Команды для этого оборудования еще не выполнялись</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          История команд для {equipmentName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Параметры</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Время выполнения</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory
                .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
                .map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(item.executedAt, "dd.MM.yyyy", { locale: ru })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(item.executedAt, "HH:mm:ss", { locale: ru })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.commandName}</div>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {item.commandCode}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.parameters ? (
                      <details className="cursor-pointer">
                        <summary className="text-sm text-muted-foreground">
                          Показать параметры
                        </summary>
                        <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-w-xs">
                          {JSON.stringify(item.parameters, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-sm text-muted-foreground">Без параметров</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <Badge className={`border ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </Badge>
                    </div>
                    {item.status === "error" && item.errorMessage && (
                      <div className="text-xs text-red-600 mt-1 max-w-xs">
                        {item.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.duration ? (
                      <span className="text-sm text-muted-foreground">
                        {item.duration < 1000 
                          ? `${item.duration}мс`
                          : `${(item.duration / 1000).toFixed(1)}с`
                        }
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}