import { useState, useCallback } from 'react';
import { Network } from '@/types/network';
import { TradingPoint } from '@/types/tradingpoint';

interface DialogState<T> {
  open: boolean;
  item: T | null;
}

interface UseNetworkDialogsReturn {
  // Network dialogs
  createNetworkDialog: DialogState<null>;
  editNetworkDialog: DialogState<Network>;
  deleteNetworkDialog: DialogState<Network>;

  // Trading Point dialogs
  createPointDialog: DialogState<null>;
  editPointDialog: DialogState<TradingPoint>;
  deletePointDialog: DialogState<TradingPoint>;

  // Network actions
  openCreateNetworkDialog: () => void;
  openEditNetworkDialog: (network: Network) => void;
  openDeleteNetworkDialog: (network: Network) => void;
  closeNetworkDialogs: () => void;

  // Trading Point actions
  openCreatePointDialog: () => void;
  openEditPointDialog: (point: TradingPoint) => void;
  openDeletePointDialog: (point: TradingPoint) => void;
  closePointDialogs: () => void;
}

export function useNetworkDialogs(): UseNetworkDialogsReturn {
  // Network dialogs state
  const [createNetworkDialog, setCreateNetworkDialog] = useState<DialogState<null>>({
    open: false,
    item: null
  });

  const [editNetworkDialog, setEditNetworkDialog] = useState<DialogState<Network>>({
    open: false,
    item: null
  });

  const [deleteNetworkDialog, setDeleteNetworkDialog] = useState<DialogState<Network>>({
    open: false,
    item: null
  });

  // Trading Point dialogs state
  const [createPointDialog, setCreatePointDialog] = useState<DialogState<null>>({
    open: false,
    item: null
  });

  const [editPointDialog, setEditPointDialog] = useState<DialogState<TradingPoint>>({
    open: false,
    item: null
  });

  const [deletePointDialog, setDeletePointDialog] = useState<DialogState<TradingPoint>>({
    open: false,
    item: null
  });

  // Network actions
  const openCreateNetworkDialog = useCallback(() => {
    setCreateNetworkDialog({ open: true, item: null });
  }, []);

  const openEditNetworkDialog = useCallback((network: Network) => {
    setEditNetworkDialog({ open: true, item: network });
  }, []);

  const openDeleteNetworkDialog = useCallback((network: Network) => {
    setDeleteNetworkDialog({ open: true, item: network });
  }, []);

  const closeNetworkDialogs = useCallback(() => {
    setCreateNetworkDialog({ open: false, item: null });
    setEditNetworkDialog({ open: false, item: null });
    setDeleteNetworkDialog({ open: false, item: null });
  }, []);

  // Trading Point actions
  const openCreatePointDialog = useCallback(() => {
    setCreatePointDialog({ open: true, item: null });
  }, []);

  const openEditPointDialog = useCallback((point: TradingPoint) => {
    setEditPointDialog({ open: true, item: point });
  }, []);

  const openDeletePointDialog = useCallback((point: TradingPoint) => {
    setDeletePointDialog({ open: true, item: point });
  }, []);

  const closePointDialogs = useCallback(() => {
    setCreatePointDialog({ open: false, item: null });
    setEditPointDialog({ open: false, item: null });
    setDeletePointDialog({ open: false, item: null });
  }, []);

  return {
    createNetworkDialog,
    editNetworkDialog,
    deleteNetworkDialog,
    createPointDialog,
    editPointDialog,
    deletePointDialog,
    openCreateNetworkDialog,
    openEditNetworkDialog,
    openDeleteNetworkDialog,
    closeNetworkDialogs,
    openCreatePointDialog,
    openEditPointDialog,
    openDeletePointDialog,
    closePointDialogs
  };
}
