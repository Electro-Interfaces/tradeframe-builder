/**
 * Утилита для тестирования всех сервисов
 * Запускает базовые операции для проверки работоспособности
 */

import { networksService } from '@/services/networksService';
import { tradingPointsService } from '@/services/tradingPointsService';
import { operationsService } from '@/services/operationsSupabaseService';
import { usersSupabaseService } from '@/services/usersSupabaseService';
import { shiftReportsSupabaseService } from '@/services/shiftReportsSupabaseService';
import { messagesService } from '@/services/messagesSupabaseService';
import { componentStatusService } from '@/services/componentStatusSupabaseService';
import { tanksService } from '@/services/tanksServiceSupabase';
import { pricesService } from '@/services/pricesSupabaseService';
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
      service: 'operationsSupabaseService', 
      status: 'success',
      message: `Найдено ${operations.length} операций`,
      data: operations.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'operationsSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем users service
  try {
    const users = await usersSupabaseService.getAllUsers();
    results.push({
      service: 'usersSupabaseService',
      status: 'success',
      message: `Найдено ${users.length} пользователей`,
      data: users.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'usersSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем shift reports service
  try {
    const shifts = await shiftReportsSupabaseService.getAllShiftReports();
    results.push({
      service: 'shiftReportsSupabaseService',
      status: 'success',
      message: `Найдено ${shifts.length} сменных отчетов`,
      data: shifts.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'shiftReportsSupabaseService',
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
    const tanks = await tanksService.getTanks();
    results.push({
      service: 'tanksServiceSupabase',
      status: 'success',
      message: `Найдено ${tanks.length} резервуаров`,
      data: tanks.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'tanksServiceSupabase',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем prices service
  try {
    const prices = await pricesService.getCurrentPrices();
    results.push({
      service: 'pricesSupabaseService',
      status: 'success',
      message: `Найдено ${prices.length} текущих цен`,
      data: prices.slice(0, 2)
    });
  } catch (error) {
    results.push({
      service: 'pricesSupabaseService',
      status: 'error',
      message: `Ошибка: ${error}`
    });
  }

  // Тестируем commands service
  try {
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