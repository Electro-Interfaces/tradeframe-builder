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
    const { usersSupabaseService } = await import('@/services/usersSupabaseService');
    const users = await usersSupabaseService.getAllUsers();
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
    const { operationsService } = await import('@/services/operationsSupabaseService');
    const operations = await operationsService.getAll();
    results.push({
      service: 'operationsSupabaseService',
      status: 'success',
      message: `Найдено ${operations.length} операций`,
      data: operations.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'operationsSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { shiftReportsSupabaseService } = await import('@/services/shiftReportsSupabaseService');
    const shifts = await shiftReportsSupabaseService.getAllShiftReports();
    results.push({
      service: 'shiftReportsSupabaseService',
      status: 'success',
      message: `Найдено ${shifts.length} сменных отчетов`,
      data: shifts.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'shiftReportsSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { messagesService } = await import('@/services/messagesSupabaseService');
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
    const { tanksService } = await import('@/services/tanksServiceSupabase');
    const tanks = await tanksService.getTanks();
    results.push({
      service: 'tanksServiceSupabase',
      status: 'success',
      message: `Найдено ${tanks.length} резервуаров`,
      data: tanks.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'tanksServiceSupabase',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { pricesService } = await import('@/services/pricesSupabaseService');
    const prices = await pricesService.getCurrentPrices();
    results.push({
      service: 'pricesSupabaseService',
      status: 'success',
      message: `Найдено ${prices.length} текущих цен`,
      data: prices.slice(0, 1)
    });
  } catch (error) {
    results.push({
      service: 'pricesSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { commandsService } = await import('@/services/commandsService');
    const commands = await commandsService.getAllCommands();
    const workflows = await commandsService.getAllWorkflows();
    results.push({
      service: 'commandTemplatesSupabaseService',
      status: 'success',
      message: `Команды: ${commands.length}, Регламенты: ${workflows.length}`,
      data: { commands: commands.slice(0, 1), workflows: workflows.slice(0, 1) }
    });
  } catch (error) {
    results.push({
      service: 'commandTemplatesSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  try {
    const { componentStatusService } = await import('@/services/componentStatusSupabaseService');
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
  
  console.log(`✅ Успешно: ${successCount} | ❌ Ошибки: ${errorCount}`);
  
  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${result.service}: ${result.message}`);
  });
  
  console.groupEnd();
  
  return { successCount, errorCount, total: results.length };
}