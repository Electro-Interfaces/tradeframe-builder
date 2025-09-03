import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { NomenclatureList } from '@/components/nomenclature/NomenclatureList';
import { NomenclatureForm } from '@/components/nomenclature/NomenclatureForm';
import { FuelNomenclature } from '@/types/nomenclature';

const Nomenclature: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FuelNomenclature | undefined>();

  const handleEdit = (item: FuelNomenclature) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(undefined);
  };

  const handleSave = () => {
    // Форма сама закроется и обновит список
  };

  return (
    <MainLayout fullWidth={true}>
      <NomenclatureList 
        onEdit={handleEdit}
        onCreate={handleCreate}
      />
      
      <NomenclatureForm
        open={isFormOpen}
        onClose={handleCloseForm}
        item={editingItem}
        onSave={handleSave}
      />
    </MainLayout>
  );
};

export default Nomenclature;