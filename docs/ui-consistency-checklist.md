UI Consistency Checklist

Global
- Use design tokens: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `shadow-soft`.
- Replace raw slate classes with token equivalents (see audit mapping).
- Prefer existing shadcn components from `src/components/ui/*` before custom markup.

Surfaces
- Wrap content blocks in `.section` (padded) or `.card-panel` (unpadded) instead of ad‑hoc `bg-slate-*` + `border-slate-*`.
- Dialogs: add `className="dialog-surface"` to `DialogContent`.

Tables
- Wrapper: `.table-wrap` around table element.
- Rows: add `.table-row-hover` for consistent separators and hover state.
- Cells: `px-6 py-4`; header cells use `text-foreground font-medium`.

Toolbars
- Use `.page-toolbar` for filter/action bars.
- Keep gaps at `gap-3` and icon button size at `h-8 w-8 p-0`.

Inputs & Forms
- Apply `.input-surface` on `Input`, `Textarea`, and `SelectTrigger` when on dark surfaces.
- Placeholder color: rely on token `placeholder-muted-foreground` (via `.input-surface`).

Breakpoints
- Dense data: `hidden md:block` table + `md:hidden` card list pattern.
- Section padding: `p-4 md:p-6`; toolbar `p-3 md:p-4`.

Status & Badges
- Use `Badge` from shadcn and map status colors to tokens (`success`, `warning`, `error`) instead of palette literals.

Spacing & Radii
- Default surface: `rounded-lg` (driven by `--radius`).
- Default gaps: 8–12px (`gap-2` / `gap-3`).

Do/Don’t
- Do: centralize styles via tokens and provided utilities.
- Don’t: use raw palette (`bg-slate-*`, `text-slate-*`, `border-slate-*`) on new/updated code.

