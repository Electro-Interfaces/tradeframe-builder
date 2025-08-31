import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Edit, 
  TestTube, 
  RotateCw, 
  Copy, 
  Trash2, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle,
  Clock,
  Database,
  Network as NetworkIcon
} from "lucide-react";
import { Connection, ConnectionTestResult } from "@/types/connections";

interface ConnectionCardProps {
  connection: Connection;
  onEdit: (connection: Connection) => void;
  onTest: (connection: Connection) => Promise<ConnectionTestResult>;
  onRotateSecret: (connection: Connection) => void;
  onClone: (connection: Connection) => void;
  onDelete: (connection: Connection) => void;
  testResult?: ConnectionTestResult | null;
  testLoading?: boolean;
}

export function ConnectionCard({
  connection,
  onEdit,
  onTest,
  onRotateSecret,
  onClone,
  onDelete,
  testResult,
  testLoading
}: ConnectionCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTest = async () => {
    await onTest(connection);
  };

  const getStatusIcon = () => {
    if (testLoading) {
      return <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />;
    }
    
    if (testResult) {
      return testResult.success 
        ? <CheckCircle className="h-4 w-4 text-green-500" />
        : <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Clock className="h-4 w-4 text-slate-400" />;
  };

  const getStatusText = () => {
    if (testLoading) {
      return "Проверка...";
    }
    
    if (testResult) {
      return testResult.success 
        ? `Подключено ${testResult.ping ? `(${testResult.ping}ms)` : ''}`
        : testResult.error || "Ошибка подключения";
    }
    
    return "Не проверено";
  };

  const getTypeIcon = () => {
    switch (connection.type) {
      case 'API_DB':
        return <Database className="h-5 w-5" />;
      case 'API_NETWORK':
        return <NetworkIcon className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="bg-slate-800 border-slate-600 hover:border-slate-500 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              {getTypeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{connection.name}</h3>
                {connection.isSystem && (
                  <Badge variant="outline" className="border-orange-500 text-orange-400 text-xs">
                    СИСТЕМНОЕ
                  </Badge>
                )}
                {!connection.isEnabled && (
                  <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                    ВЫКЛЮЧЕНО
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400">{connection.purpose}</p>
            </div>
          </div>
          
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-600">
              <DropdownMenuItem 
                onClick={() => onEdit(connection)}
                className="text-white hover:bg-slate-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleTest}
                disabled={testLoading}
                className="text-white hover:bg-slate-700"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Проверить соединение
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => onRotateSecret(connection)}
                className="text-white hover:bg-slate-700"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Обновить секрет
              </DropdownMenuItem>
              
              {!connection.isSystem && (
                <>
                  <DropdownMenuSeparator className="bg-slate-600" />
                  
                  <DropdownMenuItem 
                    onClick={() => onClone(connection)}
                    className="text-white hover:bg-slate-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Клонировать
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => onDelete(connection)}
                    className="text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Тип</p>
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                {connection.connectionType}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Транспорт</p>
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                {connection.transport}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">URL</p>
            <p className="text-sm text-white font-mono truncate">{connection.baseUrl}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Аутентификация</p>
            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
              {connection.auth.type}
            </Badge>
          </div>

          {/* Tags */}
          {connection.tags.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Теги</p>
              <div className="flex flex-wrap gap-1">
                {connection.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="border-slate-600 text-slate-300 text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon()}
                <span className={testResult?.success ? 'text-green-400' : testResult ? 'text-red-400' : 'text-slate-400'}>
                  {getStatusText()}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Обновлено: {formatLastUpdated(connection.updatedAt)}
              </p>
            </div>
          </div>

          {/* Responsible */}
          {connection.responsible && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Ответственный</p>
              <p className="text-sm text-slate-300">{connection.responsible}</p>
            </div>
          )}

          {/* Exchange Parameters Summary */}
          <div className="text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Endpoints: {connection.exchangeParams.endpoints.length}</span>
              <span>Rate Limit: {connection.exchangeParams.rateLimit}/мин</span>
            </div>
            {connection.exchangeParams.schedule && (
              <div className="mt-1">
                <span>Расписание: {connection.exchangeParams.schedule}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}