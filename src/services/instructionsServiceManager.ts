/**
 * Service Manager для переключения между mock и real database инструкций
 */

import { instructionsService } from './instructionsService';
import { externalInstructionsService } from './externalInstructionsService';
import type {
  InstructionTopic,
  InstructionVersion,
  InstructionStats,
  CreateInstructionTopicRequest,
  CreateInstructionVersionRequest,
  UpdateInstructionVersionRequest,
  InstructionForUser
} from '@/types/instructions';

interface InstructionsServiceInterface {
  getTopics(): Promise<InstructionTopic[]>;
  getTopicByKey(key: string): Promise<InstructionTopic | null>;
  createTopic(request: CreateInstructionTopicRequest): Promise<InstructionTopic>;
  getVersions(topicId: string): Promise<InstructionVersion[]>;
  createVersion(request: CreateInstructionVersionRequest): Promise<InstructionVersion>;
  updateVersion(versionId: string, request: UpdateInstructionVersionRequest): Promise<InstructionVersion>;
  publishVersion(versionId: string): Promise<InstructionVersion>;
  getInstructionForUser(routeOrKey: string): Promise<InstructionForUser | null>;
  getStats(): Promise<InstructionStats>;
  logView(topicId: string, versionId: string, userId?: string): Promise<void>;
}

class InstructionsServiceManager implements InstructionsServiceInterface {
  private useExternalDatabase: boolean = false;
  
  constructor() {
    this.initializeServiceChoice();
  }

  private initializeServiceChoice(): void {
    // Проверяем localStorage на предпочитаемый сервис
    const preference = localStorage.getItem('instructions_service_preference');
    const hasExternalDb = !!localStorage.getItem('externalDatabase');
    
    // Используем внешнюю БД только если она настроена И предпочтение установлено
    this.useExternalDatabase = hasExternalDb && preference === 'external';
    
    console.log(`📚 InstructionsServiceManager: Using ${this.useExternalDatabase ? 'EXTERNAL DATABASE' : 'MOCK (localStorage)'} service`);
  }

  private getCurrentService(): InstructionsServiceInterface {
    return this.useExternalDatabase ? externalInstructionsService : instructionsService;
  }

  // Публичные методы для переключения сервисов
  public switchToMockService(): void {
    console.log('🔄 Switching to Mock Service (localStorage)');
    this.useExternalDatabase = false;
    localStorage.setItem('instructions_service_preference', 'mock');
  }

  public switchToExternalDatabase(): void {
    console.log('🔄 Switching to External Database Service');
    this.useExternalDatabase = true;
    localStorage.setItem('instructions_service_preference', 'external');
  }

  public isUsingExternalDatabase(): boolean {
    return this.useExternalDatabase;
  }

  public getCurrentServiceInfo(): { type: 'mock' | 'external'; available: boolean } {
    const hasExternalDb = !!localStorage.getItem('externalDatabase');
    return {
      type: this.useExternalDatabase ? 'external' : 'mock',
      available: this.useExternalDatabase ? hasExternalDb : true
    };
  }

  // Проброс всех методов к активному сервису
  async getTopics(): Promise<InstructionTopic[]> {
    return this.getCurrentService().getTopics();
  }

  async getTopicByKey(key: string): Promise<InstructionTopic | null> {
    return this.getCurrentService().getTopicByKey(key);
  }

  async createTopic(request: CreateInstructionTopicRequest): Promise<InstructionTopic> {
    return this.getCurrentService().createTopic(request);
  }

  async getVersions(topicId: string): Promise<InstructionVersion[]> {
    return this.getCurrentService().getVersions(topicId);
  }

  async createVersion(request: CreateInstructionVersionRequest): Promise<InstructionVersion> {
    return this.getCurrentService().createVersion(request);
  }

  async updateVersion(versionId: string, request: UpdateInstructionVersionRequest): Promise<InstructionVersion> {
    return this.getCurrentService().updateVersion(versionId, request);
  }

  async publishVersion(versionId: string): Promise<InstructionVersion> {
    return this.getCurrentService().publishVersion(versionId);
  }

  async getInstructionForUser(routeOrKey: string): Promise<InstructionForUser | null> {
    return this.getCurrentService().getInstructionForUser(routeOrKey);
  }

  async getStats(): Promise<InstructionStats> {
    return this.getCurrentService().getStats();
  }

  async logView(topicId: string, versionId: string, userId: string = 'anonymous'): Promise<void> {
    return this.getCurrentService().logView(topicId, versionId, userId);
  }

  // Дополнительные методы для управления
  public async testCurrentService(): Promise<{ success: boolean; error?: string; service: string }> {
    const serviceInfo = this.getCurrentServiceInfo();
    
    try {
      if (serviceInfo.type === 'external') {
        // Тестируем внешнюю БД через externalInstructionsService
        const result = await externalInstructionsService.testConnection();
        return {
          success: result.success,
          error: result.error,
          service: 'External Database'
        };
      } else {
        // Для mock-сервиса просто проверяем доступность localStorage
        const testKey = `instructions_test_${Date.now()}`;
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        return {
          success: true,
          service: 'Mock (localStorage)'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        service: serviceInfo.type === 'external' ? 'External Database' : 'Mock (localStorage)'
      };
    }
  }

  public getAvailableServices(): Array<{
    type: 'mock' | 'external';
    name: string;
    available: boolean;
    current: boolean;
  }> {
    const hasExternalDb = !!localStorage.getItem('externalDatabase');
    
    return [
      {
        type: 'mock',
        name: 'Mock Service (localStorage)',
        available: true,
        current: !this.useExternalDatabase
      },
      {
        type: 'external',
        name: 'External Database (Supabase)',
        available: hasExternalDb,
        current: this.useExternalDatabase
      }
    ];
  }
}

// Экспортируем единый экземпляр менеджера
export const instructionsServiceManager = new InstructionsServiceManager();

// Также экспортируем для обратной совместимости с существующим кодом
export const activeInstructionsService = instructionsServiceManager;