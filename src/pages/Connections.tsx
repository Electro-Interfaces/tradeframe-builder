import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle, XCircle, Eye, EyeOff, Database, Network as NetworkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const supabaseSchema = z.object({
  projectUrl: z.string().url("Введите корректный URL"),
  anonKey: z.string().min(1, "Публичный ключ обязателен"),
  serviceRoleKey: z.string().min(1, "Сервисный ключ обязателен"),
});

const networkApiSchema = z.object({
  baseUrl: z.string().url("Введите корректный URL"),
  apiKey: z.string().min(1, "API ключ обязателен"),
  pollingInterval: z.number().min(1, "Интервал должен быть больше 0"),
});

type SupabaseFormData = z.infer<typeof supabaseSchema>;
type NetworkApiFormData = z.infer<typeof networkApiSchema>;

interface ConnectionStatus {
  status: 'idle' | 'checking' | 'success' | 'error';
  message?: string;
  ping?: number;
}

export default function Connections() {
  const { toast } = useToast();
  
  // Edit modes
  const [supabaseEditMode, setSupabaseEditMode] = useState(false);
  const [networkApiEditMode, setNetworkApiEditMode] = useState(false);
  
  // Password visibility
  const [showSupabaseKeys, setShowSupabaseKeys] = useState({
    anonKey: false,
    serviceRoleKey: false,
  });
  const [showNetworkApiKey, setShowNetworkApiKey] = useState(false);
  
  // Connection status
  const [supabaseStatus, setSupabaseStatus] = useState<ConnectionStatus>({ status: 'idle' });
  const [networkApiStatus, setNetworkApiStatus] = useState<ConnectionStatus>({ status: 'idle' });
  
  // Mock data
  const [supabaseData, setSupabaseData] = useState({
    projectUrl: "https://xyzabc123.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk0NzIwNDAwLCJleHAiOjIwMTAyOTY0MDB9.example",
    serviceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTQ3MjA0MDAsImV4cCI6MjAxMDI5NjQwMH0.example",
  });
  
  const [networkApiData, setNetworkApiData] = useState({
    baseUrl: "https://api.fuel-terminals.com/v2/",
    apiKey: "ft_api_key_abc123def456ghi789",
    pollingInterval: 30,
  });

  // Forms
  const supabaseForm = useForm<SupabaseFormData>({
    resolver: zodResolver(supabaseSchema),
    defaultValues: supabaseData,
  });

  const networkApiForm = useForm<NetworkApiFormData>({
    resolver: zodResolver(networkApiSchema),
    defaultValues: networkApiData,
  });

  const handleSupabaseEdit = () => {
    setSupabaseEditMode(true);
    supabaseForm.reset(supabaseData);
  };

  const handleSupabaseSave = (data: SupabaseFormData) => {
    setSupabaseData({
      projectUrl: data.projectUrl,
      anonKey: data.anonKey,
      serviceRoleKey: data.serviceRoleKey,
    });
    setSupabaseEditMode(false);
    toast({
      title: "Настройки Supabase сохранены",
      description: "Конфигурация базы данных успешно обновлена.",
    });
  };

  const handleSupabaseCancel = () => {
    setSupabaseEditMode(false);
    supabaseForm.reset(supabaseData);
  };

  const handleNetworkApiEdit = () => {
    setNetworkApiEditMode(true);
    networkApiForm.reset(networkApiData);
  };

  const handleNetworkApiSave = (data: NetworkApiFormData) => {
    setNetworkApiData({
      baseUrl: data.baseUrl,
      apiKey: data.apiKey,
      pollingInterval: data.pollingInterval,
    });
    setNetworkApiEditMode(false);
    toast({
      title: "Настройки API торговой сети сохранены",
      description: "Конфигурация внешнего API успешно обновлена.",
    });
  };

  const handleNetworkApiCancel = () => {
    setNetworkApiEditMode(false);
    networkApiForm.reset(networkApiData);
  };

  const testSupabaseConnection = async () => {
    setSupabaseStatus({ status: 'checking' });
    
    // Simulate API call
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      if (success) {
        setSupabaseStatus({
          status: 'success',
          message: 'Соединение установлено',
          ping: Math.floor(Math.random() * 200) + 50,
        });
      } else {
        setSupabaseStatus({
          status: 'error',
          message: 'Ошибка подключения: Неверный API ключ',
        });
      }
    }, 2000);
  };

  const testNetworkApiConnection = async () => {
    setNetworkApiStatus({ status: 'checking' });
    
    // Simulate API call
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      if (success) {
        setNetworkApiStatus({
          status: 'success',
          message: 'Соединение установлено',
          ping: Math.floor(Math.random() * 500) + 100,
        });
      } else {
        setNetworkApiStatus({
          status: 'error',
          message: 'Ошибка подключения: Таймаут соединения',
        });
      }
    }, 2000);
  };

  const renderConnectionStatus = (status: ConnectionStatus) => {
    switch (status.status) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span>Проверка соединения...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>{status.message} {status.ping && `(Ping: ${status.ping}ms)`}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            <span>{status.message}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const maskValue = (value: string) => {
    return '•'.repeat(Math.min(value.length, 32));
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Настройки подключения</h1>
        </div>

        {/* Supabase Connection Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Подключение к Базе Данных (Supabase)</CardTitle>
            </div>
            <CardDescription>
              Эти параметры определяют, где приложение хранит все свои данные. Изменяйте с осторожностью.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...supabaseForm}>
              <form onSubmit={supabaseForm.handleSubmit(handleSupabaseSave)} className="space-y-4">
                <FormField
                  control={supabaseForm.control}
                  name="projectUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supabase Project URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={!supabaseEditMode}
                          className={!supabaseEditMode ? "bg-muted" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={supabaseForm.control}
                  name="anonKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supabase Anon Key (Public)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showSupabaseKeys.anonKey ? "text" : "password"}
                            value={supabaseEditMode ? field.value : maskValue(field.value)}
                            readOnly={!supabaseEditMode}
                            className={!supabaseEditMode ? "bg-muted pr-10" : "pr-10"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSupabaseKeys(prev => ({ ...prev, anonKey: !prev.anonKey }))}
                          >
                            {showSupabaseKeys.anonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={supabaseForm.control}
                  name="serviceRoleKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supabase Service Role Key (Secret)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showSupabaseKeys.serviceRoleKey ? "text" : "password"}
                            value={supabaseEditMode ? field.value : maskValue(field.value)}
                            readOnly={!supabaseEditMode}
                            className={!supabaseEditMode ? "bg-muted pr-10" : "pr-10"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSupabaseKeys(prev => ({ ...prev, serviceRoleKey: !prev.serviceRoleKey }))}
                          >
                            {showSupabaseKeys.serviceRoleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-4">
                    {!supabaseEditMode ? (
                      <Button onClick={handleSupabaseEdit} variant="outline">
                        Редактировать
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="submit">Сохранить</Button>
                        <Button type="button" variant="outline" onClick={handleSupabaseCancel}>
                          Отмена
                        </Button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={testSupabaseConnection}
                      disabled={supabaseStatus.status === 'checking'}
                    >
                      Проверить соединение
                    </Button>
                  </div>
                  {renderConnectionStatus(supabaseStatus)}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Network API Connection Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <NetworkIcon className="h-5 w-5 text-primary" />
              <CardTitle>Подключение к API Торговой Сети</CardTitle>
            </div>
            <CardDescription>
              Эти параметры используются сервисом-адаптером для обмена данными с оборудованием на торговых точках.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...networkApiForm}>
              <form onSubmit={networkApiForm.handleSubmit(handleNetworkApiSave)} className="space-y-4">
                <FormField
                  control={networkApiForm.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Base URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={!networkApiEditMode}
                          className={!networkApiEditMode ? "bg-muted" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={networkApiForm.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key / Auth Token</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showNetworkApiKey ? "text" : "password"}
                            value={networkApiEditMode ? field.value : maskValue(field.value)}
                            readOnly={!networkApiEditMode}
                            className={!networkApiEditMode ? "bg-muted pr-10" : "pr-10"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNetworkApiKey(!showNetworkApiKey)}
                          >
                            {showNetworkApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={networkApiForm.control}
                  name="pollingInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Polling Interval (секунды)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          readOnly={!networkApiEditMode}
                          className={!networkApiEditMode ? "bg-muted" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-4">
                    {!networkApiEditMode ? (
                      <Button onClick={handleNetworkApiEdit} variant="outline">
                        Редактировать
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="submit">Сохранить</Button>
                        <Button type="button" variant="outline" onClick={handleNetworkApiCancel}>
                          Отмена
                        </Button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={testNetworkApiConnection}
                      disabled={networkApiStatus.status === 'checking'}
                    >
                      Проверить соединение
                    </Button>
                  </div>
                  {renderConnectionStatus(networkApiStatus)}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}