/**
 * Простой запуск API сервера для тестирования
 */

import('./server.ts').then(({ app }) => {
  const PORT = 3001;
  
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 Operations API: http://localhost:${PORT}/api/v1/operations`);
  });
}).catch(console.error);