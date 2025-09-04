"use strict";
/**
 * Минимальный API сервер для диагностики проблем
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.API_PORT || process.env.PORT || 3001;
// Basic middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Minimal API server is running'
    });
});
// Simple test route
app.get('/api/v1/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test endpoint working',
        timestamp: new Date().toISOString()
    });
});
// Auth test route
app.post('/api/v1/auth/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth test endpoint',
        body: req.body,
        timestamp: new Date().toISOString()
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});
// Error handler
app.use((error, req, res, next) => {
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
