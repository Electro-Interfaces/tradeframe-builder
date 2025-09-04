/**
 * Минимальный API сервер для диагностики проблем
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';

const app: Application = express();
const PORT = process.env.API_PORT || process.env.PORT || 3002;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Minimal API server is running'
  });
});

// Simple test route
app.get('/api/v1/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Auth test route
app.post('/api/v1/auth/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth test endpoint',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Server error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Minimal API Server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/v1/test`);
});

export { app };