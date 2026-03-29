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

        {/* Page header — Deep Intel style */}
        <div className="mb-6 pt-4">
          <div className="flex items-end justify-between gap-4">
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
                  className="border-border/30 dark:border-di-outline-variant/15 text-muted-foreground hover:bg-secondary dark:hover:bg-di-surface-high"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFromSTSAPI ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {stsApiConfigured && currentPrices.length > 0 && (
                <Button
                  onClick={() => handleSetPrices(isMobile)}
                  variant="outline"
                  size="sm"
                  disabled={isSettingPrices || !selectedTradingPoint || selectedTradingPoint === 'all'}
                  className="border-green-600 dark:border-green-500/50 text-green-600 dark:text-green-400 hover:bg-emerald-600 hover:text-white"
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
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
              {[1, 2, 3, 4].map((n) => (
                isMobile ? (
                  <div key={n} className="bg-card border border-border rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-3.5 w-14 bg-secondary rounded animate-pulse mb-1.5"></div>
                        <div className="h-2.5 w-10 bg-secondary rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 w-16 bg-secondary rounded animate-pulse mb-1"></div>
                        <div className="h-2 w-8 bg-secondary rounded animate-pulse ml-auto"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={n} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-secondary rounded animate-pulse"></div>
                      <div className="h-4 w-20 bg-secondary rounded animate-pulse"></div>
                    </div>
                    <div className="h-5 w-16 bg-secondary rounded animate-pulse mb-3"></div>
                    <div className="border-t border-border pt-3 text-right">
                      <div className="h-7 w-24 bg-secondary rounded animate-pulse ml-auto mb-1"></div>
                      <div className="h-3 w-10 bg-secondary rounded animate-pulse ml-auto"></div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div>
            <div className={`text-center ${isMobile ? 'py-8' : 'py-16'}`}>
              <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-secondary rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className={`text-foreground ${isMobile ? 'text-xl' : 'text-2xl'}`}>{"\uD83D\uDCB0"}</span>
              </div>
              <h3 className={`font-semibold text-foreground mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                Нет цен
              </h3>
              <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Создайте первую цену на топливо
              </p>
              <Button
                onClick={handleCreatePrice}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size={isMobile ? "default" : "sm"}
              >
                <Plus className="w-4 h-4" />
                <span className={isMobile ? "ml-2" : "ml-1"}>Создать цену</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
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
          <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] overflow-y-auto' : 'max-w-2xl'}`}>
            <DialogHeader>
              <DialogTitle>
                {selectedPrice ? 'Редактировать цену' : 'Новая цена на топливо'}
              </DialogTitle>
              <DialogDescription>
                {selectedPrice
                  ? 'Измените параметры цены на выбранный вид топлива'
                  : 'Создайте новую цену для конкретного вида топлива'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Fuel type */}
                <div className="space-y-2">
                  <Label>Вид топлива *</Label>
                  <Select
                    value={form.watch("fuelId")}
                    onValueChange={(value) => form.setValue("fuelId", value)}
                  >
                    <SelectTrigger>
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
                    <p className="text-red-500 text-sm">{form.formState.errors.fuelId.message}</p>
                  )}
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <Label>Единица измерения *</Label>
                  <Select
                    value={form.watch("unit")}
                    onValueChange={(value) => form.setValue("unit", value)}
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Цена (\u20BD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("priceNet", { valueAsNumber: true })}
                  />
                  {form.formState.errors.priceNet && (
                    <p className="text-red-500 text-sm">{form.formState.errors.priceNet.message}</p>
                  )}
                </div>
              </div>

              {/* Apply date */}
              <div className="space-y-2">
                <Label>Применить с *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("applyAt") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("applyAt") ? (
                        format(form.watch("applyAt"), "dd.MM.yyyy HH:mm", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea
                  placeholder="Причина изменения цены..."
                  {...form.register("comment")}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
