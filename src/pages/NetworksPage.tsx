import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HelpButton } from "@/components/help/HelpButton";
import { NetworkCreateDialog } from "@/components/dialogs/NetworkCreateDialog";
import { NetworkEditDialog } from "@/components/dialogs/NetworkEditDialog";
import { NameConfirmationDialog } from "@/components/dialogs/NameConfirmationDialog";
import { TradingPointCreateDialog } from "@/components/dialogs/TradingPointCreateDialog";
import { TradingPointEditDialog } from "@/components/dialogs/TradingPointEditDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { useNetworks } from "./NetworksPage/hooks/useNetworks";
import { useTradingPoints } from "./NetworksPage/hooks/useTradingPoints";
import { useNetworkDialogs } from "./NetworksPage/hooks/useNetworkDialogs";
import { NetworksSection } from "./NetworksPage/components/NetworksSection";
import { TradingPointsSection } from "./NetworksPage/components/TradingPointsSection";
import { NetworkInput } from "@/types/network";
import { TradingPointInput, TradingPointUpdateInput } from "@/types/tradingpoint";
import { tradingPointsService } from "@/services/tradingPointsService";
import { useToast } from "@/hooks/use-toast";

export default function NetworksPage() {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedTradingPoint, setSelectedTradingPoint } = useSelection();
  const { toast } = useToast();

  // Custom hooks для управления состоянием
  const networksState = useNetworks();
  const tradingPointsState = useTradingPoints(networksState.selectedNetworkId);
  const dialogsState = useNetworkDialogs();

  // Фильтрация торговых точек по поисковому запросу
  const filteredTradingPoints = useMemo(() => {
    if (!searchTerm.trim()) {
      return tradingPointsState.tradingPoints;
    }
    return tradingPointsState.searchTradingPoints(searchTerm);
  }, [tradingPointsState.tradingPoints, searchTerm, tradingPointsState.searchTradingPoints]);

  // Network handlers
  const handleCreateNetwork = async (input: NetworkInput) => {
    await networksState.createNetwork(input);
    dialogsState.closeNetworkDialogs();
  };

  const handleUpdateNetwork = async (id: string, input: NetworkInput) => {
    await networksState.updateNetwork(id, input);
    dialogsState.closeNetworkDialogs();
  };

  const handleDeleteNetworkConfirm = async () => {
    if (!dialogsState.deleteNetworkDialog.item) return;

    try {
      await networksState.deleteNetwork(dialogsState.deleteNetworkDialog.item.id);
      dialogsState.closeNetworkDialogs();
    } catch (error) {
      // Error handled in hook
    }
  };

  // Trading Point handlers
  const handleCreateTradingPoint = async (input: TradingPointInput) => {
    if (!networksState.selectedNetworkId) return;

    await tradingPointsState.createTradingPoint({
      ...input,
      networkId: networksState.selectedNetworkId
    });

    // Перезагружаем сети для обновления счетчика точек
    await networksState.loadNetworks();

    dialogsState.closePointDialogs();
  };

  const handleUpdateTradingPoint = async (id: string, input: TradingPointUpdateInput) => {
    const updated = await tradingPointsState.updateTradingPoint(id, input);

    // Если изменился external_id, обновляем выбранную точку в контексте
    if (updated && selectedTradingPoint === id) {
      setSelectedTradingPoint(updated.id);
    }

    dialogsState.closePointDialogs();
  };

  const handleDeleteTradingPointConfirm = async () => {
    if (!dialogsState.deletePointDialog.item) return;

    try {
      await tradingPointsState.deleteTradingPoint(dialogsState.deletePointDialog.item.id);

      // Перезагружаем сети для обновления счетчика точек
      await networksState.loadNetworks();

      dialogsState.closePointDialogs();
    } catch (error) {
      // Error handled in hook
    }
  };

  // Обработчики для внешних кодов торговых точек
  const handlePointAddExternalCode = async (
    pointId: string,
    system: string,
    code: string,
    description?: string
  ) => {
    try {
      await tradingPointsService.addExternalCode(pointId, system, code, description);
      // Перезагружаем торговые точки для обновления данных
      if (networksState.selectedNetworkId) {
        await tradingPointsState.loadTradingPoints(networksState.selectedNetworkId);
      }
      toast({
        title: 'Код добавлен',
        description: `Внешний код ${code} (${system}) успешно добавлен`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast({
        title: 'Ошибка',
        description: message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handlePointUpdateExternalCode = async (
    pointId: string,
    codeId: string,
    system: string,
    code: string,
    description?: string,
    isActive?: boolean
  ) => {
    try {
      await tradingPointsService.updateExternalCode(pointId, codeId, system, code, description, isActive);
      if (networksState.selectedNetworkId) {
        await tradingPointsState.loadTradingPoints(networksState.selectedNetworkId);
      }
      toast({
        title: 'Код обновлён',
        description: `Внешний код ${code} (${system}) успешно обновлён`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast({
        title: 'Ошибка',
        description: message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handlePointRemoveExternalCode = async (pointId: string, codeId: string) => {
    try {
      await tradingPointsService.removeExternalCode(pointId, codeId);
      if (networksState.selectedNetworkId) {
        await tradingPointsState.loadTradingPoints(networksState.selectedNetworkId);
      }
      toast({
        title: 'Код удалён',
        description: 'Внешний код успешно удалён'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast({
        title: 'Ошибка',
        description: message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  if (networksState.loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Настройки сетей и торговых точек</h1>
          </div>
          <div className="bg-slate-800 mb-6 w-full rounded-lg">
            <div className="px-4 md:px-6 py-4">
              <div className="text-white">Загрузка...</div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Настройки сетей и торговых точек</h1>
            <HelpButton route="/admin/networks" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Секция торговых сетей */}
        <NetworksSection
          networks={networksState.networks}
          loading={networksState.loading}
          selectedNetworkId={networksState.selectedNetworkId}
          actionLoading={networksState.actionLoading}
          isMobile={isMobile}
          onSelect={networksState.setSelectedNetworkId}
          onEdit={dialogsState.openEditNetworkDialog}
          onDelete={dialogsState.openDeleteNetworkDialog}
          onCreateClick={dialogsState.openCreateNetworkDialog}
        />

        {/* Секция торговых точек */}
        <TradingPointsSection
          selectedNetwork={networksState.selectedNetwork}
          tradingPoints={tradingPointsState.tradingPoints}
          filteredTradingPoints={filteredTradingPoints}
          loading={tradingPointsState.loading}
          actionLoading={tradingPointsState.actionLoading}
          isMobile={isMobile}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEdit={dialogsState.openEditPointDialog}
          onDelete={dialogsState.openDeletePointDialog}
          onCreateClick={dialogsState.openCreatePointDialog}
        />

        {/* Network Dialogs */}
        <NetworkCreateDialog
          open={dialogsState.createNetworkDialog.open}
          onOpenChange={dialogsState.closeNetworkDialogs}
          onSubmit={handleCreateNetwork}
        />

        <NetworkEditDialog
          open={dialogsState.editNetworkDialog.open}
          onOpenChange={dialogsState.closeNetworkDialogs}
          network={dialogsState.editNetworkDialog.item}
          onSubmit={handleUpdateNetwork}
        />

        <NameConfirmationDialog
          open={dialogsState.deleteNetworkDialog.open}
          onOpenChange={dialogsState.closeNetworkDialogs}
          onConfirm={handleDeleteNetworkConfirm}
          itemName={dialogsState.deleteNetworkDialog.item?.name || ""}
          itemType="сеть"
          title="Удалить торговую сеть"
          description="Это действие удалит торговую сеть и все её торговые точки. Данное действие нельзя отменить."
          loading={networksState.actionLoading?.startsWith('delete-') || false}
        />

        {/* Trading Point Dialogs */}
        <TradingPointCreateDialog
          open={dialogsState.createPointDialog.open}
          onOpenChange={dialogsState.closePointDialogs}
          networkId={networksState.selectedNetworkId!}
          onSubmit={handleCreateTradingPoint}
        />

        <TradingPointEditDialog
          open={dialogsState.editPointDialog.open}
          onOpenChange={dialogsState.closePointDialogs}
          tradingPoint={dialogsState.editPointDialog.item}
          onSubmit={handleUpdateTradingPoint}
          onAddExternalCode={handlePointAddExternalCode}
          onUpdateExternalCode={handlePointUpdateExternalCode}
          onRemoveExternalCode={handlePointRemoveExternalCode}
        />

        <NameConfirmationDialog
          open={dialogsState.deletePointDialog.open}
          onOpenChange={dialogsState.closePointDialogs}
          onConfirm={handleDeleteTradingPointConfirm}
          itemName={dialogsState.deletePointDialog.item?.name || ""}
          itemType="торговую точку"
          title="Удалить торговую точку"
          description="Это действие безвозвратно удалит торговую точку и все её данные."
          loading={tradingPointsState.actionLoading === 'delete'}
        />
      </div>
    </MainLayout>
  );
}
