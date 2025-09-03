import { 
  Component, 
  ComponentTemplate,
  CreateComponentRequest, 
  UpdateComponentRequest,
  ComponentFilters,
  ListComponentsParams,
  ListComponentsResponse,
  ComponentStatusAction,
  ComponentEvent
} from '@/types/component';
import { componentTemplatesStore } from '@/mock/componentTemplatesStore';
import { PersistentStorage } from '@/utils/persistentStorage';

// Базовый URL для API
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();

// Утилита для HTTP запросов с трейсингом
class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json',
      'X-Trace-Id': this.generateTraceId(),
      ...options.headers,
    };

    // Добавляем Idempotency-Key для мутирующих операций
    if (['POST', 'PUT', 'PATCH'].includes(options.method || 'GET')) {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

const apiClient = new ApiClient();

// Mock данные компонентов для POS-терминалов согласно API торговой сети
const initialComponents: Component[] = [
  // Компоненты POS-терминала №1 на АЗС №001
  {
    id: "comp_001",
    trading_point_id: "point1",
    equipment_id: "eq_2", // POS-терминал
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор АТОЛ 91Ф",
    system_type: "terminal",
    category: "fiscal",
    serial_number: "FR2024001",
    params: {
      model: "АТОЛ 91Ф",
      fiscal_memory: true,
      ofd_connection: "ethernet"
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_tso_kkt_1"
  },
  {
    id: "comp_002",
    trading_point_id: "point1",
    equipment_id: "eq_2", // POS-терминал
    name: "Купюроприёмник",
    display_name: "Купюроприёмник CashCode MSM",
    system_type: "terminal",
    category: "payment",
    serial_number: "MSM2024001",
    params: {
      currency: ["RUB"],
      capacity: 600,
      recycling: false
    },
    status: 'offline', // Офлайн для демонстрации
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_tso_cashin_1"
  },
  {
    id: "comp_003",
    trading_point_id: "point1",
    equipment_id: "eq_2", // POS-терминал
    name: "Картридер банковских карт",
    display_name: "Картридер банковских карт",
    system_type: "terminal",
    category: "payment",
    serial_number: "BCR2024001",
    params: {
      payment_types: ["Visa", "Mastercard", "Мир"],
      nfc_enabled: true,
      pin_pad: true
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_tso_bankcr_1"
  },
  {
    id: "comp_004",
    trading_point_id: "point1",
    equipment_id: "eq_2", // POS-терминал
    name: "Картридер топливных карт",
    display_name: "Картридер топливных карт",
    system_type: "terminal",
    category: "payment",
    serial_number: "FCR2024001",
    params: {
      supported_cards: ["Petrol Plus", "Shell Card", "BP Card"],
      interface: "USB",
      encryption: true
    },
    status: 'error', // Ошибка для демонстрации
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_tso_fuelcr_1"
  },
  {
    id: "comp_005",
    trading_point_id: "point1",
    equipment_id: "eq_2", // POS-терминал
    name: "МПС-ридер",
    display_name: "МПС-ридер мобильных платежей",
    system_type: "terminal",
    category: "payment",
    serial_number: "MPS2024001",
    params: {
      supported_systems: ["NFC", "QR-код", "Apple Pay", "Google Pay", "Samsung Pay"],
      connection_status: "connected",
      protocol_version: "2.0"
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_tso_mpsr_1"
  },

  // Компоненты платежных систем для систем управления на всех АЗС

  // АЗС №001 (point1) - Система управления eq_6
  {
    id: "comp_pay_001",
    trading_point_id: "point1",
    equipment_id: "eq_6",
    name: "Картридер банковских карт",
    display_name: "Картридер для банковских карт с поддержкой NFC",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_BANKCR_001",
    params: { type: "NFC", payment_types: ["card", "nfc"] },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_BANKCR"
  },
  {
    id: "comp_pay_002",
    trading_point_id: "point1",
    equipment_id: "eq_6",
    name: "Картридер топливных карт",
    display_name: "Картридер для чтения топливных карт в POS-терминале",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FUELCR_001",
    params: { type: "fuel_cards", supported_cards: ["fleet", "corporate"] },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FUELCR"
  },
  {
    id: "comp_pay_003",
    trading_point_id: "point1",
    equipment_id: "eq_6",
    name: "Купюроприёмник",
    display_name: "Купюроприёмник для приёма наличных платежей",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_CASHIN_001",
    params: { currency: "RUB", denominations: [100, 200, 500, 1000, 2000, 5000] },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_CASHIN"
  },
  {
    id: "comp_pay_004",
    trading_point_id: "point1",
    equipment_id: "eq_6",
    name: "МПС-ридер",
    display_name: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_MPSR_001",
    params: { protocols: ["NFC", "QR", "Apple Pay", "Google Pay", "Samsung Pay"] },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_MPSR"
  },
  {
    id: "comp_pay_005",
    trading_point_id: "point1",
    equipment_id: "eq_6",
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FISCAL_001",
    params: { ofd_provider: "Первый ОФД", fiscal_memory: true, kkt_model: "АТОЛ 91Ф" },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FISCAL"
  },

  // АЗС №002 (point2) - Система управления eq_13
  {
    id: "comp_pay_006",
    trading_point_id: "point2",
    equipment_id: "eq_13",
    name: "Картридер банковских карт",
    display_name: "Картридер для банковских карт с поддержкой NFC",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_BANKCR_002",
    params: { type: "NFC", payment_types: ["card", "nfc"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_BANKCR"
  },
  {
    id: "comp_pay_007",
    trading_point_id: "point2",
    equipment_id: "eq_13",
    name: "Картридер топливных карт",
    display_name: "Картридер для чтения топливных карт в POS-терминале",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FUELCR_002",
    params: { type: "fuel_cards", supported_cards: ["fleet", "corporate"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FUELCR"
  },
  {
    id: "comp_pay_008",
    trading_point_id: "point2",
    equipment_id: "eq_13",
    name: "Купюроприёмник",
    display_name: "Купюроприёмник для приёма наличных платежей",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_CASHIN_002",
    params: { currency: "RUB", denominations: [100, 200, 500, 1000, 2000, 5000] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_CASHIN"
  },
  {
    id: "comp_pay_009",
    trading_point_id: "point2",
    equipment_id: "eq_13",
    name: "МПС-ридер",
    display_name: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_MPSR_002",
    params: { protocols: ["NFC", "QR", "Apple Pay", "Google Pay", "Samsung Pay"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_MPSR"
  },
  {
    id: "comp_pay_010",
    trading_point_id: "point2",
    equipment_id: "eq_13",
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FISCAL_002",
    params: { ofd_provider: "Первый ОФД", fiscal_memory: true, kkt_model: "АТОЛ 91Ф" },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FISCAL"
  },

  // АЗС №003 (point3) - Система управления eq_14
  {
    id: "comp_pay_011",
    trading_point_id: "point3",
    equipment_id: "eq_14",
    name: "Картридер банковских карт",
    display_name: "Картридер для банковских карт с поддержкой NFC",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_BANKCR_003",
    params: { type: "NFC", payment_types: ["card", "nfc"] },
    status: 'online',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_BANKCR"
  },
  {
    id: "comp_pay_012",
    trading_point_id: "point3",
    equipment_id: "eq_14",
    name: "Картридер топливных карт",
    display_name: "Картридер для чтения топливных карт в POS-терминале",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FUELCR_003",
    params: { type: "fuel_cards", supported_cards: ["fleet", "corporate"] },
    status: 'online',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FUELCR"
  },
  {
    id: "comp_pay_013",
    trading_point_id: "point3",
    equipment_id: "eq_14",
    name: "Купюроприёмник",
    display_name: "Купюроприёмник для приёма наличных платежей",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_CASHIN_003",
    params: { currency: "RUB", denominations: [100, 200, 500, 1000, 2000, 5000] },
    status: 'online',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_CASHIN"
  },
  {
    id: "comp_pay_014",
    trading_point_id: "point3",
    equipment_id: "eq_14",
    name: "МПС-ридер",
    display_name: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_MPSR_003",
    params: { protocols: ["NFC", "QR", "Apple Pay", "Google Pay", "Samsung Pay"] },
    status: 'online',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_MPSR"
  },
  {
    id: "comp_pay_015",
    trading_point_id: "point3",
    equipment_id: "eq_14",
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FISCAL_003",
    params: { ofd_provider: "Первый ОФД", fiscal_memory: true, kkt_model: "АТОЛ 91Ф" },
    status: 'online',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FISCAL"
  },

  // АЗС №004 (point4) - Система управления eq_15
  {
    id: "comp_pay_016",
    trading_point_id: "point4",
    equipment_id: "eq_15",
    name: "Картридер банковских карт",
    display_name: "Картридер для банковских карт с поддержкой NFC",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_BANKCR_004",
    params: { type: "NFC", payment_types: ["card", "nfc"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_BANKCR"
  },
  {
    id: "comp_pay_017",
    trading_point_id: "point4",
    equipment_id: "eq_15",
    name: "Картридер топливных карт",
    display_name: "Картридер для чтения топливных карт в POS-терминале",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FUELCR_004",
    params: { type: "fuel_cards", supported_cards: ["fleet", "corporate"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FUELCR"
  },
  {
    id: "comp_pay_018",
    trading_point_id: "point4",
    equipment_id: "eq_15",
    name: "Купюроприёмник",
    display_name: "Купюроприёмник для приёма наличных платежей",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_CASHIN_004",
    params: { currency: "RUB", denominations: [100, 200, 500, 1000, 2000, 5000] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_CASHIN"
  },
  {
    id: "comp_pay_019",
    trading_point_id: "point4",
    equipment_id: "eq_15",
    name: "МПС-ридер",
    display_name: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_MPSR_004",
    params: { protocols: ["NFC", "QR", "Apple Pay", "Google Pay", "Samsung Pay"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_MPSR"
  },
  {
    id: "comp_pay_020",
    trading_point_id: "point4",
    equipment_id: "eq_15",
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FISCAL_004",
    params: { ofd_provider: "Первый ОФД", fiscal_memory: true, kkt_model: "АТОЛ 91Ф" },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FISCAL"
  },

  // АЗС №005 (point5) - Система управления eq_16
  {
    id: "comp_pay_021",
    trading_point_id: "point5",
    equipment_id: "eq_16",
    name: "Картридер банковских карт",
    display_name: "Картридер для банковских карт с поддержкой NFC",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_BANKCR_005",
    params: { type: "NFC", payment_types: ["card", "nfc"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_BANKCR"
  },
  {
    id: "comp_pay_022",
    trading_point_id: "point5",
    equipment_id: "eq_16",
    name: "Картридер топливных карт",
    display_name: "Картридер для чтения топливных карт в POS-терминале",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FUELCR_005",
    params: { type: "fuel_cards", supported_cards: ["fleet", "corporate"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FUELCR"
  },
  {
    id: "comp_pay_023",
    trading_point_id: "point5",
    equipment_id: "eq_16",
    name: "Купюроприёмник",
    display_name: "Купюроприёмник для приёма наличных платежей",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_CASHIN_005",
    params: { currency: "RUB", denominations: [100, 200, 500, 1000, 2000, 5000] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_CASHIN"
  },
  {
    id: "comp_pay_024",
    trading_point_id: "point5",
    equipment_id: "eq_16",
    name: "МПС-ридер",
    display_name: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_MPSR_005",
    params: { protocols: ["NFC", "QR", "Apple Pay", "Google Pay", "Samsung Pay"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_MPSR"
  },
  {
    id: "comp_pay_025",
    trading_point_id: "point5",
    equipment_id: "eq_16",
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FISCAL_005",
    params: { ofd_provider: "Первый ОФД", fiscal_memory: true, kkt_model: "АТОЛ 91Ф" },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FISCAL"
  },

  // АЗС №006 (point6) - Система управления eq_17
  {
    id: "comp_pay_026",
    trading_point_id: "point6",
    equipment_id: "eq_17",
    name: "Картридер банковских карт",
    display_name: "Картридер для банковских карт с поддержкой NFC",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_BANKCR_006",
    params: { type: "NFC", payment_types: ["card", "nfc"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_BANKCR"
  },
  {
    id: "comp_pay_027",
    trading_point_id: "point6",
    equipment_id: "eq_17",
    name: "Картридер топливных карт",
    display_name: "Картридер для чтения топливных карт в POS-терминале",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FUELCR_006",
    params: { type: "fuel_cards", supported_cards: ["fleet", "corporate"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FUELCR"
  },
  {
    id: "comp_pay_028",
    trading_point_id: "point6",
    equipment_id: "eq_17",
    name: "Купюроприёмник",
    display_name: "Купюроприёмник для приёма наличных платежей",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_CASHIN_006",
    params: { currency: "RUB", denominations: [100, 200, 500, 1000, 2000, 5000] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_CASHIN"
  },
  {
    id: "comp_pay_029",
    trading_point_id: "point6",
    equipment_id: "eq_17",
    name: "МПС-ридер",
    display_name: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_MPSR_006",
    params: { protocols: ["NFC", "QR", "Apple Pay", "Google Pay", "Samsung Pay"] },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_MPSR"
  },
  {
    id: "comp_pay_030",
    trading_point_id: "point6",
    equipment_id: "eq_17",
    name: "Фискальный регистратор",
    display_name: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    system_type: "control_system",
    category: "payment",
    serial_number: "CMP_TSO_FISCAL_006",
    params: { ofd_provider: "Первый ОФД", fiscal_memory: true, kkt_model: "АТОЛ 91Ф" },
    status: 'online',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "CMP_TSO_FISCAL"
  }
];

// Загружаем данные из localStorage при инициализации
let mockComponents: Component[] = PersistentStorage.load<Component>('components_v2', initialComponents);

// Проверяем и обновляем данные при необходимости
const checkAndUpdateData = () => {
  if (!mockComponents.length || mockComponents.length < initialComponents.length) {
    console.log('🔄 Обновляем данные компонентов до актуальной версии...');
    mockComponents = [...initialComponents];
    saveComponents();
  }
};

// Функция для сохранения изменений
const saveComponents = () => {
  PersistentStorage.save('components_v2', mockComponents);
};

// Выполняем проверку при загрузке
checkAndUpdateData();

// Принудительное обновление для добавления новых компонентов платежных систем
const forceUpdateComponents = () => {
  console.log('🔄 Принудительное обновление компонентов - добавляем платежные системы...');
  mockComponents = [...initialComponents];
  saveComponents();
};

// Активируем принудительное обновление (раскомментировать для обновления)
forceUpdateComponents();

// Mock API для компонентов с персистентным хранением
export const mockComponentsAPI = {
  async list(params: ListComponentsParams = {}): Promise<ListComponentsResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredComponents = [...mockComponents];
    
    // Фильтрация
    if (params.equipment_id) {
      filteredComponents = filteredComponents.filter(comp => comp.equipment_id === params.equipment_id);
    }
    
    if (params.status) {
      filteredComponents = filteredComponents.filter(comp => comp.status === params.status);
    }
    
    if (params.system_type) {
      filteredComponents = filteredComponents.filter(comp => comp.system_type === params.system_type);
    }
    
    if (params.category) {
      filteredComponents = filteredComponents.filter(comp => comp.category === params.category);
    }
    
    if (params.name) {
      filteredComponents = filteredComponents.filter(comp => comp.name === params.name);
    }
    
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredComponents = filteredComponents.filter(comp =>
        comp.display_name.toLowerCase().includes(searchLower) ||
        comp.serial_number?.toLowerCase().includes(searchLower)
      );
    }
    
    // Сортировка
    if (params.sort_by) {
      const sortBy = params.sort_by;
      const sortOrder = params.sort_order || 'asc';
      
      filteredComponents.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
          case 'display_name':
            valueA = a.display_name;
            valueB = b.display_name;
            break;
          case 'status':
            valueA = a.status;
            valueB = b.status;
            break;
          case 'created_at':
            valueA = a.created_at;
            valueB = b.created_at;
            break;
          case 'updated_at':
            valueA = a.updated_at;
            valueB = b.updated_at;
            break;
          default:
            return 0;
        }
        
        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Пагинация
    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = filteredComponents.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pageComponents = filteredComponents.slice(startIndex, endIndex);
    
    return {
      data: pageComponents,
      total,
      page,
      limit,
      total_pages
    };
  },

  async get(id: string): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const component = mockComponents.find(comp => comp.id === id);
    if (!component) {
      throw new ApiError(404, 'Component not found');
    }
    
    return component;
  },

  async create(data: CreateComponentRequest): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Получаем шаблон для копирования данных
    const template = componentTemplatesStore.getById(data.template_id);
    if (!template) {
      throw new ApiError(404, 'Component template not found');
    }
    
    // Создаем независимый экземпляр компонента
    const newComponent: Component = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trading_point_id: data.trading_point_id,
      equipment_id: data.equipment_id,
      
      // Копируем базовые данные из шаблона
      name: template.name,
      display_name: data.display_name,
      system_type: template.system_type,
      category: template.category,
      
      // Уникальные данные экземпляра
      serial_number: data.serial_number,
      status: 'online',
      
      // Объединяем параметры по умолчанию с кастомными
      params: {
        ...template.defaults,
        ...(data.custom_params || {})
      },
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_from_template: template.id // Только для истории
    };
    
    // Сохраняем новый компонент в localStorage
    mockComponents.push(newComponent);
    saveComponents();
    
    return newComponent;
  },

  async update(id: string, data: UpdateComponentRequest): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const componentIndex = mockComponents.findIndex(comp => comp.id === id);
    if (componentIndex === -1) {
      throw new ApiError(404, 'Component not found');
    }
    
    const updatedComponent = {
      ...mockComponents[componentIndex],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // Обновляем данные и сохраняем в localStorage
    mockComponents[componentIndex] = updatedComponent;
    saveComponents();
    
    return updatedComponent;
  },

  async updateStatus(id: string, action: ComponentStatusAction): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const componentIndex = mockComponents.findIndex(comp => comp.id === id);
    if (componentIndex === -1) {
      throw new ApiError(404, 'Component not found');
    }
    
    // Изменяем статус и сохраняем в localStorage
    let newStatus;
    switch (action) {
      case 'enable':
        newStatus = 'online';
        break;
      case 'disable':
        newStatus = 'disabled';
        break;
      case 'archive':
        newStatus = 'archived';
        break;
      default:
        throw new ApiError(400, 'Invalid status action');
    }
    
    const updatedComponent = {
      ...mockComponents[componentIndex],
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // Сохраняем изменения в localStorage
    mockComponents[componentIndex] = updatedComponent;
    saveComponents();
    
    return updatedComponent;
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const componentIndex = mockComponents.findIndex(comp => comp.id === id);
    if (componentIndex === -1) {
      throw new ApiError(404, 'Component not found');
    }

    // Удаляем компонент из массива
    mockComponents.splice(componentIndex, 1);
    saveComponents();
  }
};

// Экспорт API для компонентов
export const currentComponentsAPI = mockComponentsAPI;