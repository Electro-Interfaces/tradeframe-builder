/**
 * Рантайм-тест InfoCenter (фаза 0): рендер списка инструкций, загрузка тела статьи из
 * markdown (?raw), переключение статьи, фильтрация поиском. Контекст поддержки замокан —
 * проверяем именно компонент «Инфо».
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/SupportContext', () => ({
  useSupportContext: () => ({ infoTarget: null, openInfo: vi.fn() }),
}));
// Без выбранной сети — часть B/контакты/серверный поиск не запрашиваются (проверяем часть A).
vi.mock('@/contexts/SelectionContext', () => ({
  useSelection: () => ({ selectedNetwork: null, selectedTradingPoint: null, selectedStation: null }),
}));

import InfoCenter from '../InfoCenter';

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <InfoCenter />
    </MemoryRouter>,
  );
}

describe('InfoCenter (фаза 0)', () => {
  it('рендерит список всех инструкций', () => {
    renderAt('/');
    fireEvent.click(screen.getByText('Работа с приложением')); // раскрываем секцию
    fireEvent.click(screen.getByText('Общее'));                 // и подразделы (категории)
    fireEvent.click(screen.getByText('Торговые сети'));
    fireEvent.click(screen.getByText('Торговая точка'));
    const nav = screen.getByRole('navigation', { name: 'Разделы' });
    expect(within(nav).getByText('С чего начать')).toBeInTheDocument();
    expect(within(nav).getByText('Оборудование и связь')).toBeInTheDocument();
    expect(within(nav).getByText('Ценообразование сети')).toBeInTheDocument();
  });

  it('по роуту /network/pricing открывает привязанную статью (тело из markdown)', async () => {
    renderAt('/network/pricing');
    // h2 «Основной сценарий» есть только в теле network-pricing.md
    expect(await screen.findByText('Основной сценарий')).toBeInTheDocument();
  });

  it('переключает статью по клику в списке', async () => {
    renderAt('/');
    fireEvent.click(screen.getByText('Работа с приложением'));
    fireEvent.click(screen.getByText('Торговые сети')); // раскрываем подраздел
    const nav = screen.getByRole('navigation', { name: 'Разделы' });
    fireEvent.click(within(nav).getByText('Ценообразование сети'));
    expect(await screen.findByText('Основной сценарий')).toBeInTheDocument();
  });

  it('фильтрует список поиском', () => {
    renderAt('/');
    fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'цен' } });
    const nav = screen.getByRole('navigation', { name: 'Разделы' });
    expect(within(nav).getByText('Ценообразование сети')).toBeInTheDocument();
    expect(within(nav).queryByText('Оборудование и связь')).not.toBeInTheDocument();
  });

  it('секция и подразделы свёрнуты по умолчанию, раскрываются по клику', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Разделы' });
    expect(within(nav).queryByText('С чего начать')).not.toBeInTheDocument(); // всё свёрнуто
    fireEvent.click(screen.getByText('Работа с приложением')); // раскрыли секцию
    expect(within(nav).getByText('Общее')).toBeInTheDocument(); // виден подраздел
    expect(within(nav).queryByText('С чего начать')).not.toBeInTheDocument(); // но не его пункты
    fireEvent.click(screen.getByText('Общее')); // раскрыли подраздел
    expect(within(nav).getByText('С чего начать')).toBeInTheDocument();
  });
});
