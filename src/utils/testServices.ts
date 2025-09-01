/**
 * Утилита для тестирования всех сервисов
 * Запускает базовые операции для проверки работоспособности
 */

import { networksService } from '@/services/networksService';
import { tradingPointsService } from '@/services/tradingPointsService';
import { operationsService } from '@/services/operationsService';
import { usersService } from '@/services/usersService';
import { shiftReportsService } from '@/services/shiftReportsService';
import { messagesService } from '@/services/messagesService';
import { componentStatusService } from '@/services/componentStatusService';
import { tanksService } from '@/services/tanksService';
import { pricesService } from '@/services/pricesService';
import { commandsService } from '@/services/commandsService';

interface TestResult {
  service: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export async function testAllServices(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Тестируем networks service
  try {
    const networks = await networksService.getAll();
    results.push({
      service: 'networksService',
      status: 'success',
      message: `Найдено ${networks.length} торговых сетей`,
      data: networks.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'networksService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем trading points service
  try {
    const points = await tradingPointsService.getAll();
    results.push({
      service: 'tradingPointsService',
      status: 'success',
      message: `Найдено ${points.length} торговых точек`,
      data: points.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'tradingPointsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем operations service
  try {
    const operations = await operationsService.getAll();
    results.push({
      service: 'operationsService', 
      status: 'success',
      message: `Найдено ${operations.length} операций`,
      data: operations.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'operationsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем users service
  try {
    const users = await usersService.getAllUsers();
    results.push({
      service: 'usersService',
      status: 'success',
      message: `Найдено ${users.length} пользователей`,
      data: users.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'usersService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем shift reports service
  try {
    const shifts = await shiftReportsService.getAllShiftReports();
    results.push({
      service: 'shiftReportsService',
      status: 'success',
      message: `Найдено ${shifts.length} сменных отчетов`,
      data: shifts.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'shiftReportsService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем messages service
  try {
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

  // Тестируем component status service
  try {
    const statuses = await componentStatusService.getAll();
    results.push({
      service: 'componentStatusService',
      status: 'success',
      message: `Найдено ${statuses.length} статусов компонентов`,
      data: statuses.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'componentStatusService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем tanks service
  try {
    const tanks = await tanksService.getAll();
    results.push({
      service: 'tanksService',
      status: 'success',
      message: `Найдено ${tanks.length} резервуаров`,
      data: tanks.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'tanksService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем prices service
  try {
    const prices = await pricesService.getCurrentPrices();
    results.push({
      service: 'pricesService',
      status: 'success',
      message: `Найдено ${prices.length} текущих цен`,
      data: prices.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'pricesService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем commands service
  try {
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

// Вспомогательная функция для вывода результатов в консоль
export function logTestResults(results: TestResult[]) {
  console.group('🧪 Результаты тестирования сервисов');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Успешно: ${successCount} | ❌ Ошибки: ${errorCount}`);
  console.log('');
  
  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${result.service}: ${result.message}`);
    
    if (result.data && result.status === 'success') {
      console.log('   Пример данных:', result.data);
    }
  });
  
  console.groupEnd();
  
  return { successCount, errorCount, total: results.length };
}