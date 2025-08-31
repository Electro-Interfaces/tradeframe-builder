import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Eye, EyeOff, Plus } from "lucide-react";
import { Connection, CreateConnectionRequest, UpdateConnectionRequest } from "@/types/connections";
import { useState } from "react";

const connectionFormSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  connectionType: z.enum(['1C', 'ERP', 'BI', 'OTHER']),
  purpose: z.string().min(1, "Назначение обязательно"),
  baseUrl: z.string().url("Введите корректный URL"),
  transport: z.enum(['HTTPS', 'SFTP', 'WEBHOOK']),
  format: z.enum(['JSON', 'XML', 'CSV']),
  authType: z.enum(['NONE', 'API_KEY', 'BASIC', 'OAUTH2_CC', 'MTLS']),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  tokenUrl: z.string().optional(),
  endpoints: z.string().min(1, "Укажите хотя бы один endpoint"),
  headersJson: z.string().optional(),
  schedule: z.string().optional(),
  retries: z.number().min(0).max(10),
  rateLimit: z.number().min(1),
  signingSecret: z.string().optional(),
  ipAllowlist: z.string().optional(),
  isEnabled: z.boolean(),
  tags: z.string().optional(),
  responsible: z.string().optional(),
});

type ConnectionFormData = z.infer<typeof connectionFormSchema>;

interface ConnectionFormProps {
  connection?: Connection;
  onSubmit: (data: CreateConnectionRequest | UpdateConnectionRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConnectionForm({ connection, onSubmit, onCancel, loading }: ConnectionFormProps) {
  const [showSecrets, setShowSecrets] = useState({
    apiKey: false,
    password: false,
    clientSecret: false,
    signingSecret: false,
  });

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      name: connection?.name || '',
      connectionType: connection?.connectionType || 'OTHER',
      purpose: connection?.purpose || '',
      baseUrl: connection?.baseUrl || '',
      transport: connection?.transport || 'HTTPS',
      format: connection?.format || 'JSON',
      authType: connection?.auth.type || 'NONE',
      apiKey: connection?.auth.apiKey || '',
      username: connection?.auth.username || '',
      password: connection?.auth.password || '',
      clientId: connection?.auth.clientId || '',
      clientSecret: connection?.auth.clientSecret || '',
      tokenUrl: connection?.auth.tokenUrl || '',
      endpoints: connection?.exchangeParams.endpoints.join('\n') || '',
      headersJson: JSON.stringify(connection?.exchangeParams.headers || {}, null, 2),
      schedule: connection?.exchangeParams.schedule || '',
      retries: connection?.exchangeParams.retries || 3,
      rateLimit: connection?.exchangeParams.rateLimit || 60,
      signingSecret: connection?.security.signingSecret || '',
      ipAllowlist: connection?.security.ipAllowlist.join('\n') || '',
      isEnabled: connection?.isEnabled ?? true,
      tags: connection?.tags.join(', ') || '',
      responsible: connection?.responsible || '',
    },
  });

  const authType = form.watch('authType');

  const handleSubmit = (data: ConnectionFormData) => {
    let headers = {};
    try {
      if (data.headersJson) {
        headers = JSON.parse(data.headersJson);
      }
    } catch {
      // Keep empty headers if JSON is invalid
    }

    const submitData: CreateConnectionRequest | UpdateConnectionRequest = {
      name: data.name,
      connectionType: data.connectionType,
      purpose: data.purpose,
      baseUrl: data.baseUrl,
      transport: data.transport,
      format: data.format,
      auth: {
        type: data.authType,
        apiKey: data.apiKey,
        username: data.username,
        password: data.password,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        tokenUrl: data.tokenUrl,
      },
      exchangeParams: {
        endpoints: data.endpoints.split('\n').filter(e => e.trim()),
        headers,
        schedule: data.schedule || undefined,
        retries: data.retries,
        rateLimit: data.rateLimit,
      },
      security: {
        signingSecret: data.signingSecret || undefined,
        ipAllowlist: data.ipAllowlist ? data.ipAllowlist.split('\n').filter(ip => ip.trim()) : [],
      },
      isEnabled: data.isEnabled,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      responsible: data.responsible || undefined,
    };

    onSubmit(submitData);
  };

  const maskValue = (value: string) => '•'.repeat(Math.min(value.length, 32));

  const renderSecretField = (
    name: keyof typeof showSecrets,
    label: string,
    placeholder?: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                type="text"
                placeholder={placeholder}
                value={showSecrets[name] ? field.value || '' : maskValue(field.value || '')}
                onChange={showSecrets[name] ? field.onChange : undefined}
                className="bg-slate-700 border-slate-600 text-white pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecrets(prev => ({ ...prev, [name]: !prev[name] }))}
              >
                {showSecrets[name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {connection ? 'Редактировать подключение' : 'Новое подключение'}
        </h2>
        {connection?.isSystem && (
          <Badge variant="outline" className="border-orange-500 text-orange-400">
            СИСТЕМНОЕ
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Основная информация</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-slate-700 border-slate-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1C">1C</SelectItem>
                      <SelectItem value="ERP">ERP</SelectItem>
                      <SelectItem value="BI">BI</SelectItem>
                      <SelectItem value="OTHER">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Назначение</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-slate-700 border-slate-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://api.example.com" className="bg-slate-700 border-slate-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Transport and Format */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Транспорт и формат</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Транспорт</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HTTPS">HTTPS</SelectItem>
                        <SelectItem value="SFTP">SFTP</SelectItem>
                        <SelectItem value="WEBHOOK">Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Формат</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="JSON">JSON</SelectItem>
                        <SelectItem value="XML">XML</SelectItem>
                        <SelectItem value="CSV">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Аутентификация</h3>
            
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип аутентификации</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="API_KEY">API Key</SelectItem>
                      <SelectItem value="BASIC">Basic Auth</SelectItem>
                      <SelectItem value="OAUTH2_CC">OAuth2 Client Credentials</SelectItem>
                      <SelectItem value="MTLS">mTLS (PKI)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authType === 'API_KEY' && renderSecretField('apiKey', 'API Key')}
            
            {authType === 'BASIC' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-700 border-slate-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {renderSecretField('password', 'Password')}
              </div>
            )}

            {authType === 'OAUTH2_CC' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-slate-700 border-slate-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderSecretField('clientSecret', 'Client Secret')}
                </div>
                <FormField
                  control={form.control}
                  name="tokenUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://auth.example.com/token" className="bg-slate-700 border-slate-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Exchange Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Параметры обмена</h3>
            
            <FormField
              control={form.control}
              name="endpoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoints (один на строку)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={"/api/v1/users\n/api/v1/orders"} 
                      className="bg-slate-700 border-slate-600 text-white" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headersJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headers (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder='{"Accept": "application/json", "Content-Type": "application/json"}'
                      className="bg-slate-700 border-slate-600 text-white font-mono text-sm" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Расписание (CRON)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="0 */30 * * * *" className="bg-slate-700 border-slate-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="retries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Повторные попытки</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        max="10" 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rateLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Лимит запросов/мин</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1" 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="bg-slate-700 border-slate-600 text-white" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Безопасность</h3>
            
            {renderSecretField('signingSecret', 'Signing Secret (для Webhook)')}

            <FormField
              control={form.control}
              name="ipAllowlist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP Allowlist (один на строку)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={"192.168.1.0/24\n10.0.0.100"} 
                      className="bg-slate-700 border-slate-600 text-white" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Service Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Служебные настройки</h3>
            
            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Включено</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Теги (через запятую)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="production, external-api" className="bg-slate-700 border-slate-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsible"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ответственный</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="admin@company.com" className="bg-slate-700 border-slate-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-6 border-t border-slate-600">
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-white hover:bg-slate-700">
              Отмена
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}