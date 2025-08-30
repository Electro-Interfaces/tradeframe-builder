import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
}

const currentUserId = "current-user";
const currentUserName = "Анна Петрова";

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    authorId: "user-2",
    authorName: "Иван Сидоров",
    text: "Добрый день! На АЗС-3 проблемы с ТРК №2, не работает терминал оплаты.",
    timestamp: "2024-08-30T09:15:00Z",
    isCurrentUser: false
  },
  {
    id: "2",
    authorId: "user-3",
    authorName: "Мария Козлова",
    text: "Иван, я направлю техника через час. Пока переключите клиентов на соседнюю колонку.",
    timestamp: "2024-08-30T09:18:00Z",
    isCurrentUser: false
  },
  {
    id: "3",
    authorId: currentUserId,
    authorName: currentUserName,
    text: "Хорошо, переключили. Клиенты пока обслуживаются на ТРК №1.",
    timestamp: "2024-08-30T09:20:00Z",
    isCurrentUser: true
  },
  {
    id: "4",
    authorId: "user-4",
    authorName: "Александр Орлов",
    text: "На АЗС-5 закончился чек-лист для вечерней смены. Можете прислать?",
    timestamp: "2024-08-30T09:45:00Z",
    isCurrentUser: false
  }
];

// Массив возможных сообщений для симуляции
const simulatedMessages = [
  { author: "Елена Васильева", text: "Обновление цен на топливо прошло успешно на всех точках." },
  { author: "Дмитрий Смирнов", text: "АЗС-1: резервуар №2 требует заправки до завтра." },
  { author: "Ольга Николаева", text: "Ночная смена отработала без происшествий. Отчеты готовы." },
  { author: "Сергей Волков", text: "На АЗС-4 сломался принтер чеков, вызываю сервис." },
  { author: "Татьяна Лебедева", text: "Инкассация запланирована на 15:00 по всем точкам." },
  { author: "Михаил Попов", text: "Получены новые образцы топлива для лаборатории." }
];

export function NetworkChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [simulationCounter, setSimulationCounter] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Симуляция получения новых сообщений каждые 15-30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      const randomDelay = Math.random() * 15000 + 15000; // 15-30 секунд
      
      setTimeout(() => {
        if (simulationCounter < simulatedMessages.length) {
          const messageData = simulatedMessages[simulationCounter];
          const newSimulatedMessage: ChatMessage = {
            id: `simulated-${Date.now()}`,
            authorId: `user-${simulationCounter + 10}`,
            authorName: messageData.author,
            text: messageData.text,
            timestamp: new Date().toISOString(),
            isCurrentUser: false
          };
          
          setMessages(prev => [...prev, newSimulatedMessage]);
          setSimulationCounter(prev => prev + 1);
        }
      }, randomDelay);
    }, 30000); // Проверка каждые 30 секунд

    return () => clearInterval(interval);
  }, [simulationCounter]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      authorId: currentUserId,
      authorName: currentUserName,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isCurrentUser: true
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    toast({
      title: "Сообщение отправлено",
      description: "Ваше сообщение доставлено всем участникам чата.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Заголовок чата */}
      <div className="flex-shrink-0 p-4 border-b bg-muted/30">
        <h2 className="font-semibold">Чат сети "Лукойл Центр"</h2>
        <p className="text-sm text-muted-foreground">
          {messages.filter(m => !m.isCurrentUser).length + 1} участников онлайн
        </p>
      </div>

      {/* Лента сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {!message.isCurrentUser && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={message.authorAvatar} alt={message.authorName} />
                <AvatarFallback className="text-xs">
                  {getInitials(message.authorName)}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={`flex flex-col max-w-[70%] ${message.isCurrentUser ? 'items-end' : 'items-start'}`}>
              {!message.isCurrentUser && (
                <span className="text-xs text-muted-foreground mb-1 px-2">
                  {message.authorName}
                </span>
              )}
              
              <Card className={`p-3 ${
                message.isCurrentUser 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background border'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </Card>
              
              <span className="text-xs text-muted-foreground mt-1 px-2">
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="flex-shrink-0 p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение... (Enter - отправить, Shift+Enter - новая строка)"
            className="min-h-[2.5rem] max-h-32 resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="h-10 w-10 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}