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
    const { shiftReportsService } = await import('@/services/shiftReportsService');
    const shifts = await shiftReportsService.getAllShiftReports();
    results.push({
      service: 'shiftReportsService',
      status: 'success',
      message: `Найдено ${shifts.length} сменных отчетов`,
      data: shifts.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'shiftReportsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { messagesService } = await import('@/services/messagesService');
    const messages = await messagesService.getAllChatMessages();
    const tickets = await messagesService.getAllTickets();
    const notifications = await messagesService.getAllNotifications();
    results.push({
      service: 'messagesService',
      status: 'success',
      message: `Сообщения: ${messages.length}, Тикеты: ${tickets.length}, Уведомления: ${notifications.length}`,
      data: { messages: messages.slice(0, 1), tickets: tickets.slice(0, 1) }
    });
  } catch (error) {
    results.push({
      service: 'messagesService',
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
    const { pricesService } = await import('@/services/pricesService');
    const prices = await pricesService.getCurrentPrices();
    results.push({
      service: 'pricesService',
      status: 'success',
      message: `Найдено ${prices.length} текущих цен`,
      data: prices.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'pricesService',
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

  try {
    const { componentStatusService } = await import('@/services/componentStatusService');
    const statuses = await componentStatusService.getAll();
    results.push({
      service: 'componentStatusService',
      status: 'success',
      message: `Найдено ${statuses.length} статусов компонентов`,
      data: statuses.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'componentStatusService',
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
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${result.service}: ${result.message}`);
  });
  
  console.groupEnd();
  
  return { successCount, errorCount, total: results.length };
}