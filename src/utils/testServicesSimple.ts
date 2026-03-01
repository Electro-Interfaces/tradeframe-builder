/**
 * Простая утилита для тестирования сервисов
 */

interface TestResult {
  service: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export async function testBasicServices(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Тестируем только основные сервисы по одному
  try {
    const { networksService } = await import('@/services/networksService');
    const networks = await networksService.getAll();
    results.push({
      service: 'networksService',
      status: 'success',
      message: `Найдено ${networks.length} торговых сетей`,
      data: networks.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'networksService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { tradingPointsService } = await import('@/services/tradingPointsService');
    const points = await tradingPointsService.getAll();
    results.push({
      service: 'tradingPointsService',
      status: 'success',
      message: `Найдено ${points.length} торговых точек`,
      data: points.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'tradingPointsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем дополнительные сервисы
  try {
    const { usersService } = await import('@/services/usersService');
    const users = await usersService.getAllUsers();
    results.push({
      service: 'usersService',
      status: 'success',
      message: `Найдено ${users.length} пользователей`,
      data: users.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'usersService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { operationsService } = await import('@/services/operationsService');
    const operations = await operationsService.getAll();
    results.push({
      service: 'operationsService',
      status: 'success',
      message: `Найдено ${operations.length} операций`,
      data: operations.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'operationsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { tanksService } = await import('@/services/tanksService');
    const tanks = await tanksService.getTanks();
    results.push({
      service: 'tanksService',
      status: 'success',
      message: `Найдено ${tanks.length} резервуаров`,
      data: tanks.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'tanksService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { commandsService } = await import('@/services/commandsService');
    const commands = await commandsService.getAllCommands();
    const workflows = await commandsService.getAllWorkflows();
    results.push({
      service: 'commandsService',
      status: 'success',
      message: `Команды: ${commands.length}, Регламенты: ${workflows.length}`,
      data: { commands: commands.slice(0, 1), workflows: workflows.slice(0, 1) }
    });
  } catch (error) {
    results.push({
      service: 'commandsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  return results;
}

export function logTestResults(results: TestResult[]) {
  console.group('🧪 Результаты тестирования сервисов');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  
  results.forEach(result => {
    // Results logged for service testing
  });
  
  console.groupEnd();
  
  return { successCount, errorCount, total: results.length };
}