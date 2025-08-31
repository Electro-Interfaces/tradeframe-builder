import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Connection, ConnectionTestResult } from "@/types/connections";
import { useState } from "react";

interface ConnectionsListProps {
  connections: Connection[];
  onAddConnection: () => void;
  onEditConnection: (connection: Connection) => void;
  onTestConnection: (connection: Connection) => Promise<ConnectionTestResult>;
  onRotateSecret: (connection: Connection) => void;
  onCloneConnection: (connection: Connection) => void;
  onDeleteConnection: (connection: Connection) => void;
  loading?: boolean;
  testResults?: Record<string, ConnectionTestResult>;
  testLoadingStates?: Record<string, boolean>;
}

export function ConnectionsList({
  connections,
  onAddConnection,
  onEditConnection,
  onTestConnection,
  onRotateSecret,
  onCloneConnection,
  onDeleteConnection,
  loading,
  testResults = {},
  testLoadingStates = {}
}: ConnectionsListProps) {
  const [expandedConnections, setExpandedConnections] = useState<string[]>([]);
  
  // Разделяем подключения на системные и пользовательские
  const systemConnections = connections.filter(conn => conn.isSystem);
  const userConnections = connections.filter(conn => !conn.isSystem);
  const allConnections = [...systemConnections, ...userConnections];

  const toggleExpanded = (connectionId: string) => {
    setExpandedConnections(prev => 
      prev.includes(connectionId) 
        ? prev.filter(id => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  const getStatusIcon = (connection: Connection) => {
    const testResult = testResults[connection.id];
    const isLoading = testLoadingStates[connection.id];
    
    if (isLoading) {
      return <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />;
    }
    
    if (testResult) {
      return testResult.success 
        ? <CheckCircle className="h-4 w-4 text-green-500" />
        : <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Clock className="h-4 w-4 text-slate-400" />;
  };

  const getStatusText = (connection: Connection) => {
    const testResult = testResults[connection.id];
    const isLoading = testLoadingStates[connection.id];
    
    if (isLoading) return "Проверка...";
    if (testResult) {
      return testResult.success 
        ? "Подключено"
        : "Ошибка";
    }
    return "Не проверено";
  };

  const handleTest = async (connection: Connection) => {
    await onTestConnection(connection);
  };

  const ConnectionActions = ({ connection }: { connection: Connection }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditConnection(connection)}>
          <Edit className="h-4 w-4 mr-2" />
          Редактировать
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleTest(connection)}
          disabled={testLoadingStates[connection.id]}
        >
          <TestTube className="h-4 w-4 mr-2" />
          Проверить соединение
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onRotateSecret(connection)}>
          <RotateCw className="h-4 w-4 mr-2" />
          Обновить секрет
        </DropdownMenuItem>
        
        {!connection.isSystem && (
          <>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onCloneConnection(connection)}>
              <Copy className="h-4 w-4 mr-2" />
              Клонировать
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => onDeleteConnection(connection)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Подключения</h2>
        <Button onClick={onAddConnection}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить подключение
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Состояние</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allConnections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Подключения не настроены.
                  <br />
                  Нажмите "Добавить подключение", чтобы создать первое.
                </TableCell>
              </TableRow>
            ) : (
              allConnections.map((connection) => {
                const isExpanded = expandedConnections.includes(connection.id);
                
                return (
                  <>
                    <TableRow key={connection.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(connection.id)}
                          className="p-0 w-6 h-6"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{connection.name}</span>
                          {connection.isSystem && (
                            <Badge variant="outline" className="text-xs">
                              СИСТЕМНОЕ
                            </Badge>
                          )}
                          {!connection.isEnabled && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              ВЫКЛЮЧЕНО
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{connection.purpose}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{connection.connectionType}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{connection.baseUrl}</span>
                      </TableCell>
                      <TableCell>
                        {connection.isEnabled ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Включено
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Выключено
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(connection)}
                          <span className="text-sm">{getStatusText(connection)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ConnectionActions connection={connection} />
                      </TableCell>
                    </TableRow>
                    
                    {isExpanded && (
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell colSpan={6}>
                          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Транспорт и формат</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Транспорт:</span>
                                    <Badge variant="outline" className="text-xs">{connection.transport}</Badge>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Формат:</span>
                                    <Badge variant="outline" className="text-xs">{connection.format}</Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-sm mb-2">Аутентификация</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Тип:</span>
                                    <Badge variant="outline" className="text-xs">{connection.auth.type}</Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-sm mb-2">Endpoints</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Количество:</span>
                                    <span>{connection.exchangeParams.endpoints.length}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Rate Limit:</span>
                                    <span>{connection.exchangeParams.rateLimit}/мин</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {connection.tags.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Теги</h4>
                                <div className="flex flex-wrap gap-1">
                                  {connection.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {connection.responsible && (
                              <div>
                                <h4 className="font-medium text-sm mb-1">Ответственный</h4>
                                <p className="text-sm text-muted-foreground">{connection.responsible}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}