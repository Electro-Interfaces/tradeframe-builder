/**
 * Экспорт данных страницы «Ценообразование» в Excel и PDF.
 *
 * Excel (ExcelJS — умеет встраивать картинки):
 *   1. Сводка           — шапка + статистика по видам топлива
 *   2. Цены по точкам   — матрица «точка × вид топлива → текущая цена»
 *   3. Динамика цен     — «дата × вид топлива → средняя цена по сети» (сырьё графика)
 *   4. График динамики  — сам график step-line, встроенный картинкой (рисуется на canvas)
 *   5. Продажи по ценам — разбивка объёма/выручки по действовавшим ценам
 *
 * PDF (landscape):
 *   сводка + таблица статистики + тот же график динамики + продажи по ценам.
 *
 * Excel — ExcelJS (addImage для графика), PDF — pdfMake + Roboto для кириллицы.
 */

import { loadPdfMake } from "@/utils/pdfMake";
import { getFuelPriority, sortFuelTypes } from "@/utils/fuelPriority";
import { getFuelColorHex } from "@/utils/fuelColors";
import type ExcelJSNS from "exceljs";
import type {
  NetworkPriceData,
  PriceStatistics,
  SalesByPrice,
} from "@/hooks/useNetworkPrices";
import type { Network } from "@/types/network";

interface PricingExportParams {
  networkPrices: NetworkPriceData[];
  statistics: PriceStatistics[];
  priceHistoryMap: Map<string, Array<{ date: string; price: number; fuelType: string }>> | null;
  salesByPrice: SalesByPrice[];
  selectedNetwork: Network | null;
  selectedNetworks: Network[];
  selectedPeriod: string;
  toast: (opts: any) => void;
}

// ─────────────────────────── Хелперы ───────────────────────────

const PERIOD_LABELS: Record<string, string> = {
  "7": "Последние 7 дней",
  "30": "Последние 30 дней",
  "90": "Последние 3 месяца",
  all: "Всё время",
};

const periodLabel = (p: string): string => PERIOD_LABELS[p] ?? "Всё время";

/** ISO-дата (YYYY-MM-DD[THH…]) → DD.MM.YY */
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yy = d.getFullYear().toString().slice(-2);
  return `${dd}.${mm}.${yy}`;
};

const num = (v: number, d = 2): string =>
  v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });

const signed = (v: number | undefined, d = 2): string =>
  v === undefined ? "—" : `${v > 0 ? "+" : ""}${num(v, d)}`;

/** Заголовок сети: одна сеть или перечень выбранных */
const networkTitle = (network: Network | null, networks: Network[]): string => {
  if (networks && networks.length > 1) return networks.map((n) => n.name).join(", ");
  return network?.name ?? "—";
};

/** Статистика, отсортированная по приоритету видов топлива */
const sortStats = (stats: PriceStatistics[]): PriceStatistics[] =>
  [...stats].sort((a, b) => {
    const pa = getFuelPriority(a.fuelType);
    const pb = getFuelPriority(b.fuelType);
    if (pa !== pb) return pa - pb;
    return a.fuelType.localeCompare(b.fuelType, "ru");
  });

/** Все виды топлива из текущих цен, отсортированные по приоритету */
const fuelColumns = (networkPrices: NetworkPriceData[]): string[] => {
  const set = new Set<string>();
  networkPrices.forEach((s) => s.prices.forEach((p) => set.add(p.fuelType)));
  return sortFuelTypes(Array.from(set));
};

/** Безопасное имя файла из названия сети */
const fileSlug = (network: Network | null, networks: Network[]): string => {
  const base = networks.length > 1 ? "сети" : network?.name || "сеть";
  return base.replace(/[^a-zA-Zа-яА-Я0-9]+/g, "_").replace(/^_|_$/g, "") || "сеть";
};

/** Скачивание Blob как файла (ExcelJS не пишет файл сам — отдаёт буфер) */
const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─────────────────────── График динамики → PNG ───────────────────────

/**
 * Рисует step-line график динамики цен на светлом фоне и возвращает data-URL PNG.
 * Источник — statistics[].priceHistory (усреднённые по дням цены по сети),
 * то есть та же кривая «Среднее по сети», что и на вкладке «Динамика».
 * Возвращает null, если истории недостаточно для линии.
 */
function renderPriceDynamicsChart(
  statistics: PriceStatistics[],
  opts: { width?: number; height?: number } = {}
): string | null {
  if (typeof document === "undefined") return null;

  const withHistory = sortStats(statistics.filter((s) => s.priceHistory && s.priceHistory.length > 0));
  if (withHistory.length === 0) return null;

  // Общий отсортированный список дат (категориальная ось, как в recharts)
  const dateSet = new Set<string>();
  withHistory.forEach((s) => s.priceHistory!.forEach((h) => dateSet.add(h.date)));
  const dates = Array.from(dateSet).sort();
  if (dates.length < 2) return null;
  const dateIndex = new Map(dates.map((d, i) => [d, i]));

  // Диапазон цен
  let minP = Infinity;
  let maxP = -Infinity;
  withHistory.forEach((s) =>
    s.priceHistory!.forEach((h) => {
      minP = Math.min(minP, h.price);
      maxP = Math.max(maxP, h.price);
    })
  );
  const pad = (maxP - minP) * 0.08 || 1;
  minP = Math.floor(minP - pad);
  maxP = Math.ceil(maxP + pad);
  if (maxP <= minP) maxP = minP + 1;

  const width = opts.width ?? 1240;
  const height = opts.height ?? 620;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Отступы графика
  const mL = 78;
  const mR = 28;
  const mT = 56;
  const legendH = 56;
  const mB = 64 + legendH;
  const plotW = width - mL - mR;
  const plotH = height - mT - mB;

  const xOf = (idx: number) => mL + (dates.length === 1 ? 0 : (idx / (dates.length - 1)) * plotW);
  const yOf = (price: number) => mT + plotH * (1 - (price - minP) / (maxP - minP));

  // Фон
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Заголовок
  ctx.fillStyle = "#111827";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText("Динамика цен по сети (средняя, ₽/л)", mL, 32);

  // Сетка + подписи оси Y (5 делений)
  const ticks = 5;
  ctx.font = "13px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= ticks; i++) {
    const val = minP + ((maxP - minP) * i) / ticks;
    const y = yOf(val);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mL, y);
    ctx.lineTo(mL + plotW, y);
    ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.fillText(val.toFixed(2), mL - 10, y);
  }

  // Оси
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(mL, mT);
  ctx.lineTo(mL, mT + plotH);
  ctx.lineTo(mL + plotW, mT + plotH);
  ctx.stroke();

  // Подписи оси X (прореживаем до ~12)
  ctx.fillStyle = "#6b7280";
  ctx.font = "12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const stepX = Math.max(1, Math.ceil(dates.length / 12));
  dates.forEach((d, i) => {
    if (i % stepX !== 0 && i !== dates.length - 1) return;
    ctx.fillText(fmtDate(d), xOf(i), mT + plotH + 8);
  });

  // Линии по видам топлива (stepAfter)
  withHistory.forEach((stat) => {
    const color = getFuelColorHex(stat.fuelType);
    const pts = stat
      .priceHistory!.filter((h) => dateIndex.has(h.date))
      .map((h) => ({ x: xOf(dateIndex.get(h.date)!), y: yOf(h.price) }))
      .sort((a, b) => a.x - b.x);
    if (pts.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i - 1].y); // горизонталь — цена держится
      ctx.lineTo(pts[i].x, pts[i].y); // вертикаль — изменение цены
    }
    ctx.stroke();

    // Точки
    ctx.fillStyle = color;
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Легенда снизу
  const legendY = mT + plotH + 40;
  let lx = mL;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "14px Arial, sans-serif";
  withHistory.forEach((stat) => {
    const color = getFuelColorHex(stat.fuelType);
    const label = stat.fuelType;
    const labelW = ctx.measureText(label).width;
    const blockW = 22 + labelW + 24;
    if (lx + blockW > mL + plotW) {
      lx = mL;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, legendY);
    ctx.lineTo(lx + 16, legendY);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx + 8, legendY, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.fillText(label, lx + 22, legendY);
    lx += blockW;
  });

  return canvas.toDataURL("image/png");
}

// ────────────────────────────── Excel ──────────────────────────────

export async function exportPricingToExcel({
  networkPrices,
  statistics,
  salesByPrice,
  selectedNetwork,
  selectedNetworks,
  selectedPeriod,
  toast,
}: PricingExportParams): Promise<void> {
  if (networkPrices.length === 0) {
    toast({
      title: "Нет данных для экспорта",
      description: "Дождитесь загрузки цен по сети",
      variant: "destructive",
    });
    return;
  }

  try {
    const ExcelJSModule = await import("exceljs");
    const ExcelJSLib = ExcelJSModule.default;
    const workbook = new ExcelJSLib.Workbook();

    const title = networkTitle(selectedNetwork, selectedNetworks);
    const stats = sortStats(statistics);
    const fuels = fuelColumns(networkPrices);

    // ── Стили и хелперы листов ──
    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    const headerStyle: Partial<ExcelJSNS.Style> = {
      font: { bold: true, size: 10 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } },
      alignment: { horizontal: "left", vertical: "middle" },
      border,
    };
    const sectionTitle = (ws: ExcelJSNS.Worksheet, text: string) => {
      const r = ws.addRow([text]);
      r.getCell(1).font = { bold: true, size: 14 };
    };
    const headerRow = (ws: ExcelJSNS.Worksheet, values: (string | number)[]) => {
      const r = ws.addRow(values);
      r.eachCell((c) => { c.style = { ...headerStyle }; });
    };
    const setWidths = (ws: ExcelJSNS.Worksheet, widths: number[]) => {
      widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    };

    // ── Лист 1: Сводка + статистика ──
    const wsSummary = workbook.addWorksheet("Сводка");
    sectionTitle(wsSummary, "ЦЕНООБРАЗОВАНИЕ — ОТЧЁТ ПО СЕТИ");
    wsSummary.addRow([]);
    wsSummary.addRow(["Показатель", "Значение"]);
    wsSummary.addRow(["Торговая сеть", title]);
    wsSummary.addRow(["Период анализа", periodLabel(selectedPeriod)]);
    wsSummary.addRow(["Торговых точек", networkPrices.length]);
    wsSummary.addRow(["Видов топлива", stats.length]);
    wsSummary.addRow(["Дата формирования", new Date().toLocaleString("ru-RU")]);
    wsSummary.addRow([]);
    sectionTitle(wsSummary, "СТАТИСТИКА ПО ВИДАМ ТОПЛИВА");
    wsSummary.addRow([]);
    headerRow(wsSummary, [
      "Вид топлива", "Средняя, ₽", "Мин, ₽", "Точка (мин)", "Макс, ₽", "Точка (макс)",
      "Разброс, ₽", "Разброс, %", "Изм. за период, ₽", "Изм. за период, %", "Продажи, л", "Выручка, ₽",
    ]);
    stats.forEach((s) => {
      wsSummary.addRow([
        s.fuelType,
        Number(s.averagePrice.toFixed(2)),
        Number(s.minPrice.toFixed(2)),
        s.minStation,
        Number(s.maxPrice.toFixed(2)),
        s.maxStation,
        Number(s.priceRange.toFixed(2)),
        Number(s.priceRangePercent.toFixed(1)),
        s.priceChange !== undefined ? Number(s.priceChange.toFixed(2)) : "—",
        s.priceChangePercent !== undefined ? Number(s.priceChangePercent.toFixed(1)) : "—",
        s.salesVolume !== undefined ? Number(s.salesVolume.toFixed(2)) : "—",
        s.salesRevenue !== undefined ? Number(s.salesRevenue.toFixed(2)) : "—",
      ]);
    });
    setWidths(wsSummary, [18, 12, 11, 22, 11, 22, 12, 11, 16, 16, 14, 15]);

    // ── Лист 2: Цены по точкам (матрица) ──
    const wsPrices = workbook.addWorksheet("Цены по точкам");
    sectionTitle(wsPrices, "ЦЕНЫ ПО ТОРГОВЫМ ТОЧКАМ (текущие)");
    wsPrices.addRow([]);
    headerRow(wsPrices, ["№", "Торговая точка", ...fuels]);
    networkPrices.forEach((station) => {
      const row: (string | number)[] = [station.stationNumber, station.stationName];
      fuels.forEach((f) => {
        const p = station.prices.find((pr) => pr.fuelType === f);
        row.push(p ? Number(p.price.toFixed(2)) : "");
      });
      wsPrices.addRow(row);
    });

    // Итоги по колонкам: средняя / мин / макс
    const colAgg = (f: string): { avg: number | ""; min: number | ""; max: number | "" } => {
      const vals = networkPrices
        .map((s) => s.prices.find((p) => p.fuelType === f)?.price)
        .filter((v): v is number => typeof v === "number");
      if (vals.length === 0) return { avg: "", min: "", max: "" };
      return {
        avg: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
        min: Number(Math.min(...vals).toFixed(2)),
        max: Number(Math.max(...vals).toFixed(2)),
      };
    };
    wsPrices.addRow([]);
    const aggRows: Array<[string, "avg" | "min" | "max"]> = [
      ["Средняя", "avg"], ["Минимум", "min"], ["Максимум", "max"],
    ];
    aggRows.forEach(([label, key]) => {
      const r = wsPrices.addRow(["", label, ...fuels.map((f) => colAgg(f)[key])]);
      r.getCell(2).font = { bold: true };
    });
    setWidths(wsPrices, [8, 32, ...fuels.map(() => 12)]);

    // ── Лист 3: Динамика цен (дата × вид топлива → средняя по сети) ──
    const dynFuels = sortStats(statistics.filter((s) => s.priceHistory && s.priceHistory.length > 0));
    if (dynFuels.length > 0) {
      const dateSet = new Set<string>();
      dynFuels.forEach((s) => s.priceHistory!.forEach((h) => dateSet.add(h.date)));
      const dates = Array.from(dateSet).sort();

      const wsDyn = workbook.addWorksheet("Динамика цен");
      sectionTitle(wsDyn, "ДИНАМИКА ЦЕН (средняя по сети)");
      wsDyn.addRow([]);
      headerRow(wsDyn, ["Дата", ...dynFuels.map((s) => s.fuelType)]);
      dates.forEach((d) => {
        const row: (string | number)[] = [fmtDate(d)];
        dynFuels.forEach((s) => {
          const h = s.priceHistory!.find((x) => x.date === d);
          row.push(h ? Number(h.price.toFixed(2)) : "");
        });
        wsDyn.addRow(row);
      });
      setWidths(wsDyn, [12, ...dynFuels.map(() => 12)]);
    }

    // ── Лист 4: График динамики (сам график, встроенный картинкой) ──
    const chartImage = renderPriceDynamicsChart(statistics);
    if (chartImage) {
      const wsChart = workbook.addWorksheet("График динамики");
      const imageId = workbook.addImage({ base64: chartImage.split(",")[1], extension: "png" });
      // canvas 1240×620 → вставляем 1000×500 (пропорции сохранены), с полем слева/сверху
      wsChart.addImage(imageId, { tl: { col: 0.3, row: 0.5 }, ext: { width: 1000, height: 500 } });
    }

    // ── Лист 5: Продажи по ценам ──
    if (salesByPrice.length > 0) {
      const grouped = salesByPrice.reduce((acc, s) => {
        (acc[s.fuelType] ??= []).push(s);
        return acc;
      }, {} as Record<string, SalesByPrice[]>);

      const wsSales = workbook.addWorksheet("Продажи по ценам");
      sectionTitle(wsSales, "ПРОДАЖИ ПО ЦЕНАМ (из закрытых смен)");
      wsSales.addRow([]);
      headerRow(wsSales, ["Вид топлива", "Цена, ₽/л", "Объём, л", "Выручка, ₽"]);
      sortFuelTypes(Object.keys(grouped)).forEach((fuel) => {
        const rows = grouped[fuel].sort((a, b) => a.price - b.price);
        rows.forEach((s, i) => {
          wsSales.addRow([
            i === 0 ? fuel : "",
            Number(s.price.toFixed(2)),
            Number(s.volume.toFixed(2)),
            Number(s.revenue.toFixed(2)),
          ]);
        });
        const totalVol = rows.reduce((sum, s) => sum + s.volume, 0);
        const totalRev = rows.reduce((sum, s) => sum + s.revenue, 0);
        const tr = wsSales.addRow([`Итого ${fuel}`, "", Number(totalVol.toFixed(2)), Number(totalRev.toFixed(2))]);
        tr.font = { bold: true };
        wsSales.addRow([]);
      });
      setWidths(wsSales, [20, 12, 14, 15]);
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `Ценообразование_${fileSlug(selectedNetwork, selectedNetworks)}_${dateStr}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      fileName,
    );

    toast({ title: "Экспорт завершён", description: `Данные сохранены в файл: ${fileName}` });
  } catch (error) {
    toast({
      title: "Ошибка экспорта",
      description: "Не удалось создать Excel файл. Попробуйте ещё раз.",
      variant: "destructive",
    });
  }
}

// ────────────────────────────── PDF ──────────────────────────────

export async function exportPricingToPdf({
  networkPrices,
  statistics,
  salesByPrice,
  selectedNetwork,
  selectedNetworks,
  selectedPeriod,
  toast,
}: PricingExportParams): Promise<void> {
  if (networkPrices.length === 0) {
    toast({
      title: "Нет данных для экспорта",
      description: "Дождитесь загрузки цен по сети",
      variant: "destructive",
    });
    return;
  }

  try {
    const pdfMake = await loadPdfMake();
    const title = networkTitle(selectedNetwork, selectedNetworks);
    const stats = sortStats(statistics);

    const content: any[] = [
      { text: "Ценообразование по сети", style: "title" },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: `Сеть: ${title}`, style: "infoBlock" },
              { text: `Период: ${periodLabel(selectedPeriod)}`, style: "infoBlock" },
              { text: `Торговых точек: ${networkPrices.length}`, style: "infoBlock" },
              { text: `Сформировано: ${new Date().toLocaleString("ru-RU")}`, style: "infoBlock" },
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },
    ];

    // Таблица статистики по видам топлива
    if (stats.length > 0) {
      const body: any[] = [
        [
          { text: "Вид топлива", style: "tableHeader" },
          { text: "Средняя, ₽", style: "tableHeader", alignment: "right" },
          { text: "Мин, ₽", style: "tableHeader", alignment: "right" },
          { text: "Макс, ₽", style: "tableHeader", alignment: "right" },
          { text: "Разброс", style: "tableHeader", alignment: "right" },
          { text: "Изм. за период", style: "tableHeader", alignment: "right" },
        ],
      ];
      stats.forEach((s) => {
        body.push([
          { text: s.fuelType, style: "tableCell" },
          { text: num(s.averagePrice), style: "tableCell", alignment: "right" },
          { text: num(s.minPrice), style: "tableCell", alignment: "right" },
          { text: num(s.maxPrice), style: "tableCell", alignment: "right" },
          { text: `${num(s.priceRange)} ₽ (${num(s.priceRangePercent, 1)}%)`, style: "tableCell", alignment: "right" },
          {
            text:
              s.priceChange === undefined
                ? "—"
                : `${signed(s.priceChange)} ₽ (${signed(s.priceChangePercent, 1)}%)`,
            style: "tableCell",
            alignment: "right",
          },
        ]);
      });

      content.push({ text: "Статистика по видам топлива", style: "sectionLabel", margin: [0, 0, 0, 6] });
      content.push({
        table: { headerRows: 1, widths: ["*", "auto", "auto", "auto", "auto", "auto"], body },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
      });
    }

    // График динамики цен (рисуется на canvas)
    const chartImage = renderPriceDynamicsChart(statistics);
    if (chartImage) {
      content.push({ text: "Динамика цен", style: "sectionLabel", margin: [0, 0, 0, 8] });
      content.push({ image: chartImage, width: 760, margin: [0, 0, 0, 16] });
    }

    // Продажи по ценам
    if (salesByPrice.length > 0) {
      const grouped = salesByPrice.reduce((acc, s) => {
        (acc[s.fuelType] ??= []).push(s);
        return acc;
      }, {} as Record<string, SalesByPrice[]>);

      const body: any[] = [
        [
          { text: "Вид топлива", style: "tableHeader" },
          { text: "Цена, ₽/л", style: "tableHeader", alignment: "right" },
          { text: "Объём, л", style: "tableHeader", alignment: "right" },
          { text: "Выручка, ₽", style: "tableHeader", alignment: "right" },
        ],
      ];
      sortFuelTypes(Object.keys(grouped)).forEach((fuel) => {
        const rows = grouped[fuel].sort((a, b) => a.price - b.price);
        rows.forEach((s, i) => {
          body.push([
            { text: i === 0 ? fuel : "", style: "tableCell" },
            { text: num(s.price), style: "tableCell", alignment: "right" },
            { text: num(s.volume), style: "tableCell", alignment: "right" },
            { text: num(s.revenue), style: "tableCell", alignment: "right" },
          ]);
        });
        const totalVol = rows.reduce((sum, s) => sum + s.volume, 0);
        const totalRev = rows.reduce((sum, s) => sum + s.revenue, 0);
        body.push([
          { text: `Итого ${fuel}`, style: "tableCell", bold: true },
          { text: "", style: "tableCell" },
          { text: num(totalVol), style: "tableCell", alignment: "right", bold: true },
          { text: num(totalRev), style: "tableCell", alignment: "right", bold: true },
        ]);
      });

      content.push({ text: "Продажи по ценам", style: "sectionLabel", margin: [0, 0, 0, 6] });
      content.push({
        table: { headerRows: 1, widths: ["*", "auto", "auto", "auto"], body },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
      });
    }

    const docDefinition = {
      info: { title: "Ценообразование по сети", author: "ElsyPlus Monitor", subject: "Экспорт цен" },
      pageOrientation: "landscape" as const,
      pageMargins: [24, 24, 24, 32] as [number, number, number, number],
      content,
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 12] as [number, number, number, number], color: "#111827" },
        infoBlock: { fontSize: 10, color: "#111827" },
        sectionLabel: { fontSize: 12, color: "#111827", bold: true },
        tableHeader: { bold: true, fontSize: 10, color: "#111827", fillColor: "#f3f4f6" },
        tableCell: { fontSize: 9, color: "#111827" },
      },
      defaultStyle: { font: "Roboto" },
    };

    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `Ценообразование_${fileSlug(selectedNetwork, selectedNetworks)}_${dateStr}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);

    toast({ title: "PDF готов", description: `Файл ${fileName} сформирован и загружен` });
  } catch (error) {
    toast({
      title: "Ошибка экспорта",
      description: error instanceof Error ? error.message : "Не удалось сформировать PDF",
      variant: "destructive",
    });
  }
}
