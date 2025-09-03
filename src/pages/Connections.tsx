import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Edit, 
  TestTube, 
  RotateCw, 
  Copy, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Clock,
  Plus
} from "lucide-react";
import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { Connection, CreateConnectionRequest, UpdateConnectionRequest, ConnectionTestResult } from "@/types/connections";
import { mockConnectionsApi } from "@/services/connections";

export default function Connections() {
  const { toast } = useToast();
  
  // State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [deletingConnection, setDeletingConnection] = useState<Connection | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testLoadingStates, setTestLoadingStates] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Load connections
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await mockConnectionsApi.getConnections();
      setConnections(data);
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить список подключений",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация подключений по поиску
  const filteredConnections = connections.filter(connection =>
    connection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.connectionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.baseUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      return testResult.success ? "Подключено" : "Ошибка";
    }
    return "Не проверено";
  };

  // Event handlers
  const handleAddConnection = () => {
    setEditingConnection(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditConnection = (connection: Connection) => {
    setEditingConnection(connection);
    setIsEditDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateConnectionRequest | UpdateConnectionRequest) => {
    try {
      setFormLoading(true);
      
      if (editingConnection) {
        // Update existing connection
        const updatedConnection = await mockConnectionsApi.updateConnection(
          editingConnection.id, 
          data as UpdateConnectionRequest
        );
        setConnections(prev => 
          prev.map(conn => conn.id === editingConnection.id ? updatedConnection : conn)
        );
        toast({
          title: "Подключение обновлено",
          description: `Настройки "${updatedConnection.name}" успешно сохранены`,
        });
      } else {
        // Create new connection
        const newConnection = await mockConnectionsApi.createConnection(data as CreateConnectionRequest);
        setConnections(prev => [...prev, newConnection]);
        toast({
          title: "Подключение создано",
          description: `Подключение "${newConnection.name}" успешно добавлено`,
        });
      }
      
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingConnection(null);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить подключение",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingConnection(null);
  };

  const handleTestConnection = async (connection: Connection): Promise<ConnectionTestResult> => {
    setTestLoadingStates(prev => ({ ...prev, [connection.id]: true }));
    
    try {
      const result = await mockConnectionsApi.testConnection(connection.id);
      setTestResults(prev => ({ ...prev, [connection.id]: result }));
      
      toast({
        title: result.success ? "Соединение установлено" : "Ошибка подключения",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      return result;
    } catch (error: any) {
      const errorResult: ConnectionTestResult = {
        success: false,
        message: error.message || "Ошибка тестирования",
        error: error.message,
      };
      setTestResults(prev => ({ ...prev, [connection.id]: errorResult }));
      return errorResult;
    } finally {
      setTestLoadingStates(prev => ({ ...prev, [connection.id]: false }));
    }
  };

  const handleRotateSecret = async (connection: Connection) => {
    try {
      const updatedConnection = await mockConnectionsApi.rotateSecret(connection.id);
      setConnections(prev => 
        prev.map(conn => conn.id === connection.id ? updatedConnection : conn)
      );
      toast({
        title: "Секрет обновлен",
        description: `Секретный ключ для "${connection.name}" успешно обновлен`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить секрет",
        variant: "destructive",
      });
    }
  };

  const handleCloneConnection = async (connection: Connection) => {
    try {
      const clonedConnection = await mockConnectionsApi.cloneConnection(connection.id);
      setConnections(prev => [...prev, clonedConnection]);
      toast({
        title: "Подключение клонировано",
        description: `Создана копия "${clonedConnection.name}"`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось клонировать подключение",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConnection = (connection: Connection) => {
    setDeletingConnection(connection);
  };

  const confirmDelete = async () => {
    if (!deletingConnection) return;
    
    try {
      await mockConnectionsApi.deleteConnection(deletingConnection.id);
      setConnections(prev => prev.filter(conn => conn.id !== deletingConnection.id));
      toast({
        title: "Подключение удалено",
        description: `"${deletingConnection.name}" успешно удалено`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить подключение",
        variant: "destructive",
      });
    } finally {
      setDeletingConnection(null);
    }
  };

  return (
    <>
      <MainLayout fullWidth={true}>
        <div className="w-full h-full report-full-width">
          {/* Заголовок страницы */}
          <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
            <h1 className="text-2xl font-semibold text-white">Настройки подключения</h1>
            <p className="text-slate-400 mt-2">Управление подключениями к внешним системам и сервисам</p>
          </div>

          {/* Панель подключений */}
          <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700 mx-4 md:mx-6 lg:mx-8">
            <div className="px-4 md:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">🔗</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Подключения</h2>
                </div>
                <Button 
                  onClick={handleAddConnection}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                >
                  + Создать подключение
                </Button>
              </div>
              
              {/* Поиск подключений */}
              <div className="mt-4">
                <Input
                  placeholder="Поиск подключений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>

          </div>

          <div className="mx-4 md:mx-6 lg:mx-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : connections.length === 0 ? (
            <div className="pb-6">
              <EmptyState 
                title="Нет подключений" 
                description="Создайте первое подключение для интеграции с внешними системами"
                cta={
                  <Button 
                    onClick={handleAddConnection}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    + Создать подключение
                  </Button>
                }
                className="py-16"
              />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="pb-6">
              <EmptyState 
                title="Ничего не найдено" 
                description="Попробуйте изменить условия поиска"
                className="py-16"
              />
            </div>
          ) : (
            <div>
              {/* Десктоп: таблица на всю ширину */}
              <div className="overflow-x-auto border border-slate-600 rounded-lg">
                <table className="w-full text-sm table-fixed">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '25%'}}>НАЗВАНИЕ</th>
                        <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ТИП</th>
                        <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '20%'}}>URL</th>
                        <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СТАТУС</th>
                        <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СОСТОЯНИЕ</th>
                        <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '10%'}}>ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {filteredConnections.map((connection) => (
                        <tr
                          key={connection.id}
                          className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div>
                              <div className="font-medium text-white text-base flex items-center gap-2">
                                {connection.name}
                                {connection.isSystem && (
                                  <Badge variant="outline" className="border-orange-500 text-orange-400 text-xs">
                                    СИСТЕМНОЕ
                                  </Badge>
                                )}
                              </div>
                              {connection.purpose && (
                                <div className="text-sm text-slate-400">{connection.purpose}</div>
                              )}
                              {connection.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {connection.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {connection.tags.length > 3 && (
                                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                      +{connection.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                              {connection.connectionType}
                            </Badge>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                              {connection.baseUrl}
                            </code>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant={connection.isEnabled ? "default" : "secondary"}>
                              {connection.isEnabled ? "Включено" : "Выключено"}
                            </Badge>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(connection)}
                              <span className="text-sm text-slate-200">{getStatusText(connection)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleEditConnection(connection)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleTestConnection(connection)}
                                disabled={testLoadingStates[connection.id]}
                              >
                                <TestTube className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleCloneConnection(connection)}
                                disabled={connection.isSystem}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                onClick={() => handleDeleteConnection(connection)}
                                disabled={connection.isSystem}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          )}
          </div>
        </div>
      </MainLayout>

      {/* Create/Edit Connection Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingConnection(null);
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-600 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingConnection ? 'Редактировать подключение' : 'Новое подключение'}
            </DialogTitle>
          </DialogHeader>
          <ConnectionForm
            connection={editingConnection || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingConnection} onOpenChange={() => setDeletingConnection(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить подключение</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Вы уверены, что хотите удалить подключение "{deletingConnection?.name}"? 
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeletingConnection(null)}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}