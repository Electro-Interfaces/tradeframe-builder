UI Audit — Networks & Trading Points

Scope
- Reference pages: `src/pages/NetworksPage.tsx`, dialogs under `src/components/dialogs/*` related to networks/points.
- Goal: lock in sizes, paddings, colors, radii, shadows, and responsive behavior to replicate across other sections.

Design Tokens (current)
- Colors: use Tailwind tokens mapped to CSS vars
  - Backgrounds: `bg-background`, `bg-card`, `bg-popover`, `bg-accent`
  - Borders: `border-border`
  - Text: `text-foreground`, `text-muted-foreground`
  - Status: `text-success`, `text-warning`, `text-error` (via `hsl(var(--success))` etc.)
- Radius: `rounded-lg` (driven by `--radius` ≈ 12px), `rounded-md` for inner items.
- Shadows: `shadow-soft`, `shadow-medium` (from CSS vars).
- Header height: `pt-header` space variable aligns content below header.

Surface & Containers
- Panels/cards: rounded, bordered surfaces with soft shadow.
  - Standard: `rounded-lg border border-border bg-card shadow-soft`.
  - Paddings: `p-4 md:p-6` for section blocks; tables/toolbars use `p-3 md:p-4`.
  - Utility classes added: `.section`, `.card-panel`, `.page-toolbar`.

Tables (desktop)
- Wrapper: rounded container with border and horizontal scroll when needed.
  - Use: `overflow-x-auto w-full rounded-lg border border-border` or `.table-wrap`.
- Header cells: `px-6 py-4 text-left text-foreground font-medium` (was `text-slate-200`).
- Body cells: `px-6 py-4` with contextual text colors; dates often `text-muted-foreground`.
- Row behavior: bottom border and soft hover.
  - Use: `border-b border-border hover:bg-accent/10 transition-colors` or `.table-row-hover`.
- Row height: implicit via `py-4` (~56px total); keep 52–56px.

Lists (mobile)
- Pattern: `hidden md:block` table, plus `md:hidden` card list.
- Card item: `rounded-lg p-4` with subtle hover.
  - Background mapping: use `bg-card` for base, hover `hover:bg-accent/10`.
- Item content: title `text-foreground`, subtext `text-muted-foreground`, status `Badge`.

Toolbars
- Search + actions grouped in a bordered surface.
  - Use: `.page-toolbar` (bg, border, rounded, `p-3 md:p-4`).
- Controls spacing: `gap-2 md:gap-3` minimal; icon buttons are 32px–36px square.

Buttons & Icons
- Small icon buttons: `h-8 w-8 p-0` with ghost/outline variants.
- Icon sizes: list/table actions `h-4 w-4` desktop, `h-3 w-3` mobile.

Inputs (dialogs, filters)
- Use shadcn `Input`, `Select`, `Textarea` with className to match surface.
  - Utility: `.input-surface` for dark surface inputs (maps to `bg-muted border-border text-foreground placeholder-muted-foreground`).

Dialogs
- Dialog content surface: map to tokens instead of raw slate.
  - Utility: `.dialog-surface` (maps to `bg-card border-border`).
- Width: networks uses `max-w-4xl`, trading point create uses `max-w-4xl` with `max-h-[90vh]` and scroll.

Spacing Scale (observed)
- Section padding: 16px mobile, 24px desktop (`p-4 md:p-6`).
- Table cells: `px-6` (24px), `py-4` (16px).
- Toolbar: `p-3` (12px) mobile, `p-4` (16px) desktop.
- Gaps: `gap-2` (8px) compact, `gap-3` (12px) default in toolbars/actions.

Color Mapping (slate → tokens)
- `bg-slate-800` → `bg-card`
- `bg-slate-700/600` hovers → `hover:bg-accent/10` (or `hover:bg-muted` for stronger)
- `border-slate-700/600` → `border-border`
- `text-white`/`text-slate-200` → `text-foreground`
- `text-slate-400` → `text-muted-foreground`
- `placeholder-slate-400` → `placeholder-muted-foreground` (via `.input-surface`)

Breakpoints & Responsiveness
- Use `md` as the swap point table↔cards for dense data.
- Preserve `pt-header` spacing in scrollable panes.
- Maintain horizontal scrolling for tables rather than shrinking text.

Reference Files
- Networks page: `src/pages/NetworksPage.tsx`
- Dialogs: `src/components/dialogs/NetworkCreateDialog.tsx`, `TradingPointCreateDialog.tsx`
- Shared tokens: `tailwind.config.ts`, `src/index.css`

