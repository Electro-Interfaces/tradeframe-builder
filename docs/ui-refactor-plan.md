Refactor Plan — Apply Networks/Trading Points Styles Across App

Objective
Unify look & feel across all sections by adopting tokens and the shared utilities introduced in `src/index.css`.

Phases
1) Baseline utilities (done)
   - Added `.dialog-surface`, `.section`, `.card-panel`, `.page-toolbar`, `.table-wrap`, `.table-row-hover`, `.input-surface`.

2) Reference section alignment
   - Update Networks & Trading Points to use the utilities (no visual change intended):
     - Replace `bg-slate-800/700`, `border-slate-700/600`, `text-slate-200/400` with tokenized utilities and classes.
     - Wrap tables with `.table-wrap`; apply `.table-row-hover` to rows.
     - Apply `.dialog-surface` to dialogs; `.input-surface` to inputs in dialogs.
     - Use `.page-toolbar` for the search/action bar.

3) Rollout to adjacent sections
   - Target pages with similar patterns first: `ComponentTypes`, `EquipmentTypes`, `Commands`, `NotificationRules`.
   - Replace raw slate classes and align paddings/gaps per checklist.

4) Mobile review
   - Ensure each data-dense view keeps the `table (md+) / card list (sm)` pattern.
   - Validate tap-target sizes (32–36px icons, 16px vertical paddings) and typography on 360–414px widths.

5) Cleanup & guardrails
   - Grep for `bg-slate|text-slate|border-slate` and replace with tokens/utilities.
   - Optionally introduce lint rule or code mod later to avoid regressions.

Notes
- No functional logic changes; purely presentational alignment.
- If a section requires stronger contrast, use `bg-popover` or `bg-muted` selectively but keep borders as `border-border`.

