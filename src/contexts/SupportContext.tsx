/**
 * SupportContext — контекст модуля поддержки
 *
 * - Управляет открытием/закрытием диалога создания заявки
 * - Собирает полный контекст текущей страницы (app_context)
 * - Polling непрочитанных каждые 30 сек (с visibility check)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getUnreadCounts } from '@/services/supportService';
import { getChatUnread, subscribeChat, warmupChat } from '@/services/chatBackend';
import type { AppContext, UnreadCounts } from '@/types/support';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { useSelection } from '@/contexts/SelectionContext';
import { getToken } from '@/utils/authStorage';

interface PageContextData {
  [key: string]: unknown;
}

interface SupportContextValue {
  // Dialog создания заявки
  isCreateDialogOpen: boolean;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;

  // Модалка «Взаимодействие» (Связь/Чат/Заявки/Помощь) — открывается поверх текущего
  // экрана из шапки/нижнего меню, toggle: повторное нажатие или крестик закрывают.
  interactionSection: 'connection' | 'chat' | 'tickets' | 'help' | null;
  toggleInteraction: (section: 'connection' | 'chat' | 'tickets' | 'help') => void;
  closeInteraction: () => void;

  // Открыть «Инфо» на конкретной статье (контекстная «?», deep-link, переходы между статьями)
  infoTarget: { articleId?: string; anchor?: string } | null;
  openInfo: (articleId?: string, anchor?: string) => void;

  // Контекст страницы
  pageContext: PageContextData;
  registerPageContext: (data: PageContextData) => void;
  buildAppContext: () => AppContext;

  // Непрочитанные
  unreadCounts: UnreadCounts;
  refreshUnreadCounts: () => void;
  clearTicketsBadge: () => void;
  clearChatBadge: () => void;

  // Сигнал «список заявок изменился» (создана новая заявка) — для авто-обновления списка
  ticketsVersion: number;
  notifyTicketsChanged: () => void;
}

const SupportContext = createContext<SupportContextValue | undefined>(undefined);

// Маппинг route → читаемое название
const ROUTE_NAMES: Record<string, string> = {
  '/': 'Оборудование',
  '/network/overview': 'Обзор сети',
  '/network/operations-transactions': 'Операции и транзакции',
  '/network/online-orders': 'Онлайн-заказы',
  '/network/pricing': 'Ценообразование',
  '/network/fuel-inventory': 'Остатки топлива',
  '/network/receipts': 'Поступления',
  '/network/coupons': 'Купоны',
  '/network/notifications': 'Оповещения сети',
  '/network/broadcast-messages': 'Рассылка сообщений',
  '/point/prices': 'Цены ТТ',
  '/point/tanks': 'Резервуары',
  '/point/equipment': 'Оборудование',
  '/point/shift-reports-v2': 'Сменные отчёты',
  '/admin/networks': 'Сети и ТТ (админ)',
  '/admin/users-and-roles': 'Пользователи',
  '/admin/roles': 'Роли',
  '/admin/legal-documents': 'Правовые документы',
  '/admin/audit': 'Журнал аудита',
  '/settings/api-cts': 'API CTC настройки',
  '/settings/external-database': 'Внешняя БД',
  '/support/tickets': 'Заявки (поддержка)',
  '/support/chat': 'Чат (поддержка)',
};

// Маппинг route → раздел
function getSection(path: string): string {
  if (path === '/') return 'Оборудование';
  if (path.startsWith('/network/')) return 'Торговые сети';
  if (path.startsWith('/point/')) return 'Торговая точка';
  if (path.startsWith('/admin/')) return 'Администрирование';
  if (path.startsWith('/settings/')) return 'Настройки';
  if (path.startsWith('/support/')) return 'Поддержка';
  return path;
}

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const { user } = useNewAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // SelectionContext — реальные данные о выбранной сети и ТТ
  const { selectedNetwork, selectedTradingPoint, selectedStation } = useSelection();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [interactionSection, setInteractionSection] = useState<'connection' | 'chat' | 'tickets' | 'help' | null>(null);
  const [infoTarget, setInfoTarget] = useState<{ articleId?: string; anchor?: string } | null>(null);
  const [pageContext, setPageContext] = useState<PageContextData>({});
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ tickets: 0, chat: 0, total: 0 });
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  const [ticketsVersion, setTicketsVersion] = useState(0);

  const openCreateDialog = useCallback(() => setIsCreateDialogOpen(true), []);
  const closeCreateDialog = useCallback(() => setIsCreateDialogOpen(false), []);
  const toggleInteraction = useCallback(
    (section: 'connection' | 'chat' | 'tickets' | 'help') =>
      setInteractionSection((prev) => (prev === section ? null : section)),
    []
  );
  const closeInteraction = useCallback(() => setInteractionSection(null), []);
  const openInfo = useCallback((articleId?: string, anchor?: string) => {
    setInfoTarget({ articleId, anchor });
    setInteractionSection('help');
  }, []);
  const notifyTicketsChanged = useCallback(() => setTicketsVersion(v => v + 1), []);

  const registerPageContext = useCallback((data: PageContextData) => {
    setPageContext(data);
  }, []);

  /**
   * Автоматический сбор контекста из DOM:
   * - заголовок страницы (h1, h2)
   * - активный таб
   * - выбранные фильтры (select, input[type=search])
   * - видимые алерты/ошибки
   */
  const collectPageContext = useCallback((): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    try {
      // Заголовок страницы (первый h1 или h2 в main content)
      const mainContent = document.querySelector('main') || document.querySelector('[class*="content"]') || document.body;
      const heading = mainContent.querySelector('h1, h2');
      if (heading?.textContent) {
        data.pageTitle = heading.textContent.trim();
      }

      // Активный таб (Radix tabs или data-state="active")
      const activeTab = document.querySelector('[data-state="active"][role="tab"]');
      if (activeTab?.textContent) {
        data.activeTab = activeTab.textContent.trim();
      }

      // Все видимые табы (для контекста)
      const allTabs = document.querySelectorAll('[role="tab"]');
      if (allTabs.length > 0) {
        data.availableTabs = Array.from(allTabs).map(t => t.textContent?.trim()).filter(Boolean);
      }

      // Фильтры: активные select значения (кроме пустых и дефолтных)
      const selects = mainContent.querySelectorAll('select');
      const filters: Record<string, string> = {};
      selects.forEach((sel: HTMLSelectElement) => {
        if (sel.value && sel.value !== 'all' && sel.value !== '') {
          const label = sel.closest('div')?.querySelector('label')?.textContent?.trim();
          filters[label || `filter_${Object.keys(filters).length}`] = sel.selectedOptions[0]?.text || sel.value;
        }
      });
      if (Object.keys(filters).length > 0) data.activeFilters = filters;

      // Поле поиска
      const searchInput = mainContent.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Поиск"], input[placeholder*="поиск"]');
      if (searchInput?.value) {
        data.searchQuery = searchInput.value;
      }

      // Видимые ошибки / алерты
      const alerts = mainContent.querySelectorAll('[role="alert"], .text-red-500, .text-destructive');
      if (alerts.length > 0) {
        const alertTexts = Array.from(alerts).map(a => a.textContent?.trim()).filter(Boolean).slice(0, 3);
        if (alertTexts.length > 0) data.visibleErrors = alertTexts;
      }

      // Количество строк в таблице (если есть)
      const tableRows = mainContent.querySelectorAll('table tbody tr, [role="row"]');
      if (tableRows.length > 0) {
        data.tableRowCount = tableRows.length;
      }

      // Выбранный элемент (карточка с bg-blue или selected)
      const selectedCard = mainContent.querySelector('[class*="bg-blue"], [class*="border-blue"], [aria-selected="true"]');
      if (selectedCard) {
        const cardTitle = selectedCard.querySelector('h3, h4, [class*="font-semibold"], [class*="font-bold"]');
        if (cardTitle?.textContent) {
          data.selectedItem = cardTitle.textContent.trim();
        }
      }
    } catch {
      // DOM-сбор не критичен
    }
    return data;
  }, []);

  const buildAppContext = useCallback((): AppContext => {
    // URL-параметры (фильтры, таб, поиск)
    const urlParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      urlParams[key] = value;
    });

    // Авто-контекст из DOM + зарегистрированный pageContext
    const autoContext = collectPageContext();
    const mergedPageData = {
      ...autoContext,
      ...(Object.keys(pageContext).length > 0 ? pageContext : {}),
    };

    // Собираем контекст
    const ctx: AppContext = {
      source: 'tradeframe',
      version: '1.0',

      // Навигация
      route: location.pathname,
      routeName: ROUTE_NAMES[location.pathname] || location.pathname,
      section: getSection(location.pathname),
      urlParams: Object.keys(urlParams).length > 0 ? urlParams : undefined,

      // Сеть
      networkId: selectedNetwork?.id || '',
      networkName: selectedNetwork?.name || '',

      // Торговая точка
      tradingPointId: selectedTradingPoint || '',
      tradingPointName: selectedStation?.name || '',

      // Пользователь
      userId: user?.id || '',
      userEmail: user?.email || '',
      userName: user?.name || '',
      userRole: user?.role || '',

      // Контекст страницы (авто + ручной)
      pageData: Object.keys(mergedPageData).length > 0 ? mergedPageData : undefined,

      // Мета
      browser: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
    };

    return ctx;
  }, [location.pathname, searchParams, user, pageContext, selectedNetwork, selectedTradingPoint, selectedStation, collectPageContext]);

  const refreshUnreadCounts = useCallback(async () => {
    if (!user || !getToken()) return;
    try {
      const counts = await getUnreadCounts();
      // Если активен Matrix-чат — его непрочитанные приоритетнее TSupport (chat ушёл в Matrix).
      const mxChat = getChatUnread();
      if (mxChat !== null) {
        counts.chat = mxChat;
        counts.total = counts.tickets + mxChat;
      }
      setUnreadCounts(counts);
    } catch {
      // Silently fail — не ломаем UI из-за недоступности TSupport
    }
  }, [user]);

  // Лёгкий пересчёт ТОЛЬКО чата из живого Matrix-клиента (без HTTP к TSupport) —
  // для realtime-обновления бейджа на каждое входящее событие.
  const refreshChatUnread = useCallback(() => {
    const mxChat = getChatUnread();
    if (mxChat !== null) {
      setUnreadCounts(prev => ({ ...prev, chat: mxChat, total: prev.tickets + mxChat }));
    }
  }, []);

  const clearTicketsBadge = useCallback(() => {
    setUnreadCounts(prev => ({ ...prev, tickets: 0, total: prev.chat }));
  }, []);

  const clearChatBadge = useCallback(() => {
    setUnreadCounts(prev => ({ ...prev, chat: 0, total: prev.tickets }));
  }, []);

  // Polling непрочитанных (с visibility check — не опрашиваем на неактивной вкладке)
  useEffect(() => {
    if (!user || !getToken()) return;

    let unsub = () => {};
    let alive = true;
    // Прогрев Matrix-клиента → бейдж чата живой ещё до первого открытия чата,
    // плюс realtime-пересчёт чата на каждое входящее событие (без лишних HTTP).
    warmupChat().then(() => {
      if (!alive) return;
      refreshChatUnread();
      unsub = subscribeChat(() => refreshChatUnread());
    });

    refreshUnreadCounts();

    const pollIfVisible = () => {
      if (document.visibilityState === 'visible') refreshUnreadCounts();
    };

    pollingRef.current = setInterval(pollIfVisible, 30_000);

    // При возвращении на вкладку — сразу обновить
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshUnreadCounts();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      alive = false;
      unsub();
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, refreshUnreadCounts, refreshChatUnread]);

  // Сбрасываем pageContext при смене роута
  useEffect(() => {
    setPageContext({});
  }, [location.pathname]);

  return (
    <SupportContext.Provider
      value={{
        isCreateDialogOpen,
        openCreateDialog,
        closeCreateDialog,
        interactionSection,
        toggleInteraction,
        closeInteraction,
        infoTarget,
        openInfo,
        pageContext,
        registerPageContext,
        buildAppContext,
        unreadCounts,
        refreshUnreadCounts,
        clearTicketsBadge,
        clearChatBadge,
        ticketsVersion,
        notifyTicketsChanged,
      }}
    >
      {children}
    </SupportContext.Provider>
  );
}

export function useSupportContext() {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupportContext must be used within SupportProvider');
  }
  return context;
}
