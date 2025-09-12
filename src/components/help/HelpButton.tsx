/**
 * Кнопка помощи для отображения инструкций к страницам
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { InstructionModal } from './InstructionModal';

interface HelpButtonProps {
  route?: string; // Маршрут страницы (например, "/dashboard")
  helpKey?: string; // Ключ инструкции (например, "dashboard")
  variant?: 'icon' | 'text'; // Вариант отображения
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HelpButton({ 
  route, 
  helpKey, 
  variant = 'icon', 
  size = 'sm',
  className = '' 
}: HelpButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Определяем ключ для поиска инструкции
  const instructionKey = helpKey || route || window.location.pathname;
  
  const handleClick = () => {
    setIsModalOpen(true);
  };

  const buttonSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10', 
    lg: 'h-12 w-12'
  };

  if (variant === 'text') {
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={handleClick}
          className={`bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white ${className}`}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
        
        <InstructionModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          instructionKey={instructionKey}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        className={`${buttonSizes[size]} bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-white hover:border-slate-500 transition-all duration-200 ${className}`}
        title="Показать инструкции для этой страницы"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>
      
      <InstructionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        instructionKey={instructionKey}
      />
    </>
  );
}