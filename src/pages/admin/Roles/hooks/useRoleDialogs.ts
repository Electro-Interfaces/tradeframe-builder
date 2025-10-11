import { useState, useCallback } from 'react';
import type { Role } from '@/types/auth';

interface DialogState<T> {
  open: boolean;
  role: T | null;
}

interface UseRoleDialogsReturn {
  // Edit dialog
  editDialog: DialogState<Role>;
  openEditDialog: (role: Role) => void;
  openCreateDialog: () => void;
  closeEditDialog: () => void;

  // Delete dialog
  deleteDialog: DialogState<Role>;
  openDeleteDialog: (role: Role) => void;
  closeDeleteDialog: () => void;
}

/**
 * Хук для управления состояниями диалогов ролей
 */
export function useRoleDialogs(): UseRoleDialogsReturn {
  // Edit/Create dialog state
  const [editDialog, setEditDialog] = useState<DialogState<Role>>({
    open: false,
    role: null
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<DialogState<Role>>({
    open: false,
    role: null
  });

  // Edit dialog actions
  const openEditDialog = useCallback((role: Role) => {
    setEditDialog({ open: true, role });
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditDialog({ open: true, role: null });
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditDialog({ open: false, role: null });
  }, []);

  // Delete dialog actions
  const openDeleteDialog = useCallback((role: Role) => {
    setDeleteDialog({ open: true, role });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, role: null });
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
