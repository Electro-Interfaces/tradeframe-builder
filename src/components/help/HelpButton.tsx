/**
 * Кнопка помощи для отображения инструкций к страницам
 * Временно скрыта - возвращает null
 */

import React from 'react';

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
  // Кнопка помощи скрыта - возвращаем null
  return null;
}