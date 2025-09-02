import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Mail, 
  Bot, 
  Copy,
  Settings,
  Send
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Схема валидации тикета техподдержки
const ticketSchema = z.object({
  subject: z.string().min(1, "Тема обязательна"),
  description: z.string().min(1, "Описание обязательно"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    errorMap: () => ({ message: "Выберите приоритет" })
  }),
  category: z.enum(["technical", "billing", "access", "other"], {
    errorMap: () => ({ message: "Выберите категорию" })
  }),
  email: z.string().email("Введите корректный email")
});

type Ticket = z.infer<typeof ticketSchema>;

interface TicketWithId extends Ticket {
  id: string;
  createdAt: string;
  status: "new" | "in_progress" | "waiting_response" | "resolved" | "closed";
  responses: number;
  lastUpdate: string;
}

// Схема валидации настроек Telegram-бота
const telegramBotSchema = z.object({
  name: z.string().min(1, "Название бота обязательно"),
  token: z.string().min(1, "Токен обязателен"),
  isActive: z.boolean(),
  channels: z.array(z.string()).default([])
});

type TelegramBot = z.infer<typeof telegramBotSchema>;

interface TelegramBotWithId extends TelegramBot {
  id: string;
  createdAt: string;
  lastActivity: string;
  connectedUsers: number;
}

// Mock данные тикетов техподдержки
const mockTickets: TicketWithId[] = [
  {
    id: "1",
    subject: "Не работает авторизация в системе",
    description: "После обновления не могу войти в систему с обычным паролем. Появляется ошибка 'Invalid credentials'.",
    priority: "high",
    category: "access",
    email: "manager@azs-center.ru",
    createdAt: "2024-08-31 09:15",
    status: "in_progress",
    responses: 2,
    lastUpdate: "2024-08-31 14:20"
  },
  {
    id: "2", 
    subject: "Некорректные данные в отчетах",
    description: "В сводном отчете за вчера показывается неверная сумма продаж АИ-95. По факту было продано на 15% больше.",
    priority: "medium",
    category: "technical",
    email: "accountant@azs-north.ru",
    createdAt: "2024-08-31 08:45",
    status: "waiting_response",
    responses: 1,
    lastUpdate: "2024-08-31 12:30"
  },
];

// Mock данные Telegram-ботов
const mockTelegramBots: TelegramBotWithId[] = [
  {
    id: "1",
    name: "TradeFrame Network Bot",
    token: "1234567890:AABBCCDDEEFFgghhiijjkkllmmnnooppqq",
    isActive: true,
    channels: ["@tradeframe_network", "@tradeframe_managers"],
    createdAt: "2024-08-15 10:00",
    lastActivity: "2024-08-31 14:25",
    connectedUsers: 45
  },
  {
    id: "2",
    name: "TradeFrame Support Bot", 
    token: "9876543210:ZZYYXXWWVVuuttssrrqqppoonn",
    isActive: true,
    channels: ["@tradeframe_support"],
    createdAt: "2024-08-10 15:30",
    lastActivity: "2024-08-31 13:50",
    connectedUsers: 12
  },
];

export default function Messages() {
  const { toast } = useToast();
  
  // Состояние для тикетов техподдержки
  const [tickets, setTickets] = useState<TicketWithId[]>(mockTickets);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Состояние для Telegram-ботов
  const [telegramBots, setTelegramBots] = useState<TelegramBotWithId[]>(mockTelegramBots);
  const [isCreateBotOpen, setIsCreateBotOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<TelegramBotWithId | null>(null);
  const [deletingBot, setDeletingBot] = useState<TelegramBotWithId | null>(null);

  const ticketForm = useForm<Ticket>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      category: "technical",
      email: ""
    }
  });

  const botForm = useForm<TelegramBot>({
    resolver: zodResolver(telegramBotSchema),
    defaultValues: {
      name: "",
      token: "",
      isActive: true,
      channels: []
    }
  });

  // Фильтрация тикетов
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, selectedStatus]);

  // Функции для работы с тикетами
  const handleCreateTicket = (data: Ticket) => {
    const newTicket: TicketWithId = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString('ru-RU'),
      status: "new",
      responses: 0,
      lastUpdate: new Date().toLocaleString('ru-RU')
    };
    
    setTickets(prev => [newTicket, ...prev]);
    setIsCreateTicketOpen(false);
    ticketForm.reset();
    toast({ title: "Тикет создан", description: "Обращение отправлено в техподдержку по email" });
  };

  // Функции для работы с Telegram-ботами
  const handleCreateBot = (data: TelegramBot) => {
    const newBot: TelegramBotWithId = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString('ru-RU'),
      lastActivity: "Не подключался",
      connectedUsers: 0
    };
    
    setTelegramBots(prev => [newBot, ...prev]);
    setIsCreateBotOpen(false);
    botForm.reset();
    toast({ title: "Telegram-бот создан", description: "Настройки сохранены" });
  };

  const handleEditBot = (data: TelegramBot) => {
    if (!editingBot) return;
    
    setTelegramBots(prev => prev.map(bot => 
      bot.id === editingBot.id ? { ...bot, ...data } : bot
    ));
    setEditingBot(null);
    botForm.reset();
    toast({ title: "Настройки обновлены" });
  };

  const handleDeleteBot = () => {
    if (!deletingBot) return;
    
    setTelegramBots(prev => prev.filter(bot => bot.id !== deletingBot.id));
    setDeletingBot(null);
    toast({ title: "Telegram-бот удален" });
  };

  const openEditBotDialog = (bot: TelegramBotWithId) => {
    setEditingBot(bot);
    botForm.reset({
      name: bot.name,
      token: bot.token,
      isActive: bot.isActive,
      channels: bot.channels
    });
  };

  // Вспомогательные функции для стилизации
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-slate-600 text-slate-200";
      case "in_progress": return "bg-slate-600 text-slate-200";
      case "waiting_response": return "bg-slate-600 text-slate-200";
      case "resolved": return "bg-slate-700 text-slate-300";
      case "closed": return "bg-slate-700 text-slate-300";
      default: return "bg-slate-600 text-slate-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "Новый";
      case "in_progress": return "В работе";
      case "waiting_response": return "Ожидает ответа";
      case "resolved": return "Решен";
      case "closed": return "Закрыт";
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-slate-600 text-slate-200";
      case "medium": return "bg-slate-600 text-slate-200";
      case "high": return "bg-slate-700 text-slate-300";
      case "urgent": return "bg-slate-700 text-slate-300";
      default: return "bg-slate-600 text-slate-200";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "low": return "Низкий";
      case "medium": return "Средний";
      case "high": return "Высокий";
      case "urgent": return "Срочный";
      default: return priority;
    }
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 px-4 md:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-white">Коммуникации и поддержка</h1>
          <p className="text-slate-400 mt-1">Управление тикетами техподдержки и настройка Telegram-интеграции</p>
        </div>

        {/* Секция техподдержки */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Техподдержка</h2>
              </div>
              <Button 
                onClick={() => setIsCreateTicketOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать тикет
              </Button>
            </div>
            <div className="mt-4 flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Поиск по теме, описанию или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full lg:w-48 bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="new">Новые</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="waiting_response">Ожидают ответа</SelectItem>
                  <SelectItem value="resolved">Решены</SelectItem>
                  <SelectItem value="closed">Закрыты</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="px-4 md:px-6 pb-6">
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-600">
              <table className="w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium">ТЕМА</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium">СТАТУС</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium">ПРИОРИТЕТ</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium">EMAIL</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium">СОЗДАН</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium">ОТВЕТОВ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-800">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-700 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-medium text-white">{ticket.subject}</div>
                        <div className="text-sm text-slate-400 truncate max-w-xs">
                          {ticket.description.substring(0, 80)}...
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant="secondary" className={getStatusColor(ticket.status)}>
                          {getStatusText(ticket.status)}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant="secondary" className={getPriorityColor(ticket.priority)}>
                          {getPriorityText(ticket.priority)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{ticket.email}</td>
                      <td className="px-6 py-4 text-slate-400">{ticket.createdAt}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="text-white font-medium">{ticket.responses}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white text-sm">{ticket.subject}</h3>
                    <Badge variant="secondary" className={`${getStatusColor(ticket.status)} text-xs`}>
                      {getStatusText(ticket.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-3 line-clamp-2">{ticket.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className={`${getPriorityColor(ticket.priority)} text-xs`}>
                      {getPriorityText(ticket.priority)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ticket.responses} ответов
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{ticket.email}</span>
                    <span>{ticket.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Секция Telegram-ботов */}
        <div className="bg-slate-800 w-full">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Telegram-боты</h2>
              </div>
              <Button 
                onClick={() => setIsCreateBotOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить бота
              </Button>
            </div>
          </div>
          <div className="px-6 pb-6 grid gap-4">
            {telegramBots.map((bot) => (
              <Card key={bot.id} className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Bot className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{bot.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="secondary" className={
                            bot.isActive 
                              ? "bg-slate-600 text-slate-200" 
                              : "bg-slate-700 text-slate-300"
                          }>
                            {bot.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                          <span className="text-slate-500">•</span>
                          <span>{bot.connectedUsers} подключений</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditBotDialog(bot)}
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingBot(bot)}
                        className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-slate-400">ТОКЕН</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 truncate flex-1">
                          {bot.token.substring(0, 15)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(bot.token);
                            toast({ title: "Токен скопирован" });
                          }}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">КАНАЛЫ</Label>
                      <div className="mt-1">
                        {bot.channels.length > 0 ? (
                          <div className="space-y-1">
                            {bot.channels.slice(0, 2).map((channel, idx) => (
                              <div key={idx} className="text-xs text-slate-300 bg-slate-700 px-2 py-1 rounded">
                                {channel}
                              </div>
                            ))}
                            {bot.channels.length > 2 && (
                              <div className="text-xs text-slate-500">+{bot.channels.length - 2} еще</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Каналы не настроены</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">ПОСЛЕДНЯЯ АКТИВНОСТЬ</Label>
                      <div className="text-xs text-slate-300 mt-1">{bot.lastActivity}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Диалоговые окна */}
        <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Создать обращение в техподдержку</DialogTitle>
              <DialogDescription className="text-slate-400">
                Опишите проблему или задайте вопрос. Ответ будет отправлен на указанный email
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={ticketForm.handleSubmit(handleCreateTicket)} className="space-y-4">
              {/* ... форма создания тикета ... */}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateTicketOpen(false)}>Отмена</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700"><Send className="h-4 w-4 mr-2" />Отправить</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateBotOpen || !!editingBot} onOpenChange={(open) => {
          if (!open) {
            setIsCreateBotOpen(false);
            setEditingBot(null);
            botForm.reset();
          }
        }}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">{editingBot ? "Редактировать" : "Добавить"} Telegram-бота</DialogTitle>
            </DialogHeader>
            <form onSubmit={botForm.handleSubmit(editingBot ? handleEditBot : handleCreateBot)} className="space-y-4">
              {/* ... форма создания/редактирования бота ... */}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsCreateBotOpen(false); setEditingBot(null); }}>Отмена</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700"><Settings className="h-4 w-4 mr-2" />{editingBot ? "Обновить" : "Создать"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingBot} onOpenChange={(open) => !open && setDeletingBot(null)}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Удалить Telegram-бота?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Бот "{deletingBot?.name}" будет удален из системы. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteBot} className="bg-red-600 hover:bg-red-700">Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}