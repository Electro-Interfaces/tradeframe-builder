/**
 * Сервис для работы с сообщениями, уведомлениями и оповещениями
 * Включает персистентное хранение в localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';

export type MessageType = 'chat' | 'system' | 'alert' | 'info' | 'warning' | 'error';
export type TicketStatus = 'new' | 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'unread' | 'read' | 'archived';
export type NotificationChannel = 'email' | 'telegram' | 'webhook' | 'sms' | 'push';
export type NotificationTrigger = 'equipment_status' | 'tank_level' | 'transaction' | 'workflow_completed' | 'shift_closed' | 'manual';

// ИНТЕРФЕЙСЫ ДЛЯ СООБЩЕНИЙ

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
  messageType: MessageType;
  replyToId?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'support' | 'admin';
  text: string;
  timestamp: string;
  attachments?: string[];
  isInternal?: boolean; // внутреннее сообщение для службы поддержки
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  tags?: string[];
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  messages: TicketMessage[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  responseTime?: number; // время первого ответа в минутах
  resolutionTime?: number; // время решения в минутах
  satisfaction?: number; // оценка от 1 до 5
  metadata?: Record<string, any>;
}

// ИНТЕРФЕЙСЫ ДЛЯ УВЕДОМЛЕНИЙ

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: TicketPriority;
  trigger: NotificationTrigger;
  conditions: Record<string, any>;
  channels: NotificationChannel[];
  recipients: string[];
  messageTemplate: string;
  cooldownMinutes?: number; // минимальный интервал между уведомлениями
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: {
    date: string;
    status: 'sent' | 'failed';
    message?: string;
  };
}

export interface Notification {
  id: string;
  ruleId?: string;
  title: string;
  message: string;
  type: MessageType;
  priority: TicketPriority;
  status: NotificationStatus;
  recipientId: string;
  recipientName: string;
  channel: NotificationChannel;
  triggerData?: Record<string, any>;
  sentAt?: string;
  readAt?: string;
  archivedAt?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// INPUT ТИПЫ

export interface ChatMessageInput {
  authorId: string;
  authorName: string;
  text: string;
  messageType?: MessageType;
  replyToId?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface SupportTicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
  tags?: string[];
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRuleInput {
  name: string;
  description?: string;
  isActive?: boolean;
  priority?: TicketPriority;
  trigger: NotificationTrigger;
  conditions: Record<string, any>;
  channels: NotificationChannel[];
  recipients: string[];
  messageTemplate: string;
  cooldownMinutes?: number;
  createdBy: string;
  createdByName: string;
}

export interface NotificationInput {
  title: string;
  message: string;
  type?: MessageType;
  priority?: TicketPriority;
  recipientId: string;
  recipientName: string;
  channel: NotificationChannel;
  ruleId?: string;
  triggerData?: Record<string, any>;
  metadata?: Record<string, any>;
}

// НАЧАЛЬНЫЕ ДАННЫЕ

const initialChatMessages: ChatMessage[] = [
  {
    id: "MSG-001",
    authorId: "1",
    authorName: "Администратор",
    text: "Добро пожаловать в корпоративный чат TradeFrame!",
    timestamp: "2024-08-30T09:00:00Z",
    isCurrentUser: false,
    messageType: "system",
    createdAt: new Date('2024-08-30T09:00:00Z'),
    updatedAt: new Date('2024-08-30T09:00:00Z')
  },
  {
    id: "MSG-002", 
    authorId: "2",
    authorName: "Елена Петрова",
    text: "Коллеги, на АЗС №003 проблемы с принтером чеков. Кто может помочь?",
    timestamp: "2024-08-30T10:15:00Z",
    isCurrentUser: false,
    messageType: "chat",
    createdAt: new Date('2024-08-30T10:15:00Z'),
    updatedAt: new Date('2024-08-30T10:15:00Z')
  },
  {
    id: "MSG-003",
    authorId: "3",
    authorName: "Иван Сидоров", 
    text: "Елена, создайте тикет в техподдержку. Я посмотрю удаленно.",
    timestamp: "2024-08-30T10:18:00Z",
    isCurrentUser: false,
    messageType: "chat",
    replyToId: "MSG-002",
    createdAt: new Date('2024-08-30T10:18:00Z'),
    updatedAt: new Date('2024-08-30T10:18:00Z')
  }
];

const initialTickets: SupportTicket[] = [
  {
    id: "TICKET-001",
    title: "Не работает принтер чеков",
    description: "На АЗС №003 принтер чеков выдает ошибку 'Paper Jam'. Бумага есть, но принтер не печатает.",
    priority: "high",
    status: "in_progress",
    category: "Оборудование",
    tags: ["принтер", "чеки", "АЗС-003"],
    createdBy: "2",
    createdByName: "Елена Петрова",
    assignedTo: "3",
    assignedToName: "Иван Сидоров",
    messages: [
      {
        id: "TMSG-001",
        ticketId: "TICKET-001",
        authorId: "2",
        authorName: "Елена Петрова",
        authorRole: "user",
        text: "Принтер начал глючить около часа назад. Перезагрузка не помогла.",
        timestamp: "2024-08-30T10:30:00Z",
        createdAt: new Date('2024-08-30T10:30:00Z')
      },
      {
        id: "TMSG-002",
        ticketId: "TICKET-001",
        authorId: "3", 
        authorName: "Иван Сидоров",
        authorRole: "support",
        text: "Проверьте, не застряла ли бумага внутри. Также попробуйте заменить рулон бумаги.",
        timestamp: "2024-08-30T10:45:00Z",
        createdAt: new Date('2024-08-30T10:45:00Z')
      }
    ],
    createdAt: new Date('2024-08-30T10:25:00Z'),
    updatedAt: new Date('2024-08-30T10:45:00Z'),
    responseTime: 15
  },
  {
    id: "TICKET-002",
    title: "Некорректные показания уровня топлива",
    description: "Датчик уровня в резервуаре №1 показывает неправильные значения",
    priority: "medium",
    status: "open",
    category: "Датчики",
    tags: ["датчик", "уровень", "резервуар"],
    createdBy: "4",
    createdByName: "Мария Козлова",
    messages: [
      {
        id: "TMSG-003",
        ticketId: "TICKET-002",
        authorId: "4",
        authorName: "Мария Козлова",
        authorRole: "user",
        text: "Показания датчика отличаются от ручных замеров на 200 литров",
        timestamp: "2024-08-30T14:20:00Z",
        createdAt: new Date('2024-08-30T14:20:00Z')
      }
    ],
    createdAt: new Date('2024-08-30T14:15:00Z'),
    updatedAt: new Date('2024-08-30T14:20:00Z')
  }
];

const initialNotificationRules: NotificationRule[] = [
  {
    id: "RULE-001",
    name: "Низкий уровень топлива",
    description: "Уведомление при критически низком уровне топлива в резервуаре",
    isActive: true,
    priority: "high",
    trigger: "tank_level",
    conditions: {
      level: "low",
      threshold: 500,
      fuelTypes: ["АИ-95", "АИ-92", "ДТ"]
    },
    channels: ["email", "telegram"],
    recipients: ["manager@demo-azs.ru", "@admin_telegram"],
    messageTemplate: "🚨 Критически низкий уровень топлива!\n\nРезервуар: {tankNumber}\nТопливо: {fuelType}\nОстаток: {level} л\nТочка: {tradingPointName}",
    cooldownMinutes: 60,
    createdBy: "1",
    createdByName: "Администратор",
    createdAt: new Date('2024-08-25T10:00:00Z'),
    updatedAt: new Date('2024-08-25T10:00:00Z'),
    lastTriggered: {
      date: "2024-08-30T08:30:00Z",
      status: "sent"
    }
  },
  {
    id: "RULE-002",
    name: "Ошибка оборудования",
    description: "Уведомление о критических ошибках оборудования",
    isActive: true,
    priority: "critical",
    trigger: "equipment_status",
    conditions: {
      status: "error",
      errorLevel: "critical",
      equipmentTypes: ["pump", "pos", "printer"]
    },
    channels: ["email", "telegram", "sms"],
    recipients: ["tech@demo-azs.ru", "@tech_support", "+79123456789"],
    messageTemplate: "🔥 КРИТИЧЕСКАЯ ОШИБКА ОБОРУДОВАНИЯ!\n\nОборудование: {equipmentName}\nОшибка: {errorMessage}\nВремя: {timestamp}\nТочка: {tradingPointName}\n\nТребуется немедленное вмешательство!",
    cooldownMinutes: 15,
    createdBy: "1",
    createdByName: "Администратор", 
    createdAt: new Date('2024-08-20T15:00:00Z'),
    updatedAt: new Date('2024-08-20T15:00:00Z')
  },
  {
    id: "RULE-003",
    name: "Завершение смены",
    description: "Уведомление о закрытии смены и итогах",
    isActive: true,
    priority: "info",
    trigger: "shift_closed",
    conditions: {
      minRevenue: 50000 // в копейках
    },
    channels: ["email"],
    recipients: ["manager@demo-azs.ru", "accounting@demo-azs.ru"],
    messageTemplate: "📊 Смена закрыта\n\nСмена: #{shiftNumber}\nОператор: {operatorName}\nВыручка: {totalRevenue} руб.\nОбъем: {totalVolume} л\nТочка: {tradingPointName}",
    cooldownMinutes: 1,
    createdBy: "2",
    createdByName: "Елена Петрова",
    createdAt: new Date('2024-08-28T12:00:00Z'),
    updatedAt: new Date('2024-08-28T12:00:00Z')
  }
];

const initialNotifications: Notification[] = [
  {
    id: "NOTIF-001",
    ruleId: "RULE-001",
    title: "Низкий уровень АИ-95",
    message: "Критически низкий уровень топлива в резервуаре №1 на АЗС №001. Остаток: 450 л",
    type: "warning",
    priority: "high",
    status: "read",
    recipientId: "2",
    recipientName: "Елена Петрова",
    channel: "email",
    triggerData: {
      tankNumber: "1",
      fuelType: "АИ-95", 
      level: 450,
      tradingPointId: "point1",
      tradingPointName: "АЗС №001 - Центральная"
    },
    sentAt: "2024-08-30T08:30:00Z",
    readAt: "2024-08-30T08:45:00Z",
    createdAt: new Date('2024-08-30T08:30:00Z'),
    updatedAt: new Date('2024-08-30T08:45:00Z')
  },
  {
    id: "NOTIF-002",
    ruleId: "RULE-002",
    title: "Ошибка принтера чеков",
    message: "Критическая ошибка принтера чеков на АЗС №003. Требуется немедленное вмешательство!",
    type: "error",
    priority: "critical", 
    status: "unread",
    recipientId: "3",
    recipientName: "Иван Сидоров",
    channel: "telegram",
    triggerData: {
      equipmentId: "EQ-003",
      equipmentName: "Принтер чеков ThermalPrint-58",
      errorCode: "PAPER_JAM",
      errorMessage: "Замятие бумаги",
      tradingPointId: "point3",
      tradingPointName: "АЗС №003 - Южная"
    },
    sentAt: "2024-08-30T10:25:00Z",
    createdAt: new Date('2024-08-30T10:25:00Z'),
    updatedAt: new Date('2024-08-30T10:25:00Z')
  },
  {
    id: "NOTIF-003",
    title: "Системное обновление",
    message: "Запланировано обновление системы на 31.08.2024 в 02:00. Ожидаемое время простоя: 30 минут.",
    type: "info",
    priority: "low",
    status: "read",
    recipientId: "1",
    recipientName: "Администратор",
    channel: "email",
    sentAt: "2024-08-29T18:00:00Z",
    readAt: "2024-08-29T18:15:00Z",
    createdAt: new Date('2024-08-29T18:00:00Z'),
    updatedAt: new Date('2024-08-29T18:15:00Z')
  }
];

// Загружаем данные из localStorage
let chatMessagesData: ChatMessage[] = PersistentStorage.load<ChatMessage>('chatMessages', initialChatMessages);
let ticketsData: SupportTicket[] = PersistentStorage.load<SupportTicket>('supportTickets', initialTickets);
let notificationRulesData: NotificationRule[] = PersistentStorage.load<NotificationRule>('notificationRules', initialNotificationRules);
let notificationsData: Notification[] = PersistentStorage.load<Notification>('notifications', initialNotifications);

let nextChatMessageId = Math.max(...chatMessagesData.map(msg => parseInt(msg.id.replace('MSG-', '')) || 0)) + 1;
let nextTicketId = Math.max(...ticketsData.map(t => parseInt(t.id.replace('TICKET-', '')) || 0)) + 1;
let nextTicketMessageId = Math.max(...ticketsData.flatMap(t => t.messages.map(m => parseInt(m.id.replace('TMSG-', '')) || 0))) + 1;
let nextRuleId = Math.max(...notificationRulesData.map(r => parseInt(r.id.replace('RULE-', '')) || 0)) + 1;
let nextNotificationId = Math.max(...notificationsData.map(n => parseInt(n.id.replace('NOTIF-', '')) || 0)) + 1;

// Функции для сохранения изменений
const saveChatMessages = () => {
  PersistentStorage.save('chatMessages', chatMessagesData);
};

const saveTickets = () => {
  PersistentStorage.save('supportTickets', ticketsData);
};

const saveNotificationRules = () => {
  PersistentStorage.save('notificationRules', notificationRulesData);
};

const saveNotifications = () => {
  PersistentStorage.save('notifications', notificationsData);
};

// API сервис сообщений с персистентным хранением
export const messagesService = {
  // ====== ЧАТ СООБЩЕНИЯ ======

  // Получить все сообщения чата
  async getAllChatMessages(): Promise<ChatMessage[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...chatMessagesData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  // Отправить сообщение в чат
  async sendChatMessage(input: ChatMessageInput): Promise<ChatMessage> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newMessage: ChatMessage = {
      id: `MSG-${String(nextChatMessageId++).padStart(3, '0')}`,
      authorId: input.authorId,
      authorName: input.authorName,
      text: input.text,
      timestamp: new Date().toISOString(),
      isCurrentUser: false, // будет установлено на клиенте
      messageType: input.messageType || 'chat',
      replyToId: input.replyToId,
      attachments: input.attachments,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    chatMessagesData.push(newMessage);
    saveChatMessages();
    
    return newMessage;
  },

  // ====== ТИКЕТЫ ПОДДЕРЖКИ ======

  // Получить все тикеты
  async getAllTickets(): Promise<SupportTicket[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...ticketsData].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // Получить тикет по ID
  async getTicketById(id: string): Promise<SupportTicket | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return ticketsData.find(t => t.id === id) || null;
  },

  // Создать тикет
  async createTicket(input: SupportTicketInput): Promise<SupportTicket> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const newTicket: SupportTicket = {
      id: `TICKET-${String(nextTicketId++).padStart(3, '0')}`,
      title: input.title,
      description: input.description,
      priority: input.priority || 'medium',
      status: 'new',
      category: input.category,
      tags: input.tags || [],
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      assignedTo: input.assignedTo,
      assignedToName: input.assignedToName,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: input.metadata
    };

    ticketsData.push(newTicket);
    saveTickets();
    
    return newTicket;
  },

  // Добавить сообщение к тикету
  async addTicketMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'ticketId' | 'createdAt'>): Promise<TicketMessage | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const ticket = ticketsData.find(t => t.id === ticketId);
    if (!ticket) return null;
    
    const newMessage: TicketMessage = {
      id: `TMSG-${String(nextTicketMessageId++).padStart(3, '0')}`,
      ticketId,
      authorId: message.authorId,
      authorName: message.authorName,
      authorRole: message.authorRole,
      text: message.text,
      timestamp: new Date().toISOString(),
      attachments: message.attachments,
      isInternal: message.isInternal,
      metadata: message.metadata,
      createdAt: new Date()
    };
    
    ticket.messages.push(newMessage);
    ticket.updatedAt = new Date();
    
    // Обновляем статус на "в работе" при первом ответе поддержки
    if (ticket.status === 'new' && message.authorRole === 'support') {
      ticket.status = 'in_progress';
    }
    
    saveTickets();
    
    return newMessage;
  },

  // Обновить статус тикета
  async updateTicketStatus(id: string, status: TicketStatus): Promise<SupportTicket | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const ticket = ticketsData.find(t => t.id === id);
    if (!ticket) return null;
    
    ticket.status = status;
    ticket.updatedAt = new Date();
    
    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (status === 'closed') {
      ticket.closedAt = new Date();
    }
    
    saveTickets();
    
    return ticket;
  },

  // ====== ПРАВИЛА УВЕДОМЛЕНИЙ ======

  // Получить все правила
  async getAllNotificationRules(): Promise<NotificationRule[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return [...notificationRulesData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Создать правило уведомления
  async createNotificationRule(input: NotificationRuleInput): Promise<NotificationRule> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const newRule: NotificationRule = {
      id: `RULE-${String(nextRuleId++).padStart(3, '0')}`,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      priority: input.priority || 'medium',
      trigger: input.trigger,
      conditions: input.conditions,
      channels: input.channels,
      recipients: input.recipients,
      messageTemplate: input.messageTemplate,
      cooldownMinutes: input.cooldownMinutes,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    notificationRulesData.push(newRule);
    saveNotificationRules();
    
    return newRule;
  },

  // ====== УВЕДОМЛЕНИЯ ======

  // Получить все уведомления
  async getAllNotifications(): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return [...notificationsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Получить уведомления пользователя
  async getNotificationsByRecipient(recipientId: string): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return notificationsData
      .filter(n => n.recipientId === recipientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Создать уведомление
  async createNotification(input: NotificationInput): Promise<Notification> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newNotification: Notification = {
      id: `NOTIF-${String(nextNotificationId++).padStart(3, '0')}`,
      ruleId: input.ruleId,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
      priority: input.priority || 'medium',
      status: 'unread',
      recipientId: input.recipientId,
      recipientName: input.recipientName,
      channel: input.channel,
      triggerData: input.triggerData,
      sentAt: new Date().toISOString(),
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    notificationsData.push(newNotification);
    saveNotifications();
    
    return newNotification;
  },

  // Отметить уведомление как прочитанное
  async markNotificationAsRead(id: string): Promise<Notification | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const notification = notificationsData.find(n => n.id === id);
    if (!notification) return null;
    
    if (notification.status === 'unread') {
      notification.status = 'read';
      notification.readAt = new Date().toISOString();
      notification.updatedAt = new Date();
      
      saveNotifications();
    }
    
    return notification;
  },

  // Получить статистику
  async getStatistics(): Promise<{
    totalMessages: number;
    totalTickets: number;
    ticketsByStatus: Record<TicketStatus, number>;
    ticketsByPriority: Record<TicketPriority, number>;
    totalNotifications: number;
    unreadNotifications: number;
    activeRules: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const totalMessages = chatMessagesData.length;
    const totalTickets = ticketsData.length;
    
    const ticketsByStatus = ticketsData.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<TicketStatus, number>);
    
    const ticketsByPriority = ticketsData.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {} as Record<TicketPriority, number>);
    
    const totalNotifications = notificationsData.length;
    const unreadNotifications = notificationsData.filter(n => n.status === 'unread').length;
    const activeRules = notificationRulesData.filter(r => r.isActive).length;
    
    return {
      totalMessages,
      totalTickets,
      ticketsByStatus,
      ticketsByPriority,
      totalNotifications,
      unreadNotifications,
      activeRules
    };
  }
};

// Экспорт store для обратной совместимости
export const messagesStore = {
  getAllChatMessages: (): ChatMessage[] => [...chatMessagesData],
  getAllTickets: (): SupportTicket[] => [...ticketsData],
  getAllNotifications: (): Notification[] => [...notificationsData],
  getAllNotificationRules: (): NotificationRule[] => [...notificationRulesData],
  
  getTicketById: (id: string): SupportTicket | undefined => 
    ticketsData.find(t => t.id === id),
    
  updateTicket: (id: string, updates: Partial<SupportTicket>): SupportTicket | null => {
    const index = ticketsData.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    ticketsData[index] = {
      ...ticketsData[index],
      ...updates,
      updatedAt: new Date()
    };
    
    saveTickets();
    return ticketsData[index];
  }
};