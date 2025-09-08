/**
 * New Template Form Component
 * Complex form with tabs for creating/editing command templates
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Save,
  X,
  Globe,
  MapPin,
  Cpu,
  Component,
  ArrowUpDown,
  ArrowDownUp,
  Code,
  Settings,
  FileText,
  Zap
} from 'lucide-react';

import {
  NewCommandTemplate,
  CreateNewTemplateRequest,
  UpdateNewTemplateRequest,
  TemplateScope,
  TemplateMode,
  HttpMethod,
  RetryPolicy,
  ApiSchema,
  NewConnectionId
} from '@/types/connections';
import { 
  TEMPLATE_SCOPE_OPTIONS, 
  TEMPLATE_MODE_OPTIONS, 
  HTTP_METHOD_OPTIONS 
} from '@/utils/templateOptions';
import { currentConnectionSettingsAPI } from '@/services/newConnectionsService';

// Form validation schema
const templateSchema = z.object({
  template_id: z.string()
    .min(1, 'Template ID is required')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed'),
  version: z.string()
    .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)))*(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/, 'Must be valid semantic version (e.g., 1.0.0)'),
  provider_ref: z.string().min(1, 'Provider connection is required'),
  scope: z.enum(['network', 'trading_point', 'equipment', 'component']),
  mode: z.enum(['pull', 'push']),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  endpoint: z.string().min(1, 'Endpoint is required'),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Description is required'),
  documentation_url: z.string().url().optional().or(z.literal('')),
  timeout_ms: z.number().min(1000).max(60000),
  retry_max_attempts: z.number().min(1).max(10),
  retry_backoff: z.enum(['linear', 'exponential', 'fixed']),
  retry_initial_delay: z.number().min(100).max(10000),
  retry_max_delay: z.number().min(1000).max(60000),
  idempotency_enabled: z.boolean(),
  idempotency_header: z.string().optional(),
  version_notes: z.string().optional()
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface NewTemplateFormProps {
  template?: NewCommandTemplate;
  onSubmit: (data: CreateNewTemplateRequest | UpdateNewTemplateRequest) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'view';
}

interface SchemaState {
  path_params: string;
  query_params: string;
  headers: string;
  request_body: string;
  response_body: string;
}

const DEFAULT_SCHEMA = '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}';

export function NewTemplateForm({ template, onSubmit, onCancel, mode }: NewTemplateFormProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  const [schemas, setSchemas] = useState<SchemaState>({
    path_params: DEFAULT_SCHEMA,
    query_params: DEFAULT_SCHEMA,
    headers: DEFAULT_SCHEMA,
    request_body: DEFAULT_SCHEMA,
    response_body: DEFAULT_SCHEMA
  });
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      template_id: '',
      version: '1.0.0',
      provider_ref: '',
      scope: 'trading_point',
      mode: 'pull',
      method: 'GET',
      endpoint: '',
      name: '',
      description: '',
      documentation_url: '',
      timeout_ms: 6000,
      retry_max_attempts: 3,
      retry_backoff: 'exponential',
      retry_initial_delay: 1000,
      retry_max_delay: 10000,
      idempotency_enabled: false,
      idempotency_header: '',
      version_notes: ''
    }
  });

  const { formState: { errors }, watch, setValue, reset } = form;
  const watchedMode = watch('mode');
  const watchedMethod = watch('method');
  const watchedIdempotencyEnabled = watch('idempotency_enabled');

  // State for available connections
  const [availableConnections, setAvailableConnections] = useState<any[]>([]);

  // Load available connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await currentConnectionSettingsAPI.list({ status: 'active' });
        setAvailableConnections(response.data);
      } catch (error) {
        console.error('Failed to load connections:', error);
        setAvailableConnections([]);
      }
    };
    loadConnections();
  }, []);

  // Initialize form with template data
  useEffect(() => {
    if (template) {
      reset({
        template_id: template.template_id,
        version: template.version,
        provider_ref: template.provider_ref,
        scope: template.scope,
        mode: template.mode,
        method: template.method,
        endpoint: template.endpoint,
        name: template.name,
        description: template.description,
        documentation_url: template.documentation_url || '',
        timeout_ms: template.timeout_ms,
        retry_max_attempts: template.retry_policy.max_attempts,
        retry_backoff: template.retry_policy.backoff,
        retry_initial_delay: template.retry_policy.initial_delay_ms,
        retry_max_delay: template.retry_policy.max_delay_ms,
        idempotency_enabled: template.idempotency.enabled,
        idempotency_header: template.idempotency.key_header || '',
        version_notes: template.version_notes || ''
      });

      // Load schemas
      if (template.schemas) {
        setSchemas({
          path_params: template.schemas.path_params ? JSON.stringify(template.schemas.path_params, null, 2) : DEFAULT_SCHEMA,
          query_params: template.schemas.query_params ? JSON.stringify(template.schemas.query_params, null, 2) : DEFAULT_SCHEMA,
          headers: template.schemas.headers ? JSON.stringify(template.schemas.headers, null, 2) : DEFAULT_SCHEMA,
          request_body: template.schemas.request_body ? JSON.stringify(template.schemas.request_body, null, 2) : DEFAULT_SCHEMA,
          response_body: template.schemas.response_body ? JSON.stringify(template.schemas.response_body, null, 2) : DEFAULT_SCHEMA
        });
      }
    }
  }, [template, reset]);

  // Validate JSON schema
  const validateSchema = (schemaText: string, fieldName: string) => {
    try {
      JSON.parse(schemaText);
      setSchemaErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      return true;
    } catch (error) {
      setSchemaErrors(prev => ({
        ...prev,
        [fieldName]: error instanceof Error ? error.message : 'Invalid JSON'
      }));
      return false;
    }
  };

  // Handle schema change
  const handleSchemaChange = (field: keyof SchemaState, value: string) => {
    setSchemas(prev => ({ ...prev, [field]: value }));
    validateSchema(value, field);
  };

  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    // Validate all schemas
    let hasSchemaErrors = false;
    const parsedSchemas: ApiSchema = {};

    for (const [key, schemaText] of Object.entries(schemas)) {
      if (schemaText.trim() !== DEFAULT_SCHEMA.trim()) {
        try {
          parsedSchemas[key as keyof ApiSchema] = JSON.parse(schemaText);
        } catch (error) {
          validateSchema(schemaText, key);
          hasSchemaErrors = true;
        }
      }
    }

    if (hasSchemaErrors) {
      setCurrentTab('schemas');
      return;
    }

    setIsSubmitting(true);

    try {
      const retryPolicy: RetryPolicy = {
        max_attempts: data.retry_max_attempts,
        backoff: data.retry_backoff,
        initial_delay_ms: data.retry_initial_delay,
        max_delay_ms: data.retry_max_delay,
        retry_on_status_codes: [408, 429, 500, 502, 503, 504]
      };

      const requestData: CreateNewTemplateRequest | UpdateNewTemplateRequest = {
        template_id: data.template_id,
        version: data.version,
        provider_ref: data.provider_ref as NewConnectionId,
        scope: data.scope,
        mode: data.mode,
        method: data.method,
        endpoint: data.endpoint,
        schemas: parsedSchemas,
        retry_policy: retryPolicy,
        timeout_ms: data.timeout_ms,
        idempotency: {
          enabled: data.idempotency_enabled,
          key_header: data.idempotency_enabled ? data.idempotency_header : undefined
        },
        name: data.name,
        description: data.description,
        documentation_url: data.documentation_url || undefined,
        version_notes: data.version_notes || undefined
      };

      await onSubmit(requestData);
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  });

  // Get scope icon
  const getScopeIcon = (scope: TemplateScope) => {
    switch (scope) {
      case 'network': return <Globe className="w-4 h-4" />;
      case 'trading_point': return <MapPin className="w-4 h-4" />;
      case 'equipment': return <Cpu className="w-4 h-4" />;
      case 'component': return <Component className="w-4 h-4" />;
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <div className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              <FileText className="w-4 h-4 mr-2" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="api">
              <Zap className="w-4 h-4 mr-2" />
              API
            </TabsTrigger>
            <TabsTrigger value="schemas">
              <Code className="w-4 h-4 mr-2" />
              Schemas
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="template_id">Template ID *</Label>
                <Input
                  id="template_id"
                  placeholder="fuel_price_sync"
                  {...form.register('template_id')}
                  disabled={isReadOnly || (mode === 'edit')}
                  className={isReadOnly ? 'opacity-60' : ''}
                />
                {errors.template_id && (
                  <p className="text-sm text-red-600">{errors.template_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  {...form.register('version')}
                  disabled={isReadOnly}
                  className={isReadOnly ? 'opacity-60' : ''}
                />
                {errors.version && (
                  <p className="text-sm text-red-600">{errors.version.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="Synchronization of fuel prices"
                {...form.register('name')}
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-60' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this template does and when to use it..."
                rows={3}
                {...form.register('description')}
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-60' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Scope *</Label>
                <Select 
                  value={form.watch('scope')} 
                  onValueChange={(value: TemplateScope) => setValue('scope', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className={isReadOnly ? 'opacity-60' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_SCOPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {getScopeIcon(option.value as TemplateScope)}
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-slate-500">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.scope && (
                  <p className="text-sm text-red-600">{errors.scope.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Provider Connection *</Label>
                <Select 
                  value={form.watch('provider_ref')} 
                  onValueChange={(value) => setValue('provider_ref', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className={isReadOnly ? 'opacity-60' : ''}>
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConnections.map(connection => (
                      <SelectItem key={connection.id} value={connection.id}>
                        <div>
                          <div className="font-medium">{connection.provider_id}</div>
                          <div className="text-sm text-slate-500">{connection.base_url}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.provider_ref && (
                  <p className="text-sm text-red-600">{errors.provider_ref.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentation_url">Documentation URL</Label>
              <Input
                id="documentation_url"
                placeholder="https://docs.company.com/templates/example"
                {...form.register('documentation_url')}
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-60' : ''}
              />
              {errors.documentation_url && (
                <p className="text-sm text-red-600">{errors.documentation_url.message}</p>
              )}
            </div>

            {mode !== 'create' && (
              <div className="space-y-2">
                <Label htmlFor="version_notes">Version Notes</Label>
                <Textarea
                  id="version_notes"
                  placeholder="Describe what changed in this version..."
                  rows={2}
                  {...form.register('version_notes')}
                  disabled={isReadOnly}
                  className={isReadOnly ? 'opacity-60' : ''}
                />
              </div>
            )}
          </TabsContent>

          {/* API Configuration Tab */}
          <TabsContent value="api" className="flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Mode *</Label>
                <Select 
                  value={form.watch('mode')} 
                  onValueChange={(value: TemplateMode) => setValue('mode', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className={isReadOnly ? 'opacity-60' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_MODE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.value === 'pull' ? 
                            <ArrowDownUp className="w-4 h-4" /> : 
                            <ArrowUpDown className="w-4 h-4" />
                          }
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-slate-500">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.mode && (
                  <p className="text-sm text-red-600">{errors.mode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>HTTP Method *</Label>
                <Select 
                  value={form.watch('method')} 
                  onValueChange={(value: HttpMethod) => setValue('method', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className={isReadOnly ? 'opacity-60' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHOD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-slate-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.method && (
                  <p className="text-sm text-red-600">{errors.method.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint Path *</Label>
              <Input
                id="endpoint"
                placeholder="/api/v1/prices/{region_id}"
                {...form.register('endpoint')}
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-60' : ''}
              />
              {errors.endpoint && (
                <p className="text-sm text-red-600">{errors.endpoint.message}</p>
              )}
              <p className="text-sm text-slate-500">
                Use curly braces for path parameters: {'{'}variable_name{'}'}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Settings</CardTitle>
                <CardDescription>
                  Configure timeout and retry behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout_ms">Timeout (ms) *</Label>
                    <Input
                      id="timeout_ms"
                      type="number"
                      min="1000"
                      max="60000"
                      step="1000"
                      {...form.register('timeout_ms', { valueAsNumber: true })}
                      disabled={isReadOnly}
                      className={isReadOnly ? 'opacity-60' : ''}
                    />
                    {errors.timeout_ms && (
                      <p className="text-sm text-red-600">{errors.timeout_ms.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry_max_attempts">Max Retry Attempts *</Label>
                    <Input
                      id="retry_max_attempts"
                      type="number"
                      min="1"
                      max="10"
                      {...form.register('retry_max_attempts', { valueAsNumber: true })}
                      disabled={isReadOnly}
                      className={isReadOnly ? 'opacity-60' : ''}
                    />
                    {errors.retry_max_attempts && (
                      <p className="text-sm text-red-600">{errors.retry_max_attempts.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Backoff Strategy</Label>
                    <Select 
                      value={form.watch('retry_backoff')} 
                      onValueChange={(value: 'linear' | 'exponential' | 'fixed') => setValue('retry_backoff', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className={isReadOnly ? 'opacity-60' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exponential">Exponential</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry_initial_delay">Initial Delay (ms)</Label>
                    <Input
                      id="retry_initial_delay"
                      type="number"
                      min="100"
                      max="10000"
                      {...form.register('retry_initial_delay', { valueAsNumber: true })}
                      disabled={isReadOnly}
                      className={isReadOnly ? 'opacity-60' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry_max_delay">Max Delay (ms)</Label>
                    <Input
                      id="retry_max_delay"
                      type="number"
                      min="1000"
                      max="60000"
                      {...form.register('retry_max_delay', { valueAsNumber: true })}
                      disabled={isReadOnly}
                      className={isReadOnly ? 'opacity-60' : ''}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schemas Tab */}
          <TabsContent value="schemas" className="flex-1 overflow-y-auto space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Define JSON schemas to validate API requests and responses. Leave empty schemas as default if not needed.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {Object.entries(schemas).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">
                      {key.replace('_', ' ')} Schema
                    </CardTitle>
                    <CardDescription>
                      JSON Schema for {key.replace('_', ' ')} validation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor={key}>JSON Schema</Label>
                      <Textarea
                        id={key}
                        value={value}
                        onChange={(e) => handleSchemaChange(key as keyof SchemaState, e.target.value)}
                        disabled={isReadOnly}
                        className={`font-mono text-sm min-h-[200px] ${isReadOnly ? 'opacity-60' : ''} ${schemaErrors[key] ? 'border-red-500' : ''}`}
                        placeholder={DEFAULT_SCHEMA}
                      />
                      {schemaErrors[key] && (
                        <p className="text-sm text-red-600">{schemaErrors[key]}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 overflow-y-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Idempotency</CardTitle>
                <CardDescription>
                  Configure idempotency settings for safe retry operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="idempotency_enabled"
                    checked={form.watch('idempotency_enabled')}
                    onCheckedChange={(checked) => setValue('idempotency_enabled', checked)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor="idempotency_enabled">Enable idempotency</Label>
                </div>

                {watchedIdempotencyEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="idempotency_header">Idempotency Header Name</Label>
                    <Input
                      id="idempotency_header"
                      placeholder="Idempotency-Key"
                      {...form.register('idempotency_header')}
                      disabled={isReadOnly}
                      className={isReadOnly ? 'opacity-60' : ''}
                    />
                    <p className="text-sm text-slate-500">
                      Header name for idempotency key (e.g., Idempotency-Key, X-Request-ID)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Status Info for Edit/View modes */}
            {template && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template Information</CardTitle>
                  <CardDescription>
                    Current template status and metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-slate-500">Status</Label>
                      <div className="mt-1">
                        <Badge variant={
                          template.status === 'active' ? 'default' :
                          template.status === 'inactive' ? 'secondary' :
                          template.status === 'deprecated' ? 'destructive' : 'outline'
                        }>
                          {template.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Type</Label>
                      <div className="mt-1">
                        <Badge variant={template.is_system ? 'outline' : 'default'}>
                          {template.is_system ? 'System' : 'User'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Created</Label>
                      <p className="text-sm mt-1">{new Date(template.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Last Updated</Label>
                      <p className="text-sm mt-1">{new Date(template.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        {!isReadOnly && (
          <div className="flex justify-end gap-3 pt-6 border-t bg-white dark:bg-slate-900">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Create Template' : 'Update Template'}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}