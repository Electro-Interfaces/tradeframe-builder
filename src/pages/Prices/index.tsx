import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceCard } from "@/components/prices/PriceCard";
import { PriceHistoryTable } from "@/components/prices/PriceHistoryTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Edit,
  Fuel,
  Plus,
  RefreshCw,
} from "lucide-react";
import { SelectTradingPointMessage } from "@/components/common/SelectTradingPointMessage";
import { LastDataTransfer } from "@/components/common/LastDataTransfer";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";

import { PriceSetDialog } from "./components/PriceSetDialog";
import { PriceScheduleDialog } from "./components/PriceScheduleDialog";
import {
  usePricesData,
  fuelNomenclature,
  formatPrice,
  getStatusColor,
  getStatusText,
  getSourceColor,
  getSourceText,
  type FuelPrice,
  type PriceJournalEntry,
} from "./hooks/usePricesData";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active": return <CheckCircle className="w-4 h-4" />;
    case "scheduled": return <Clock className="w-4 h-4" />;
    case "expired": return <XCircle className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

// Validation schemas
const priceFormSchema = z.object({
  fuelId: z.string().min(1, "Выберите вид топлива"),
  priceNet: z.number().min(0, "Цена должна быть положительной"),
  vatRate: z.number().optional(),
  unit: z.string().min(1, "Выберите единицу измерения"),
  applyAt: z.date({ required_error: "Укажите дату применения" }),
  comment: z.string().optional(),
  overrideNetwork: z.boolean().default(false),
  fixUntil: z.date().optional()
});

type PriceFormData = z.infer<typeof priceFormSchema>;

export function Prices() {
  const isMobile = useIsMobile();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<FuelPrice | null>(null);

  const {
    currentPrices,
    setCurrentPrices,
    journalEntries,
    setJournalEntries,
    isInitialLoading,
    editingPriceId,
    editingValue,
    hasChanges,
    isSavingInline,
    stsApiConfigured,
    loadingFromSTSAPI,
    isSetPricesDialogOpen,
    setIsSetPricesDialogOpen,
    pricesForUpdate,
    setPricesForUpdate,
    effectiveDateTime,
    setEffectiveDateTime,
    isSettingPrices,
    priceSchedule,
    isLoadingSchedule,
    pageReady,
    filteredPrices,
    selectedTradingPoint,
    selectedNetwork,
    loadPricesFromSTSAPI,
    handleRefreshData,
    handleSetPrices,
    handleConfirmSetPrices,
    handleInlineEdit,
    handleEditingValueChange,
    handleCancelInlineEdit,
    handleSaveInlinePrice,
  } = usePricesData();

  // Слушаем кнопку обновления из BottomNav
  useEffect(() => {
    const handler = () => handleRefreshData();
    window.addEventListener('bottomnav-refresh', handler);
    return () => window.removeEventListener('bottomnav-refresh', handler);
  }, [handleRefreshData]);

  const form = useForm<PriceFormData>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: {
      priceNet: 0,
      vatRate: 0,
      unit: "Л",
      applyAt: new Date(),
      overrideNetwork: false
    }
  });

  const {
    pullState,
    pullDistance,
    scrollContainerRef
  } = usePullToRefresh({
    onRefresh: handleRefreshData,
    enabled: isMobile,
    pullThreshold: 80,
    maxPullDistance: 120,
    indicatorAppearThreshold: 30
  });

  // Handlers
  const handleCreatePrice = () => {
    form.reset();
    setSelectedPrice(null);
    setIsFormDialogOpen(true);
  };

  const handleEditPrice = (price: FuelPrice) => {
    setSelectedPrice(price);
    const fuelType = fuelNomenclature.find(f => f.name === price.fuelType);
    form.reset({
      fuelId: fuelType?.id || "",
      priceNet: price.priceNet / 100,
      vatRate: 0,
      unit: price.unit,
      applyAt: new Date(),
      overrideNetwork: false
    });
    setIsFormDialogOpen(true);
  };

  const onSubmit = (data: PriceFormData) => {
    const grossPrice = data.priceNet * 100;
    const fuelType = fuelNomenclature.find(f => f.id === data.fuelId);

    if (selectedPrice) {
      setCurrentPrices(prev => prev.map(p =>
        p.id === selectedPrice.id
          ? {
            ...p,
            priceNet: data.priceNet * 100,
            vatRate: 0,
            priceGross: grossPrice,
            unit: data.unit,
            appliedFrom: format(data.applyAt, "dd.MM.yyyy HH:mm"),
            status: data.applyAt > new Date() ? "scheduled" : "active"
          }
          : p
      ));
      if (!isMobile) {
        toast({
          title: "Цена обновлена",
          description: `Цена на ${fuelType?.name} успешно обновлена.`,
        });
      }
    } else {
      const newPrice: FuelPrice = {
        id: Date.now().toString(),
        fuelType: fuelType?.name || "",
        fuelCode: fuelType?.internal_code || "",
        priceNet: data.priceNet * 100,
        vatRate: 0,
        priceGross: grossPrice,
        unit: data.unit,
        appliedFrom: format(data.applyAt, "dd.MM.yyyy HH:mm"),
        status: data.applyAt > new Date() ? "scheduled" : "active",
        tradingPoint: "АЗС-1 на Московской",
        networkId: "net1"
      };
      setCurrentPrices(prev => [...prev, newPrice]);
      if (!isMobile) {
        toast({
          title: "Цена создана",
          description: `Цена на ${fuelType?.name} успешно создана.`,
        });
      }
    }

    // Add journal entry
    const journalEntry: PriceJournalEntry = {
      id: Date.now().toString(),
      timestamp: format(new Date(), "dd.MM.yyyy HH:mm"),
      fuelType: fuelType?.name || "",
      fuelCode: fuelType?.internal_code || "",
      priceNet: data.priceNet * 100,
      priceGross: grossPrice,
      vatRate: 0,
      source: "manual",
      packageId: `pkg_${Date.now()}`,
      status: data.applyAt > new Date() ? "scheduled" : "applied",
      authorName: "Текущий пользователь",
      tradingPoint: "АЗС-1 на Московской"
    };
    setJournalEntries(prev => [journalEntry, ...prev]);

    setIsFormDialogOpen(false);
  };

  // Check trading point selection
  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout fullWidth={true}>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку в селекторе для управления ценами на топливо" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full h-full relative ${isMobile ? 'px-2' : 'px-4 md:px-6 lg:px-8'}`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {isMobile && <PullToRefreshIndicator pullState={pullState} pullDistance={pullDistance} />}

        {/* Page header */}
        <div className="mb-6 pt-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className={`font-headline font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>Цены</h1>
              <LastDataTransfer />
            </div>
            <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'} items-center shrink-0`}>
              {!isMobile && (
                <Button
                  onClick={loadPricesFromSTSAPI}
                  variant="outline"
                  size="sm"
                  disabled={loadingFromSTSAPI}
                  
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFromSTSAPI ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {stsApiConfigured && currentPrices.length > 0 && (
                <Button
                  onClick={() => handleSetPrices(isMobile)}
                  size="sm"
                  disabled={isSettingPrices || !selectedTradingPoint || selectedTradingPoint === 'all'}
                  className="bg-di-primary hover:opacity-90 text-white font-semibold"
                >
                  <Edit className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
                  {!isMobile && "Изменить цены"}
                </Button>
              )}
            </div>
          </div>
        </div>


        {/* Price tiles */}
        {isInitialLoading ? (
          <div className="pb-6">
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-di-surface-mid rounded-xl border border-di-outline-variant/10 p-6 space-y-4">
                  <div className="h-3 w-24 bg-di-surface-high rounded-lg animate-pulse" />
                  <div className="h-12 w-36 bg-di-surface-high rounded-lg animate-pulse" />
                  <div className="h-[2px] w-full bg-di-surface-high rounded-full">
                    <div className="h-full bg-di-surface-highest rounded-full w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className={`text-center ${isMobile ? 'py-10' : 'py-16'}`}>
            <div className={`${isMobile ? 'w-14 h-14' : 'w-16 h-16'} rounded-xl bg-di-surface-high flex items-center justify-center mx-auto mb-4`}>
              <Fuel className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7'} text-di-on-surface-variant`} />
            </div>
            <h3 className="font-headline font-bold text-foreground mb-1 text-base">
              Нет данных о ценах
            </h3>
            <p className="text-di-on-surface-variant text-sm mb-5">
              Создайте первую цену на топливо
            </p>
            <Button
              onClick={handleCreatePrice}
              size="sm"
              className="bg-di-primary-light hover:bg-primary text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Создать цену
            </Button>
          </div>
        ) : (
          <div className="mb-6">
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
              {filteredPrices.map((price) => (
                <PriceCard
                  key={price.id}
                  price={price}
                  isMobile={isMobile}
                  editingPriceId={editingPriceId}
                  editingValue={editingValue}
                  hasChanges={hasChanges}
                  isSavingInline={isSavingInline}
                  onInlineEdit={handleInlineEdit}
                  onSaveInlinePrice={() => handleSaveInlinePrice(isMobile)}
                  onCancelInlineEdit={handleCancelInlineEdit}
                  onEditingValueChange={handleEditingValueChange}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          </div>
        )}

        {/* Price history table */}
        {selectedTradingPoint && selectedTradingPoint !== 'all' && (
          <PriceHistoryTable
            priceSchedule={priceSchedule}
            isLoadingSchedule={isLoadingSchedule}
            isMobile={isMobile}
          />
        )}

        {/* Create/edit price dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] overflow-y-auto' : 'max-w-2xl'} bg-card border border-di-outline-variant/20 rounded-xl`}>
            <DialogHeader>
              <DialogTitle className="font-headline font-bold text-foreground">
                {selectedPrice ? 'Редактировать цену' : 'Новая цена на топливо'}
              </DialogTitle>
              <DialogDescription className="text-di-on-surface-variant">
                {selectedPrice
                  ? 'Измените параметры цены на выбранный вид топлива'
                  : 'Создайте новую цену для конкретного вида топлива'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Fuel type */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Вид топлива *</Label>
                  <Select
                    value={form.watch("fuelId")}
                    onValueChange={(value) => form.setValue("fuelId", value)}
                  >
                    <SelectTrigger className="border-di-outline-variant/20 bg-di-surface-lowest">
                      <SelectValue placeholder="Выберите вид топлива" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelNomenclature.map((fuel) => (
                        <SelectItem key={fuel.id} value={fuel.id}>
                          {fuel.name} ({fuel.internal_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.fuelId && (
                    <p className="text-[#f87171] text-xs">{form.formState.errors.fuelId.message}</p>
                  )}
                </div>

                {/* Unit */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Единица измерения *</Label>
                  <Select
                    value={form.watch("unit")}
                    onValueChange={(value) => form.setValue("unit", value)}
                  >
                    <SelectTrigger className="border-di-outline-variant/20 bg-di-surface-lowest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Л">Литр</SelectItem>
                      <SelectItem value="Кг">Килограмм</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Price */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Цена (₽) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="border-di-outline-variant/20 bg-di-surface-lowest font-headline font-bold text-lg"
                    {...form.register("priceNet", { valueAsNumber: true })}
                  />
                  {form.formState.errors.priceNet && (
                    <p className="text-[#f87171] text-xs">{form.formState.errors.priceNet.message}</p>
                  )}
                </div>
              </div>

              {/* Apply date */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Применить с *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-di-outline-variant/20 bg-di-surface-lowest",
                        !form.watch("applyAt") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-di-on-surface-variant" />
                      {form.watch("applyAt") ? (
                        format(form.watch("applyAt"), "dd.MM.yyyy HH:mm", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-di-outline-variant/20">
                    <Calendar
                      mode="single"
                      selected={form.watch("applyAt")}
                      onSelect={(date) => form.setValue("applyAt", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Comment */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Комментарий</Label>
                <Textarea
                  placeholder="Причина изменения цены..."
                  className="border-di-outline-variant/20 bg-di-surface-lowest"
                  {...form.register("comment")}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormDialogOpen(false)}
                  className="border-di-outline-variant/20 text-di-on-surface-variant hover:bg-di-surface-high"
                >
                  Отмена
                </Button>
                <Button type="submit" size="sm" className="bg-di-primary-light hover:bg-primary text-white">
                  {selectedPrice ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Journal dialog */}
        <PriceScheduleDialog
          isMobile={isMobile}
          isOpen={isJournalDialogOpen}
          onOpenChange={setIsJournalDialogOpen}
          journalEntries={journalEntries}
        />

        {/* Set prices dialog */}
        <PriceSetDialog
          isMobile={isMobile}
          isOpen={isSetPricesDialogOpen}
          onOpenChange={setIsSetPricesDialogOpen}
          selectedNetwork={selectedNetwork}
          selectedTradingPoint={selectedTradingPoint}
          pricesForUpdate={pricesForUpdate}
          setPricesForUpdate={setPricesForUpdate}
          effectiveDateTime={effectiveDateTime}
          setEffectiveDateTime={setEffectiveDateTime}
          isSettingPrices={isSettingPrices}
          onConfirmSetPrices={handleConfirmSetPrices}
        />


      </div>
    </MainLayout>
  );
}

export default Prices;
