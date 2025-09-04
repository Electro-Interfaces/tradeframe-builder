/**
 * Express API Server
 * Для АГЕНТА 1: Инфраструктура
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from './middleware/auth.js';
import { testDatabaseConnection } from './database/supabase.js';

// Import routes
import { authRouter } from './routes/auth.js';
import { fuelStockSnapshotsRouter } from './routes/fuel-stock-snapshots.js';
import { legalDocumentsRouter } from './routes/legal-documents.js';
// import { networksRouter } from './routes/networks.js';
// import { fuelTypesRouter } from './routes/fuel-types.js';
import { operationsRouter } from './routes/operations.js';
import { priceHistoryRouter } from './routes/price-history.js';
import { fuelStocksRouter } from './routes/fuel-stocks.js';
import { equipmentRouter } from './routes/equipment';
// import { equipmentLogRouter } from './routes/equipment-log';
// import { tanksRouter } from './routes/tanks';
// import { tradingPointsRouter } from './routes/trading-points';
// import { usersRouter } from './routes/users';
// import { rolesRouter } from './routes/roles';

const app: Application = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// ===============================================
// MIDDLEWARE CONFIGURATION
// ===============================================

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'file://'  // для локальных HTML файлов
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });
}

// ===============================================
// HEALTH CHECK ROUTES
// ===============================================

app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = await testDatabaseConnection();
  
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    database: dbStatus,
    uptime: process.uptime()
  });
});

app.get('/api/v1/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// ===============================================
// API ROUTES
// ===============================================

// Public routes (no authentication required)
app.use('/api/v1/auth', authRouter);

// Protected routes (require authentication)
app.use('/api/v1/fuel-stock-snapshots', fuelStockSnapshotsRouter);
app.use('/api/v1/legal-documents', legalDocumentsRouter);

// Other routes - temporarily disabled for testing
// app.use('/api/v1/networks', authenticateToken, networksRouter);
// app.use('/api/v1/fuel-types', authenticateToken, fuelTypesRouter);
app.use('/api/v1/operations', operationsRouter); // Temporarily disabled auth for testing
app.use('/api/v1/price-history', authenticateToken, priceHistoryRouter);
app.use('/api/v1/fuel-stocks', authenticateToken, fuelStocksRouter);
app.use('/api/v1/equipment', authenticateToken, equipmentRouter);
// app.use('/api/v1/equipment-log', authenticateToken, equipmentLogRouter);
// app.use('/api/v1/tanks', authenticateToken, tanksRouter);
// app.use('/api/v1/trading-points', authenticateToken, tradingPointsRouter);
// app.use('/api/v1/users', authenticateToken, usersRouter);
// app.use('/api/v1/roles', authenticateToken, rolesRouter);

// Temporary test routes (будут заменены на настоящие routes)
// app.get('/api/v1/test', authenticateToken, (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     message: 'Authentication test passed',
//     user: req.user,
//     timestamp: new Date().toISOString()
//   });
// });

// ===============================================
// ERROR HANDLING
// ===============================================

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', error);
  
  // Parse JSON error messages from repositories
  let errorDetails;
  try {
    errorDetails = JSON.parse(error.message);
  } catch {
    errorDetails = {
      message: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR'
    };
  }
  
  res.status(error.status || 500).json({
    success: false,
    error: errorDetails.message,
    code: errorDetails.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: errorDetails.details
    })
  });
});

// ===============================================
// SERVER STARTUP
// ===============================================

async function startServer() {
  try {
    // Test database connection before starting server
    console.log('🔍 Testing database connection...');
    const dbStatus = await testDatabaseConnection();
    
    if (!dbStatus.success) {
      console.error('❌ Database connection failed:', dbStatus.message);
      console.error('Details:', dbStatus.details);
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        console.warn('⚠️  Starting server without database connection (development mode)');
      }
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Tradeframe API Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API base URL: http://localhost:${PORT}/api/v1`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app };