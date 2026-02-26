/**
 * Утилиты для работы с приоритетами видов топлива
 */

/**
 * Получить приоритет вида топлива для сортировки
 * Чем меньше число - тем выше в списке
 */
export const getFuelPriority = (fuelType: string): number => {
  const fuel = fuelType.toLowerCase();

  // Бензины (АИ-98, АИ-95, АИ-92, АИ-91, АИ-80)
  if (fuel.includes('аи-98') || fuel.includes('98')) return 1;
  if (fuel.includes('аи-95') || fuel.includes('95')) return 2;
  if (fuel.includes('аи-92') || fuel.includes('92')) return 3;
  if (fuel.includes('аи-91') || fuel.includes('91')) return 4;
  if (fuel.includes('аи-80') || fuel.includes('80')) return 5;
  if (fuel.includes('бензин') || fuel.includes('gasoline') || fuel.includes('petrol')) return 6;

  // Дизельное топливо (включая "Диз. топливо", "Диз.топливо зимн" и т.д.)
  if ((fuel.includes('дт') || fuel.includes('диз')) && (fuel.includes('зимн') || fuel.includes('зимний'))) return 11;
  if ((fuel.includes('дт') || fuel.includes('диз')) && (fuel.includes('летн') || fuel.includes('летний'))) return 12;
  if ((fuel.includes('дт') || fuel.includes('диз')) && (fuel.includes('аркт') || fuel.includes('арктический'))) return 13;
  if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('диз') || fuel.includes('diesel')) return 10;

  // Прочие виды топлива
  if (fuel.includes('газ') || fuel.includes('газовый') || fuel.includes('gas')) return 20;
  if (fuel.includes('керосин') || fuel.includes('kerosene')) return 21;
  if (fuel.includes('масло') || fuel.includes('oil')) return 22;

  return 99; // Неизвестные типы в конец
};

/**
 * Сортировка массива видов топлива по приоритету
 */
export const sortFuelTypes = (fuelTypes: string[]): string[] => {
  return [...fuelTypes].sort((a, b) => {
    const priorityA = getFuelPriority(a);
    const priorityB = getFuelPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.localeCompare(b, 'ru');
  });
};
