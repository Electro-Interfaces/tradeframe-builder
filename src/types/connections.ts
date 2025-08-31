export interface Connection {
  id: string;
  name: string;
  type: 'API_DB' | 'API_NETWORK';
  connectionType: '1C' | 'ERP' | 'BI' | 'OTHER';
  purpose: string;
  baseUrl: string;
  transport: 'HTTPS' | 'SFTP' | 'WEBHOOK';
  format: 'JSON' | 'XML' | 'CSV';
  auth: {
    type: 'NONE' | 'API_KEY' | 'BASIC' | 'OAUTH2_CC' | 'MTLS';
    apiKey?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };
  exchangeParams: {
    endpoints: string[];
    headers: Record<string, string>;
    schedule?: string; // CRON format
    retries: number;
    rateLimit: number;
  };
  security: {
    signingSecret?: string;
    ipAllowlist: string[];
  };
  isEnabled: boolean;
  tags: string[];
  responsible?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionRequest {
  name: string;
  connectionType: '1C' | 'ERP' | 'BI' | 'OTHER';
  purpose: string;
  baseUrl: string;
  transport: 'HTTPS' | 'SFTP' | 'WEBHOOK';
  format: 'JSON' | 'XML' | 'CSV';
  auth: Connection['auth'];
  exchangeParams: Connection['exchangeParams'];
  security: Connection['security'];
  isEnabled?: boolean;
  tags?: string[];
  responsible?: string;
}

export interface UpdateConnectionRequest {
  name?: string;
  connectionType?: '1C' | 'ERP' | 'BI' | 'OTHER';
  purpose?: string;
  baseUrl?: string;
  transport?: 'HTTPS' | 'SFTP' | 'WEBHOOK';
  format?: 'JSON' | 'XML' | 'CSV';
  auth?: Connection['auth'];
  exchangeParams?: Connection['exchangeParams'];
  security?: Connection['security'];
  isEnabled?: boolean;
  tags?: string[];
  responsible?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  ping?: number;
  error?: string;
}

export interface ConnectionsApiResponse {
  connections: Connection[];
  total: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}