import { useState } from 'react'

export function useDeleteConfirmDialog(onDelete: (id: string) => Promise<void> | void) {
  const [isOpen, setIsOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const openDialog = (id: string, description: string) => {
    setItemToDelete(id)
    setMessage(`Вы уверены, что хотите удалить ${description}? Это действие нельзя отменить.`)
    setIsOpen(true)
  }

  const closeDialog = () => {
    setIsOpen(false)
    setItemToDelete(null)
    setMessage('')
  }

  const confirm = async () => {
    if (itemToDelete) {
      await onDelete(itemToDelete)
      closeDialog()
    }
  }

  return {
    isOpen,
    message,
    openDialog,
    closeDialog,
    confirm
  }
}