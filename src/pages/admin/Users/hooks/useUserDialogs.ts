import { useState, useCallback } from 'react';
import { User as UserType } from '@/types/auth';

interface DialogState<T> {
  open: boolean;
  user: T | null;
}

interface UseUserDialogsReturn {
  // Edit dialog
  editDialog: DialogState<UserType>;
  openEditDialog: (user: UserType) => void;
  openCreateDialog: () => void;
  closeEditDialog: () => void;

  // Delete dialog
  deleteDialog: DialogState<UserType>;
  openDeleteDialog: (user: UserType) => void;
  closeDeleteDialog: () => void;
}

export function useUserDialogs(): UseUserDialogsReturn {
  // Edit/Create dialog state
  const [editDialog, setEditDialog] = useState<DialogState<UserType>>({
    open: false,
    user: null
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<DialogState<UserType>>({
    open: false,
    user: null
  });

  // Edit dialog actions
  const openEditDialog = useCallback((user: UserType) => {
    setEditDialog({ open: true, user });
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditDialog({ open: true, user: null });
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditDialog({ open: false, user: null });
  }, []);

  // Delete dialog actions
  const openDeleteDialog = useCallback((user: UserType) => {
    setDeleteDialog({ open: true, user });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, user: null });
  }, []);

  return {
    editDialog,
    openEditDialog,
    openCreateDialog,
    closeEditDialog,
    deleteDialog,
    openDeleteDialog,
    closeDeleteDialog
  };
}
