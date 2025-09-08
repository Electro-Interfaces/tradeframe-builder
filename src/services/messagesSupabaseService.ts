/**
 * Messages Supabase Service - Прямая работа с базой данных
 * УПРОЩЕН: Убраны все executeSupabaseOperation обертки
 * Прямые вызовы Supabase с четкими ошибками
 */

import { supabaseClientBrowser } from './supabaseClientBrowser';
import {
  MessageType,
  TicketStatus,
  TicketPriority,
  NotificationStatus,
  NotificationChannel,
  NotificationTrigger,
  ChatMessage,
  TicketMessage,
  SupportTicket,
  NotificationRule,
  Notification,
  ChatMessageInput,
  SupportTicketInput,
  NotificationRuleInput,
  NotificationInput
} from './messagesService';

// Интерфейсы для работы с Supabase
interface SupabaseChatMessage {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  text: string;
  timestamp: string;
  message_type: MessageType;
  reply_to_id?: string;
  attachments?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface SupabaseTicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  author_role: 'user' | 'support' | 'admin';
  text: string;
  timestamp: string;
  attachments?: string[];
  is_internal?: boolean;
  metadata?: any;
  created_at: string;
}

interface SupabaseSupportTicket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  tags?: string[];
  created_by: string;
  created_by_name: string;
  assigned_to?: string;
  assigned_to_name?: string;
  response_time?: number;
  resolution_time?: number;
  satisfaction?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

interface SupabaseNotificationRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  priority: TicketPriority;
  trigger: NotificationTrigger;
  conditions: any;
  channels: NotificationChannel[];
  recipients: string[];
  message_template: string;
  cooldown_minutes?: number;
  created_by: string;
  created_by_name: string;
  last_triggered_date?: string;
  last_triggered_status?: 'sent' | 'failed';
  last_triggered_message?: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseNotification {
  id: string;
  rule_id?: string;
  title: string;
  message: string;
  type: MessageType;
  priority: TicketPriority;
  status: NotificationStatus;
  recipient_id: string;
  recipient_name: string;
  channel: NotificationChannel;
  trigger_data?: any;
  sent_at?: string;
  read_at?: string;
  archived_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

class MessagesSupabaseService {
  // ====== ЧАТ СООБЩЕНИЯ ======

  async getAllChatMessages(): Promise<ChatMessage[]> {
    console.log('🔍 MessagesSupabaseService.getAllChatMessages() called');
    
    const { data, error } = await supabaseClientBrowser
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ Database error loading chat messages:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Loaded chat messages from Supabase:', data?.length || 0);
    return (data || []).map(this.transformSupabaseToChatMessage);
  }

  async sendChatMessage(input: ChatMessageInput): Promise<ChatMessage> {
    console.log('📤 MessagesSupabaseService.sendChatMessage() called');
    try {
      const supabaseData: Partial<SupabaseChatMessage> = {
        author_id: input.authorId,
        author_name: input.authorName,
        text: input.text,
        timestamp: new Date().toISOString(),
        message_type: input.messageType || 'chat',
        reply_to_id: input.replyToId,
        attachments: input.attachments,
        metadata: input.metadata
      };

      const { data, error } = await supabaseClientBrowser
        .from('chat_messages')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      return this.transformSupabaseToChatMessage(data);
    } catch (error) {
      console.error('❌ MessagesSupabaseService.sendChatMessage error:', error);
      throw error;
    }
  }

  // ====== ТИКЕТЫ ПОДДЕРЖКИ ======

  async getAllTickets(): Promise<SupportTicket[]> {
    console.log('🔍 MessagesSupabaseService.getAllTickets() called');
    
    const { data: ticketsData, error: ticketsError } = await supabaseClientBrowser
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (ticketsError) {
      console.error('❌ Database error loading tickets:', ticketsError);
      throw new Error(`Database unavailable: ${ticketsError.message}`);
    }

    const { data: messagesData, error: messagesError } = await supabaseClientBrowser
      .from('ticket_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('❌ Database error loading ticket messages:', messagesError);
      throw new Error(`Database unavailable: ${messagesError.message}`);
    }

        console.log('✅ Loaded tickets from Supabase:', ticketsData?.length || 0);
        
        // Группируем сообщения по тикетам
        const messagesByTicket = (messagesData || []).reduce((acc, msg) => {
          if (!acc[msg.ticket_id]) acc[msg.ticket_id] = [];
          acc[msg.ticket_id].push(this.transformSupabaseToTicketMessage(msg));
          return acc;
        }, {} as Record<string, TicketMessage[]>);

    // Собираем тикеты с сообщениями
    console.log('✅ Loaded support tickets from Supabase:', ticketsData?.length || 0);
    return (ticketsData || []).map(ticket => ({
      ...this.transformSupabaseToSupportTicket(ticket),
      messages: messagesByTicket[ticket.id] || []
    }));
  }

  async getTicketById(id: string): Promise<SupportTicket | null> {
    try {
      const { data: ticketData, error: ticketError } = await supabaseClientBrowser
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketError) {
        if (ticketError.code === 'PGRST116') return null;
        throw ticketError;
      }

      const { data: messagesData, error: messagesError } = await supabaseClientBrowser
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const ticket = this.transformSupabaseToSupportTicket(ticketData);
      ticket.messages = (messagesData || []).map(this.transformSupabaseToTicketMessage);

      return ticket;
    } catch (error) {
      console.error(`❌ MessagesSupabaseService.getTicketById(${id}) error:`, error);
      return null;
    }
  }

  async createTicket(input: SupportTicketInput): Promise<SupportTicket> {
    try {
      const supabaseData: Partial<SupabaseSupportTicket> = {
        title: input.title,
        description: input.description,
        priority: input.priority || 'medium',
        status: 'new',
        category: input.category,
        tags: input.tags || [],
        created_by: input.createdBy,
        created_by_name: input.createdByName,
        assigned_to: input.assignedTo,
        assigned_to_name: input.assignedToName,
        metadata: input.metadata
      };

      const { data, error } = await supabaseClientBrowser
        .from('support_tickets')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      return {
        ...this.transformSupabaseToSupportTicket(data),
        messages: []
      };
    } catch (error) {
      console.error('❌ MessagesSupabaseService.createTicket error:', error);
      throw error;
    }
  }

  async addTicketMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'ticketId' | 'createdAt'>): Promise<TicketMessage | null> {
    try {
      const supabaseData: Partial<SupabaseTicketMessage> = {
        ticket_id: ticketId,
        author_id: message.authorId,
        author_name: message.authorName,
        author_role: message.authorRole,
        text: message.text,
        timestamp: new Date().toISOString(),
        attachments: message.attachments,
        is_internal: message.isInternal,
        metadata: message.metadata
      };

      const { data, error } = await supabaseClientBrowser
        .from('ticket_messages')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      // Обновляем статус тикета при первом ответе поддержки
      if (message.authorRole === 'support') {
        await supabaseClientBrowser
          .from('support_tickets')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId)
          .eq('status', 'new');
      } else {
        // Просто обновляем время последнего изменения
        await supabaseClientBrowser
          .from('support_tickets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }

      return this.transformSupabaseToTicketMessage(data);
    } catch (error) {
      console.error('❌ MessagesSupabaseService.addTicketMessage error:', error);
      return null;
    }
  }

  async updateTicketStatus(id: string, status: TicketStatus): Promise<SupportTicket | null> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabaseClientBrowser
        .from('support_tickets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Получаем сообщения тикета
      const { data: messagesData } = await supabaseClientBrowser
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      const ticket = this.transformSupabaseToSupportTicket(data);
      ticket.messages = (messagesData || []).map(this.transformSupabaseToTicketMessage);

      return ticket;
    } catch (error) {
      console.error(`❌ MessagesSupabaseService.updateTicketStatus(${id}) error:`, error);
      return null;
    }
  }

  // ====== ПРАВИЛА УВЕДОМЛЕНИЙ ======

  async getAllNotificationRules(): Promise<NotificationRule[]> {
    console.log('🔍 MessagesSupabaseService.getAllNotificationRules() called');
    
    const { data, error } = await supabaseClientBrowser
      .from('notification_rules')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Database error loading notification rules:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Loaded notification rules from Supabase:', data?.length || 0);
    return (data || []).map(this.transformSupabaseToNotificationRule);
  }

  async createNotificationRule(input: NotificationRuleInput): Promise<NotificationRule> {
    try {
      const supabaseData: Partial<SupabaseNotificationRule> = {
        name: input.name,
        description: input.description,
        is_active: input.isActive ?? true,
        priority: input.priority || 'medium',
        trigger: input.trigger,
        conditions: input.conditions,
        channels: input.channels,
        recipients: input.recipients,
        message_template: input.messageTemplate,
        cooldown_minutes: input.cooldownMinutes,
        created_by: input.createdBy,
        created_by_name: input.createdByName
      };

      const { data, error } = await supabaseClientBrowser
        .from('notification_rules')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      return this.transformSupabaseToNotificationRule(data);
    } catch (error) {
      console.error('❌ MessagesSupabaseService.createNotificationRule error:', error);
      throw error;
    }
  }

  // ====== УВЕДОМЛЕНИЯ ======

  async getAllNotifications(): Promise<Notification[]> {
    console.log('🔍 MessagesSupabaseService.getAllNotifications() called');
    try {
      const { data, error } = await supabaseClientBrowser
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Loaded notifications from Supabase:', data?.length || 0);
      return (data || []).map(this.transformSupabaseToNotification);
    } catch (error) {
      console.error('❌ MessagesSupabaseService.getAllNotifications error:', error);
      throw error;
    }
  }

  async getNotificationsByRecipient(recipientId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('notifications')
        .select('*')
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformSupabaseToNotification);
    } catch (error) {
      console.error(`❌ MessagesSupabaseService.getNotificationsByRecipient(${recipientId}) error:`, error);
      return [];
    }
  }

  async createNotification(input: NotificationInput): Promise<Notification> {
    try {
      const supabaseData: Partial<SupabaseNotification> = {
        rule_id: input.ruleId,
        title: input.title,
        message: input.message,
        type: input.type || 'info',
        priority: input.priority || 'medium',
        status: 'unread',
        recipient_id: input.recipientId,
        recipient_name: input.recipientName,
        channel: input.channel,
        trigger_data: input.triggerData,
        sent_at: new Date().toISOString(),
        metadata: input.metadata
      };

      const { data, error } = await supabaseClientBrowser
        .from('notifications')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      return this.transformSupabaseToNotification(data);
    } catch (error) {
      console.error('❌ MessagesSupabaseService.createNotification error:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id: string): Promise<Notification | null> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'unread') // Только если еще не прочитано
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Не найдено или уже прочитано
        throw error;
      }

      return this.transformSupabaseToNotification(data);
    } catch (error) {
      console.error(`❌ MessagesSupabaseService.markNotificationAsRead(${id}) error:`, error);
      return null;
    }
  }

  async getStatistics(): Promise<{
    totalMessages: number;
    totalTickets: number;
    ticketsByStatus: Record<TicketStatus, number>;
    ticketsByPriority: Record<TicketPriority, number>;
    totalNotifications: number;
    unreadNotifications: number;
    activeRules: number;
  }> {
    try {
      const [messagesResult, ticketsResult, notificationsResult, rulesResult] = await Promise.all([
        supabaseClientBrowser.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabaseClientBrowser.from('support_tickets').select('status, priority'),
        supabaseClientBrowser.from('notifications').select('status'),
        supabaseClientBrowser.from('notification_rules').select('is_active')
      ]);

      const totalMessages = messagesResult.count || 0;
      const totalTickets = ticketsResult.data?.length || 0;

      const ticketsByStatus = (ticketsResult.data || []).reduce((acc, ticket) => {
        acc[ticket.status as TicketStatus] = (acc[ticket.status as TicketStatus] || 0) + 1;
        return acc;
      }, {} as Record<TicketStatus, number>);

      const ticketsByPriority = (ticketsResult.data || []).reduce((acc, ticket) => {
        acc[ticket.priority as TicketPriority] = (acc[ticket.priority as TicketPriority] || 0) + 1;
        return acc;
      }, {} as Record<TicketPriority, number>);

      const totalNotifications = notificationsResult.data?.length || 0;
      const unreadNotifications = (notificationsResult.data || []).filter(n => n.status === 'unread').length;
      const activeRules = (rulesResult.data || []).filter(r => r.is_active).length;

      return {
        totalMessages,
        totalTickets,
        ticketsByStatus,
        ticketsByPriority,
        totalNotifications,
        unreadNotifications,
        activeRules
      };
    } catch (error) {
      console.error('❌ MessagesSupabaseService.getStatistics error:', error);
      return {
        totalMessages: 0,
        totalTickets: 0,
        ticketsByStatus: {} as Record<TicketStatus, number>,
        ticketsByPriority: {} as Record<TicketPriority, number>,
        totalNotifications: 0,
        unreadNotifications: 0,
        activeRules: 0
      };
    }
  }

  // ====== ПРИВАТНЫЕ МЕТОДЫ ТРАНСФОРМАЦИИ ======

  private transformSupabaseToChatMessage(data: SupabaseChatMessage): ChatMessage {
    return {
      id: data.id,
      authorId: data.author_id,
      authorName: data.author_name,
      authorAvatar: data.author_avatar,
      text: data.text,
      timestamp: data.timestamp,
      isCurrentUser: false, // будет установлено на клиенте
      messageType: data.message_type,
      replyToId: data.reply_to_id,
      attachments: data.attachments,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private transformSupabaseToTicketMessage(data: SupabaseTicketMessage): TicketMessage {
    return {
      id: data.id,
      ticketId: data.ticket_id,
      authorId: data.author_id,
      authorName: data.author_name,
      authorRole: data.author_role,
      text: data.text,
      timestamp: data.timestamp,
      attachments: data.attachments,
      isInternal: data.is_internal,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    };
  }

  private transformSupabaseToSupportTicket(data: SupabaseSupportTicket): SupportTicket {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      category: data.category,
      tags: data.tags || [],
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      assignedTo: data.assigned_to,
      assignedToName: data.assigned_to_name,
      messages: [], // будут заполнены в вызывающем коде
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      responseTime: data.response_time,
      resolutionTime: data.resolution_time,
      satisfaction: data.satisfaction,
      metadata: data.metadata
    };
  }

  private transformSupabaseToNotificationRule(data: SupabaseNotificationRule): NotificationRule {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      priority: data.priority,
      trigger: data.trigger,
      conditions: data.conditions,
      channels: data.channels,
      recipients: data.recipients,
      messageTemplate: data.message_template,
      cooldownMinutes: data.cooldown_minutes,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastTriggered: data.last_triggered_date ? {
        date: data.last_triggered_date,
        status: data.last_triggered_status || 'sent',
        message: data.last_triggered_message
      } : undefined
    };
  }

  private transformSupabaseToNotification(data: SupabaseNotification): Notification {
    return {
      id: data.id,
      ruleId: data.rule_id,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      status: data.status,
      recipientId: data.recipient_id,
      recipientName: data.recipient_name,
      channel: data.channel,
      triggerData: data.trigger_data,
      sentAt: data.sent_at,
      readAt: data.read_at,
      archivedAt: data.archived_at,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Создаем singleton экземпляр
export const messagesSupabaseService = new MessagesSupabaseService();

// Создаем совместимую обертку для старого API
export const messagesService = {
  async getAllChatMessages() {
    return await messagesSupabaseService.getAllChatMessages();
  },

  async sendChatMessage(input: ChatMessageInput) {
    return await messagesSupabaseService.sendChatMessage(input);
  },

  async getAllTickets() {
    return await messagesSupabaseService.getAllTickets();
  },

  async getTicketById(id: string) {
    return await messagesSupabaseService.getTicketById(id);
  },

  async createTicket(input: SupportTicketInput) {
    return await messagesSupabaseService.createTicket(input);
  },

  async addTicketMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'ticketId' | 'createdAt'>) {
    return await messagesSupabaseService.addTicketMessage(ticketId, message);
  },

  async updateTicketStatus(id: string, status: TicketStatus) {
    return await messagesSupabaseService.updateTicketStatus(id, status);
  },

  async getAllNotificationRules() {
    return await messagesSupabaseService.getAllNotificationRules();
  },

  async createNotificationRule(input: NotificationRuleInput) {
    return await messagesSupabaseService.createNotificationRule(input);
  },

  async getAllNotifications() {
    return await messagesSupabaseService.getAllNotifications();
  },

  async getNotificationsByRecipient(recipientId: string) {
    return await messagesSupabaseService.getNotificationsByRecipient(recipientId);
  },

  async createNotification(input: NotificationInput) {
    return await messagesSupabaseService.createNotification(input);
  },

  async markNotificationAsRead(id: string) {
    return await messagesSupabaseService.markNotificationAsRead(id);
  },

  async getStatistics() {
    return await messagesSupabaseService.getStatistics();
  }
};