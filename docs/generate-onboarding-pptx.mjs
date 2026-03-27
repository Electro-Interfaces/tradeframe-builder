/**
 * TradeControl Onboarding Presentation — Light Theme
 * For Энтиком network
 */
import pptxgen from 'pptxgenjs';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import sharp from 'sharp';
import {
  FaSignInAlt, FaMobileAlt, FaDesktop,
  FaTachometerAlt, FaChartLine, FaChartBar, FaChartPie,
  FaFileAlt, FaSync, FaCheckCircle, FaFileExcel, FaCloud,
  FaTv, FaCog, FaWifi,
  FaShoppingCart, FaTicketAlt, FaGift,
  FaOilCan, FaThermometerHalf, FaSlidersH,
  FaRubleSign, FaPercentage,
  FaNetworkWired, FaServer, FaShieldAlt,
  FaUsersCog, FaUserLock, FaClipboardList, FaEye,
  FaTelegramPlane, FaBell, FaHeadset, FaComments, FaMoon
} from 'react-icons/fa';

// ─── Icon rendering ───
function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + pngBuf.toString('base64');
}

// ─── Light Theme Colors ───
const C = {
  bg: 'F5F7FA',
  white: 'FFFFFF',
  card: 'FFFFFF',
  cardBorder: 'E2E8F0',
  iconBg: 'EFF6FF',
  title: '1E293B',
  body: '475569',
  muted: '94A3B8',
  accent: 'E87A1E',
  accentLight: 'FFF7ED',
  blue: '2563EB',
  green: '059669',
  teal: '0D9488',
  navy: '0F172A',
};

// ─── Main ───
async function generate() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'TradeControl';
  pres.title = 'TradeControl — Онбординг Энтиком';
  const TOTAL = 11;
  const RECT = pres.shapes.RECTANGLE;
  const OVAL = pres.shapes.OVAL;

  // ─── Helpers (need pres/RECT/OVAL in scope) ───
  function slideNum(slide, n) {
    slide.addText(`${n} / ${TOTAL}`, {
      x: 8.8, y: 5.2, w: 1, h: 0.3,
      fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri',
    });
  }

  function slideTitle(slide, title, subtitle) {
    slide.addShape(RECT, { x: 0.6, y: 0.35, w: 0.06, h: 0.45, fill: { color: C.accent } });
    slide.addText(title, {
      x: 0.85, y: 0.25, w: 8.5, h: 0.55,
      fontSize: 26, fontFace: 'Calibri', bold: true, color: C.title, margin: 0,
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.85, y: 0.75, w: 8.5, h: 0.35,
        fontSize: 13, fontFace: 'Calibri', color: C.muted, margin: 0,
      });
    }
  }

  async function iconCard(slide, icon, color, title, desc, x, y, w, h) {
    slide.addShape(RECT, {
      x, y, w, h,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      shadow: { type: 'outer', blur: 4, offset: 2, angle: 135, color: '000000', opacity: 0.08 },
    });
    // Icon in circle
    const bgMap = { [C.accent]: 'FFF7ED', [C.blue]: 'EFF6FF', [C.green]: 'ECFDF5', [C.teal]: 'F0FDFA' };
    slide.addShape(OVAL, {
      x: x + 0.18, y: y + (h / 2 - 0.22), w: 0.44, h: 0.44,
      fill: { color: bgMap[color] || 'F1F5F9' },
    });
    const iconData = await iconToBase64(icon, '#' + color, 256);
    slide.addImage({ data: iconData, x: x + 0.25, y: y + (h / 2 - 0.15), w: 0.3, h: 0.3 });
    slide.addText(title, {
      x: x + 0.73, y: y + 0.08, w: w - 0.93, h: 0.32,
      fontSize: 13, fontFace: 'Calibri', bold: true, color: C.title, margin: 0, valign: 'middle',
    });
    if (desc) {
      slide.addText(desc, {
        x: x + 0.73, y: y + 0.38, w: w - 0.93, h: h - 0.48,
        fontSize: 10.5, fontFace: 'Calibri', color: C.body, margin: 0, valign: 'top',
      });
    }
  }

  async function bulletCard(slide, icon, color, title, bullets, x, y, w, h) {
    slide.addShape(RECT, {
      x, y, w, h,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      shadow: { type: 'outer', blur: 4, offset: 2, angle: 135, color: '000000', opacity: 0.08 },
    });
    const iconData = await iconToBase64(icon, '#' + color, 256);
    slide.addImage({ data: iconData, x: x + 0.15, y: y + 0.12, w: 0.28, h: 0.28 });
    slide.addText(title, {
      x: x + 0.5, y: y + 0.1, w: w - 0.65, h: 0.3,
      fontSize: 13, fontFace: 'Calibri', bold: true, color: C.title, margin: 0, valign: 'middle',
    });
    const items = bullets.map((b, i) => ({
      text: b,
      options: { bullet: { code: '2022', color: color }, breakLine: i < bullets.length - 1 },
    }));
    slide.addText(items, {
      x: x + 0.2, y: y + 0.45, w: w - 0.4, h: h - 0.55,
      fontSize: 10, fontFace: 'Calibri', color: C.body, paraSpaceAfter: 4, margin: 0,
    });
  }

  function highlightBox(slide, x, y, w, h, accentColor) {
    slide.addShape(RECT, {
      x, y, w, h,
      fill: { color: C.white },
      line: { color: C.cardBorder, width: 1 },
      shadow: { type: 'outer', blur: 4, offset: 2, angle: 135, color: '000000', opacity: 0.08 },
    });
    slide.addShape(RECT, { x, y, w: 0.06, h, fill: { color: accentColor } });
  }

  // ═══════════════════════════════════════════
  // SLIDE 0: Title
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.white };
    // Top accent stripe
    s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.accent } });
    s.addShape(RECT, { x: 0, y: 5.565, w: 10, h: 0.06, fill: { color: C.accent } });
    // Logo icon
    const logo = await iconToBase64(FaTachometerAlt, '#' + C.accent, 256);
    s.addImage({ data: logo, x: 4.35, y: 1.1, w: 1.3, h: 1.3 });
    // Title
    s.addText('TradeControl', {
      x: 1, y: 2.5, w: 8, h: 0.7,
      fontSize: 44, fontFace: 'Calibri', bold: true, color: C.navy, align: 'center', margin: 0,
    });
    s.addText('Платформа управления сетью АЗС', {
      x: 1, y: 3.15, w: 8, h: 0.4,
      fontSize: 18, fontFace: 'Calibri', color: C.body, align: 'center', margin: 0,
    });
    // Divider
    s.addShape(RECT, { x: 4.0, y: 3.7, w: 2, h: 0.02, fill: { color: C.cardBorder } });
    // Tagline
    s.addText('Полный контроль. Из любого места.', {
      x: 1, y: 3.85, w: 8, h: 0.4,
      fontSize: 16, fontFace: 'Calibri', italic: true, color: C.accent, align: 'center', margin: 0,
    });
    // For
    s.addText('Подготовлено для сети Энтиком', {
      x: 1, y: 4.65, w: 8, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: C.muted, align: 'center', margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 1: Начало работы
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Начало работы', 'Вход, настройка и первые шаги');
    slideNum(s, 1);

    await iconCard(s, FaSignInAlt, C.accent, 'Вход в систему',
      'Откройте prod.dataworker.ru\nВведите логин и пароль,\nполученные от администратора',
      0.6, 1.25, 4.2, 1.1);

    await iconCard(s, FaDesktop, C.blue, 'Браузеры',
      'Chrome на ПК — рекомендуемый\nSafari / Chrome на мобильных',
      0.6, 2.5, 4.2, 0.9);

    await iconCard(s, FaMobileAlt, C.green, 'Установка PWA',
      'Иконка «Установить» в адресной строке\n→ приложение на рабочем столе\nБез App Store, работает офлайн',
      0.6, 3.55, 4.2, 1.1);

    await iconCard(s, FaCog, C.teal, 'Навигация',
      'Боковое меню — все разделы\nСелектор сети и станции вверху\nАдаптивно для ПК, планшета, телефона',
      5.2, 1.25, 4.2, 1.3);

    // Quick start box
    s.addShape(RECT, {
      x: 5.2, y: 2.75, w: 4.2, h: 1.9,
      fill: { color: C.accentLight },
      line: { color: C.accent, width: 1 },
    });
    s.addText('Быстрый старт', {
      x: 5.4, y: 2.85, w: 3.8, h: 0.3,
      fontSize: 13, fontFace: 'Calibri', bold: true, color: C.accent, margin: 0,
    });
    s.addText([
      { text: '1. Откройте ссылку в Chrome', options: { breakLine: true } },
      { text: '2. Войдите с логином и паролем', options: { breakLine: true } },
      { text: '3. Установите как приложение (PWA)', options: { breakLine: true } },
      { text: '4. Выберите станцию в верхнем меню', options: { breakLine: true } },
      { text: '5. Изучите разделы в боковом меню' },
    ], {
      x: 5.4, y: 3.2, w: 3.8, h: 1.35,
      fontSize: 11, fontFace: 'Calibri', color: C.body, paraSpaceAfter: 5, margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 2: Дашборд и обзор сети
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Дашборд и обзор сети', 'Все ключевые показатели на одном экране');
    slideNum(s, 2);

    const stats = [
      { label: 'Выручка', unit: '₽', icon: FaRubleSign, color: C.green },
      { label: 'Объём продаж', unit: 'Л', icon: FaOilCan, color: C.blue },
      { label: 'Средний чек', unit: '₽/чек', icon: FaChartBar, color: C.teal },
      { label: 'Транзакции', unit: 'шт', icon: FaChartLine, color: C.accent },
    ];
    for (let i = 0; i < stats.length; i++) {
      const sx = 0.6 + i * 2.3;
      s.addShape(RECT, {
        x: sx, y: 1.25, w: 2.1, h: 0.9,
        fill: { color: C.card },
        line: { color: C.cardBorder, width: 1 },
        shadow: { type: 'outer', blur: 4, offset: 2, angle: 135, color: '000000', opacity: 0.08 },
      });
      const si = await iconToBase64(stats[i].icon, '#' + stats[i].color, 256);
      s.addImage({ data: si, x: sx + 0.12, y: 1.38, w: 0.28, h: 0.28 });
      s.addText(stats[i].label, {
        x: sx + 0.45, y: 1.3, w: 1.5, h: 0.22,
        fontSize: 10, fontFace: 'Calibri', color: C.muted, margin: 0,
      });
      s.addText(stats[i].unit, {
        x: sx + 0.45, y: 1.52, w: 1.5, h: 0.25,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: stats[i].color, margin: 0,
      });
    }

    await iconCard(s, FaChartPie, C.accent, 'Способы оплаты',
      'Наличные, карты, корпоративные —\nраспределение в реальном времени',
      0.6, 2.4, 4.2, 0.9);

    await iconCard(s, FaChartLine, C.blue, 'Тренды и графики',
      'Продажи по дням, загрузка по часам,\nсравнение периодов и станций',
      5.2, 2.4, 4.2, 0.9);

    await iconCard(s, FaTachometerAlt, C.green, 'Контроль в реальном времени',
      'Основные параметры сети обновляются\nавтоматически, без перезагрузки',
      0.6, 3.5, 4.2, 0.9);

    await iconCard(s, FaSync, C.teal, 'Сравнение периодов',
      'Текущая неделя vs прошлая,\nмесяц к месяцу — рост или падение',
      5.2, 3.5, 4.2, 0.9);

    s.addText('Вся сеть — один экран. Решения на основе данных.', {
      x: 0.6, y: 4.7, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', italic: true, color: C.accent, align: 'center', margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 3: Сменные отчёты и аналитика
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Сменные отчёты и аналитика', 'Все данные — в облаке, доступны 24/7');
    slideNum(s, 3);

    await bulletCard(s, FaFileAlt, C.accent, 'Сменные отчёты онлайн', [
      'Итоги каждой смены без бумажных журналов',
      'Агрегация по всей сети за любой период',
      'Все разрезы: по топливу, оплате, сменам',
      'Детализация до каждой транзакции',
    ], 0.6, 1.2, 4.2, 2.0);

    await bulletCard(s, FaSync, C.blue, 'Автоматические сверки', [
      'Сменные отчёты ↔ транзакции терминалов',
      'Транзакции ↔ корпоративный процессинг',
      'Выявление расхождений автоматически',
      'Контроль пробития чеков',
    ], 5.2, 1.2, 4.2, 2.0);

    await iconCard(s, FaFileExcel, C.green, 'Выгрузка в Excel',
      'Любые данные — в таблицу\nдля бухгалтерии и анализа',
      0.6, 3.45, 2.8, 0.95);

    await iconCard(s, FaCog, C.teal, 'Интеграция с 1С',
      'Обмен данными с учётной\nсистемой предприятия',
      3.6, 3.45, 2.8, 0.95);

    await iconCard(s, FaCloud, C.blue, 'Облачное хранение',
      'Данные в безопасности,\nдоступны из любой точки',
      6.6, 3.45, 2.8, 0.95);

    s.addText('От бумажных журналов — к цифровому контролю', {
      x: 0.6, y: 4.7, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', italic: true, color: C.accent, align: 'center', margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 4: Оперативный контроль станций
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Оперативный контроль станций', 'Полный онлайн-контроль всех параметров');
    slideNum(s, 4);

    await bulletCard(s, FaTv, C.accent, 'Мониторинг оборудования', [
      'Состояние каждого терминала: онлайн / оффлайн',
      'Время последней связи для каждого устройства',
      'Параметры колонок и купюроприёмников',
      'Уровни заполнения купюроприёмников',
    ], 0.6, 1.2, 4.2, 2.0);

    await bulletCard(s, FaSlidersH, C.blue, 'Дистанционное управление', [
      'Изменение параметров оборудования удалённо',
      'Перезагрузка терминалов из интерфейса',
      'Корректировка пороговых значений',
      'Оперативная реакция на сбои',
    ], 5.2, 1.2, 4.2, 2.0);

    // Highlight box
    highlightBox(s, 0.6, 3.5, 8.8, 1.05, C.green);
    const wIcon = await iconToBase64(FaWifi, '#' + C.green, 256);
    s.addImage({ data: wIcon, x: 0.9, y: 3.7, w: 0.5, h: 0.5 });
    s.addText('Информация по любой станции — из любого места, в любое время', {
      x: 1.6, y: 3.58, w: 7.5, h: 0.35,
      fontSize: 15, fontFace: 'Calibri', bold: true, color: C.title, margin: 0,
    });
    s.addText('Не нужно ехать на станцию, чтобы узнать её состояние. Все данные обновляются автоматически и доступны на ПК, планшете и смартфоне.', {
      x: 1.6, y: 3.92, w: 7.5, h: 0.5,
      fontSize: 11, fontFace: 'Calibri', color: C.body, margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 5: Онлайн-заказы и купоны
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Онлайн-заказы и купоны', 'Контроль заказов и оперативная работа с клиентами');
    slideNum(s, 5);

    await bulletCard(s, FaShoppingCart, C.accent, 'Мониторинг онлайн-заказов', [
      'Яндекс.Заправки, Benzuber — все заказы в одном месте',
      'Отслеживание ещё до превращения в транзакции',
      'Статусы в реальном времени: ожидание → подтверждён → выполнен',
      'Обновление каждые 10 секунд',
    ], 0.6, 1.2, 4.2, 2.0);

    await bulletCard(s, FaTicketAlt, C.teal, 'Управление купонами', [
      'Генерация купонов из интерфейса',
      'Дистанционное решение вопросов с клиентами',
      'Жизненный цикл: создание → активация → использование',
      'Фильтрация по статусу, типу топлива, периоду',
    ], 5.2, 1.2, 4.2, 2.0);

    highlightBox(s, 0.6, 3.5, 8.8, 1.05, C.accent);
    const gIcon = await iconToBase64(FaGift, '#' + C.accent, 256);
    s.addImage({ data: gIcon, x: 0.9, y: 3.7, w: 0.5, h: 0.5 });
    s.addText('Экономическая выгода', {
      x: 1.6, y: 3.58, w: 7.5, h: 0.35,
      fontSize: 15, fontFace: 'Calibri', bold: true, color: C.title, margin: 0,
    });
    s.addText('Мгновенная компенсация клиенту купоном вместо возврата через кассу — экономит время, сохраняет лояльность, снижает нагрузку на персонал.', {
      x: 1.6, y: 3.92, w: 7.5, h: 0.5,
      fontSize: 11, fontFace: 'Calibri', color: C.body, margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 6: Резервуары
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Управление резервуарами', 'Полный контроль и анализ во всех плоскостях учёта');
    slideNum(s, 6);

    await bulletCard(s, FaThermometerHalf, C.blue, 'Мониторинг уровней', [
      'Уровни топлива в каждом резервуаре в реальном времени',
      'Визуальные индикаторы заполнения',
      'Контроль приёмки топлива',
      'Обнаружение расхождений при сливе',
    ], 0.6, 1.2, 4.2, 2.0);

    await bulletCard(s, FaSlidersH, C.green, 'Автокалибровка', [
      'Система рассчитывает калибровочные таблицы',
      'На основе реальных данных с датчиков',
      'Создание и корректировка таблиц из интерфейса',
      'История всех калибровок',
    ], 5.2, 1.2, 4.2, 2.0);

    await iconCard(s, FaChartBar, C.teal, 'Анализ работы резервуаров',
      'Объёмы приёмки и отпуска, динамика уровней, температурные поправки, расхождения — все данные в одном месте',
      0.6, 3.5, 8.8, 0.95);

    s.addText('Точные данные по резервуарам — основа контроля ТМЦ на станции', {
      x: 0.6, y: 4.7, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', italic: true, color: C.accent, align: 'center', margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 7: Ценообразование и маржа
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Ценообразование и маржа', 'Управление ценами и контроль прибыльности');
    slideNum(s, 7);

    await bulletCard(s, FaRubleSign, C.accent, 'Управление ценами', [
      'Удалённое изменение цен на всех станциях',
      'Расписание: дата и время вступления в силу',
      'История: кто, когда, какая цена',
      'Мгновенная реакция на рыночные изменения',
    ], 0.6, 1.2, 4.2, 2.0);

    await bulletCard(s, FaPercentage, C.green, 'Анализ маржинальности', [
      'Закупочная стоимость → наценка → прибыль',
      'Расчёт маржи по каждому виду топлива',
      'Сравнение маржи по станциям',
      'Динамика прибыльности за период',
    ], 5.2, 1.2, 4.2, 2.0);

    // Flow: Закупка → Наценка → Маржа
    s.addShape(RECT, {
      x: 0.6, y: 3.5, w: 8.8, h: 1.1,
      fill: { color: C.white },
      line: { color: C.cardBorder, width: 1 },
    });
    const steps = [
      { text: 'Закупка', sub: 'Стоимость ТМЦ', color: C.blue },
      { text: 'Наценка', sub: 'Розничная цена', color: C.accent },
      { text: 'Маржа', sub: 'Прибыль по станции', color: C.green },
    ];
    for (let i = 0; i < steps.length; i++) {
      const sx = 1.2 + i * 2.8;
      s.addShape(RECT, {
        x: sx, y: 3.7, w: 2.2, h: 0.7,
        fill: { color: C.bg },
        line: { color: steps[i].color, width: 1.5 },
      });
      s.addText(steps[i].text, {
        x: sx, y: 3.73, w: 2.2, h: 0.32,
        fontSize: 13, fontFace: 'Calibri', bold: true, color: steps[i].color, align: 'center', margin: 0,
      });
      s.addText(steps[i].sub, {
        x: sx, y: 4.05, w: 2.2, h: 0.25,
        fontSize: 10, fontFace: 'Calibri', color: C.body, align: 'center', margin: 0,
      });
      if (i < 2) {
        s.addText('→', {
          x: sx + 2.15, y: 3.8, w: 0.5, h: 0.5,
          fontSize: 22, fontFace: 'Calibri', color: C.muted, align: 'center', valign: 'middle', margin: 0,
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // SLIDE 8: Сеть и инфраструктура
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Сеть и инфраструктура', 'Единая защищённая сеть для всех станций');
    slideNum(s, 8);

    await iconCard(s, FaNetworkWired, C.accent, 'Виртуальная сеть',
      'Выделение IP-адресов для\nпрямого доступа к станциям\nв единой защищённой сети',
      0.6, 1.2, 4.2, 1.35);

    await iconCard(s, FaServer, C.blue, 'Каналы связи',
      'Развёртывание на существующих\nканалах выделенной сети\nпередачи данных',
      5.2, 1.2, 4.2, 1.35);

    await iconCard(s, FaWifi, C.green, 'Мониторинг связи',
      'Состояние каналов в реальном\nвремени, обнаружение обрывов\nи задержек передачи',
      0.6, 2.75, 4.2, 1.35);

    await iconCard(s, FaShieldAlt, C.teal, 'Безопасность',
      'Шифрование данных, изолированные\nсети для каждого клиента,\nзащита от несанкционированного доступа',
      5.2, 2.75, 4.2, 1.35);

    s.addText('Все станции — в одной сети. Управление — из одного центра.', {
      x: 0.6, y: 4.5, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', italic: true, color: C.accent, align: 'center', margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 9: Администрирование и безопасность
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Администрирование и безопасность', 'Управление доступом и аудит действий');
    slideNum(s, 9);

    await bulletCard(s, FaUsersCog, C.accent, 'Управление пользователями', [
      'Создание, блокировка, назначение ролей',
      'Ролевая модель: администратор, менеджер сети, менеджер станции',
      'Каждый сотрудник видит только свои данные',
    ], 0.6, 1.2, 4.2, 1.65);

    await bulletCard(s, FaUserLock, C.blue, 'Разграничение доступа (RBAC)', [
      'Разделение данных по сетям и станциям',
      'Гранулярные разрешения для каждой роли',
      'Невозможно видеть чужие данные',
    ], 5.2, 1.2, 4.2, 1.65);

    await bulletCard(s, FaClipboardList, C.green, 'Журнал аудита', [
      'Все действия зафиксированы: кто, когда, что изменил',
      'Изменения цен, управление пользователями, оборудованием',
      'Полная прозрачность для руководства',
    ], 0.6, 3.1, 4.2, 1.5);

    await bulletCard(s, FaEye, C.teal, 'Прозрачность', [
      'Каждое действие персонала — под контролем',
      'Невозможно скрыть изменение цен или данных',
      'Аудит доступен только руководству',
    ], 5.2, 3.1, 4.2, 1.5);
  }

  // ═══════════════════════════════════════════
  // SLIDE 10: Коммуникации и поддержка
  // ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    slideTitle(s, 'Коммуникации и поддержка', 'Уведомления, рассылки и техническая поддержка');
    slideNum(s, 10);

    await bulletCard(s, FaTelegramPlane, C.blue, 'Telegram-уведомления', [
      'Терминал перешёл в оффлайн',
      'Низкий уровень топлива в резервуаре',
      'Купюроприёмник переполнен',
      'Непробитые чеки, требующие внимания',
    ], 0.6, 1.2, 4.2, 2.0);

    await bulletCard(s, FaHeadset, C.green, 'Онлайн-поддержка', [
      'Встроенный чат с технической поддержкой',
      'Тикет-система для фиксации обращений',
      'Отслеживание статуса решения',
      'Приоритизация запросов',
    ], 5.2, 1.2, 4.2, 2.0);

    await iconCard(s, FaBell, C.accent, 'Рассылки персоналу',
      'Оповещения сотрудникам через\nTelegram — массовые и адресные',
      0.6, 3.45, 2.8, 0.95);

    await iconCard(s, FaMoon, C.teal, 'Не беспокоить',
      'Настройка времени тишины —\nуведомления только в рабочее время',
      3.6, 3.45, 2.8, 0.95);

    await iconCard(s, FaComments, C.blue, 'Внутренние сообщения',
      'Обмен сообщениями между\nсотрудниками внутри системы',
      6.6, 3.45, 2.8, 0.95);

    s.addText('Проблемы находят вас, а не вы ищете проблемы', {
      x: 0.6, y: 4.7, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', italic: true, color: C.accent, align: 'center', margin: 0,
    });
  }

  // ═══════════════════════════════════════════
  const outPath = 'D:\\Users\\magsp\\ELSYPLUS\\TradeFrame\\docs\\TradeControl-Onboarding-Enticom.pptx';
  await pres.writeFile({ fileName: outPath });
  console.log(`Done: ${outPath} (${pres.slides.length} slides)`);
}

generate().catch(err => { console.error('Error:', err); process.exit(1); });
