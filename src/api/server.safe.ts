/**
 * Безопасный API сервер без проблемных зависимостей
 */

import * as http from 'http';
import * as url from 'url';

interface RequestHandler {
  method: string;
  path: string;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, body: any) => void;
}

class SafeApiServer {
  private handlers: RequestHandler[] = [];
  private server: http.Server;

  constructor(private port: number = 3001) {
    this.server = http.createServer(this.handleRequest.bind(this));
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check
    this.addRoute('GET', '/health', (req, res) => {
      this.sendJSON(res, 200, {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Safe API server is running'
      });
    });

    // Auth test
    this.addRoute('POST', '/api/v1/auth/test', (req, res, body) => {
      this.sendJSON(res, 200, {
        success: true,
        message: 'Auth test endpoint working',
        body: body,
        timestamp: new Date().toISOString()
      });
    });

    // Simple test
    this.addRoute('GET', '/api/v1/test', (req, res) => {
      this.sendJSON(res, 200, {
        success: true,
        message: 'Safe server test endpoint',
        timestamp: new Date().toISOString()
      });
    });
  }

  private addRoute(method: string, path: string, handler: (req: http.IncomingMessage, res: http.ServerResponse, body?: any) => void) {
    this.handlers.push({ method, path, handler });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    const method = req.method || 'GET';
    const path = parsedUrl.pathname || '/';

    // Find matching handler
    const handler = this.handlers.find(h => h.method === method && h.path === path);
    
    if (!handler) {
      this.sendJSON(res, 404, {
        success: false,
        error: 'Endpoint not found',
        path: path,
        method: method
      });
      return;
    }

    try {
      // Parse body for POST requests
      let body = null;
      if (method === 'POST' || method === 'PUT') {
        body = await this.parseBody(req);
      }

      handler.handler(req, res, body);
    } catch (error: any) {
      console.error('Request error:', error);
      this.sendJSON(res, 500, {
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }

  private parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : null);
        } catch (error) {
          resolve(body);
        }
      });
      req.on('error', reject);
    });
  }

  private sendJSON(res: http.ServerResponse, statusCode: number, data: any) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data, null, 2));
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`🚀 Safe API Server running on port ${this.port}`);
      console.log(`📊 Health: http://localhost:${this.port}/health`);
      console.log(`🧪 Test: http://localhost:${this.port}/api/v1/test`);
      console.log(`🔐 Auth Test: http://localhost:${this.port}/api/v1/auth/test`);
    });
  }

  public stop(): void {
    this.server.close();
  }
}

// Start server
const server = new SafeApiServer();
server.start();

export { SafeApiServer };