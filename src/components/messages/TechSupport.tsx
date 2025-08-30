import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, MessageSquare, Clock, User, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

interface TicketMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'support';
  text: string;
  timestamp: string;
  attachments?: string[];
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  assignedTo?: string;
}

const mockTickets: SupportTicket[] = [
  {
    id: "ticket-1",
    title: "Проблемы с синхронизацией данных",
    description: "Данные о продажах не синхронизируются с центральной системой уже 2 часа",
    priority: "high",
    status: "in_progress",
    createdAt: "2024-08-30T08:00:00Z",
    updatedAt: "2024-08-30T10:30:00Z",
    assignedTo: "Техподдержка TradeControl",
    messages: [
      {
        id: "msg-1",
        authorId: "user-1",
        authorName: "Анна Петрова",
        authorRole: "user",
        text: "Здравствуйте! У нас проблемы с синхронизацией данных о продажах. Уже 2 часа данные не поступают в центральную систему. Это критично для работы.",
        timestamp: "2024-08-30T08:00:00Z"
      },
      {
        id: "msg-2",
        authorId: "support-1",
        authorName: "Михаил Поддержкин",
        authorRole: "support",
        text: "Здравствуйте! Принял вашу заявку в работу. Проверяю состояние серверов синхронизации. Ожидайте обновления в течение 30 минут.",
        timestamp: "2024-08-30T08:15:00Z"
      },
      {
        id: "msg-3",
        authorId: "support-1",
        authorName: "Михаил Поддержкин",
        authorRole: "support",
        text: "Обнаружили проблему с одним из серверов синхронизации. Производим перезапуск сервисов. Синхронизация должна восстановиться в течение 15 минут.",
        timestamp: "2024-08-30T10:30:00Z"
      }
    ]
  },
  {
    id: "ticket-2",
    title: "Запрос новой функции: экспорт отчетов в Excel",
    description: "Нужна возможность экспортировать отчеты о продажах в формате Excel",
    priority: "medium",
    status: "waiting_response",
    createdAt: "2024-08-29T14:20:00Z",
    updatedAt: "2024-08-29T16:45:00Z",
    assignedTo: "Продуктовая команда",
    messages: [
      {
        id: "msg-4",
        authorId: "user-2",
        authorName: "Иван Сидоров",
        authorRole: "user",
        text: "Здравствуйте! Хотелось бы добавить функцию экспорта отчетов в Excel. Это сильно упростит работу с данными для финансового отдела.",
        timestamp: "2024-08-29T14:20:00Z"
      },
      {
        id: "msg-5",
        authorId: "support-2",
        authorName: "Елена Продуктова",
        authorRole: "support",
        text: "Спасибо за предложение! Это действительно полезная функция. Передам ваш запрос команде разработки для оценки. Можете уточнить, какие именно отчеты вам нужны в Excel?",
        timestamp: "2024-08-29T15:30:00Z"
      }
    ]
  },
  {
    id: "ticket-3",
    title: "Не работает мобильная версия",
    description: "На мобильном устройстве не загружается интерфейс управления ценами",
    priority: "medium",
    status: "resolved",
    createdAt: "2024-08-28T11:10:00Z",
    updatedAt: "2024-08-28T17:20:00Z",
    assignedTo: "Техподдержка TradeControl",
    messages: [
      {
        id: "msg-6",
        authorId: "user-3",
        authorName: "Мария Козлова",
        authorRole: "user",
        text: "На телефоне не работает раздел управления ценами. Страница загружается, но кнопки не реагируют на нажатия.",
        timestamp: "2024-08-28T11:10:00Z"
      },
      {
        id: "msg-7",
        authorId: "support-1",
        authorName: "Михаил Поддержкин",
        authorRole: "support",
        text: "Спасибо за сообщение! Воспроизвел проблему. Это связано с последним обновлением. Передаю разработчикам для исправления.",
        timestamp: "2024-08-28T11:45:00Z"
      },
      {
        id: "msg-8",
        authorId: "support-1",
        authorName: "Михаил Поддержкин",
        authorRole: "support",
        text: "Проблема исправлена! Пожалуйста, обновите страницу в браузере. Мобильная версия должна работать корректно.",
        timestamp: "2024-08-28T17:20:00Z"
      }
    ]
  }
];

const createTicketSchema = z.object({
  title: z.string().min(1, "Тема обязательна"),
  description: z.string().min(10, "Описание должно быть не менее 10 символов"),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

export function TechSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(tickets[0]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const getStatusBadge = (status: SupportTicket['status']) => {
    const statusConfig = {
      open: { label: "Открыт", color: "bg-blue-100 text-blue-800 border-blue-200", icon: MessageSquare },
      in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
      waiting_response: { label: "Ожидает ответа", color: "bg-purple-100 text-purple-800 border-purple-200", icon: User },
      resolved: { label: "Решен", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      closed: { label: "Закрыт", color: "bg-gray-100 text-gray-800 border-gray-200", icon: XCircle }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const priorityConfig = {
      low: { label: "Низкий", color: "bg-gray-100 text-gray-800 border-gray-200" },
      medium: { label: "Средний", color: "bg-blue-100 text-blue-800 border-blue-200" },
      high: { label: "Высокий", color: "bg-orange-100 text-orange-800 border-orange-200" },
      critical: { label: "Критический", color: "bg-red-100 text-red-800 border-red-200" }
    };
    
    const config = priorityConfig[priority];
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTicket = (data: CreateTicketFormData) => {
    const newTicket: SupportTicket = {
      id: `ticket-${Date.now()}`,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          authorId: "current-user",
          authorName: "Анна Петрова",
          authorRole: "user",
          text: data.description,
          timestamp: new Date().toISOString()
        }
      ]
    };

    setTickets(prev => [newTicket, ...prev]);
    setSelectedTicket(newTicket);
    setIsCreateDialogOpen(false);
    form.reset();
    
    toast({
      title: "Заявка создана",
      description: "Ваша заявка отправлена в службу поддержки. Ожидайте ответа.",
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const message: TicketMessage = {
      id: `msg-${Date.now()}`,
      authorId: "current-user",
      authorName: "Анна Петрова",
      authorRole: "user",
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setTickets(prev => prev.map(ticket => 
      ticket.id === selectedTicket.id 
        ? { ...ticket, messages: [...ticket.messages, message], updatedAt: new Date().toISOString() }
        : ticket
    ));

    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...prev.messages, message],
      updatedAt: new Date().toISOString()
    } : null);

    setNewMessage("");
    
    toast({
      title: "Сообщение отправлено",
      description: "Ваше сообщение добавлено к заявке.",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Список тикетов */}
      <div className="lg:col-span-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Мои заявки</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Создать заявку
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать новую заявку</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateTicket)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тема</FormLabel>
                        <FormControl>
                          <Input placeholder="Кратко опишите проблему" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Подробное описание</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Подробно опишите проблему или запрос"
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Приоритет</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Низкий</SelectItem>
                            <SelectItem value="medium">Средний</SelectItem>
                            <SelectItem value="high">Высокий</SelectItem>
                            <SelectItem value="critical">Критический</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">
                      Создать заявку
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск по заявкам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredTickets.map((ticket) => (
            <Card 
              key={ticket.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedTicket?.id === ticket.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardHeader className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-medium line-clamp-2">
                      {ticket.title}
                    </CardTitle>
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    {getStatusBadge(ticket.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(ticket.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Детали тикета */}
      <div className="lg:col-span-2 flex flex-col">
        {selectedTicket ? (
          <>
            <div className="flex-shrink-0 border-b pb-4 mb-4">
              <div className="flex justify-between items-start gap-4 mb-3">
                <h2 className="text-xl font-semibold">{selectedTicket.title}</h2>
                <div className="flex gap-2">
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>
              
              <p className="text-muted-foreground mb-3">{selectedTicket.description}</p>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Создано: {formatDateTime(selectedTicket.createdAt)}</span>
                {selectedTicket.assignedTo && (
                  <span>Исполнитель: {selectedTicket.assignedTo}</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {selectedTicket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.authorRole === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className={`text-xs ${
                      message.authorRole === 'support' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {message.authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col max-w-[80%] ${
                    message.authorRole === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{message.authorName}</span>
                      {message.authorRole === 'support' && (
                        <Badge variant="secondary" className="text-xs">Поддержка</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(message.timestamp)}
                      </span>
                    </div>
                    
                    <Card className={`p-3 ${
                      message.authorRole === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background border'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </Card>
                  </div>
                </div>
              ))}
            </div>

            {selectedTicket.status !== 'closed' && (
              <div className="flex-shrink-0 border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите ваше сообщение..."
                    className="min-h-[2.5rem] max-h-32 resize-none"
                    rows={2}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="flex-shrink-0"
                  >
                    Отправить
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Выберите заявку для просмотра переписки</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}