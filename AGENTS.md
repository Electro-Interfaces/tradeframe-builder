# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Vite + React TypeScript client; key subfolders include `components` for reusable UI blocks, `pages` for routed views, `hooks` for shared state, and `utils` for cross-cutting helpers.
- `server/` runs the Express services and scheduled scripts; keep route logic under `server/routes` and isolate integrations in `server/services`.
- `scripts/` holds Node and shell automation, including version sync and multi-agent orchestration.
- Data assets and schema changes live in `database/`, `migrations/`, and `supabase/`; treat these as the single source of truth for production data shape.
- Documentation and static assets reside in `docs/` and `public/`; update them whenever user-facing behaviour shifts.

## Build, Test & Development Commands
- `npm run dev` starts the Vite dev server with hot reload.
- `npm run build` generates the GitHub Pages bundle; use `npm run build:prod` for production-mode builds and `build:dev` for staging profiles.
- `npm run preview` serves the latest build locally.
- `npm run lint`, `npm run lint:fix`, and `npm run type-check` enforce ESLint and TypeScript standards.
- Backend utilities live under `server/`; run `npm install && npm run start` there when working on Express routes, and rely on PM2 via `npm run start:prod` when you need the long-running setup.

## Coding Style & Naming Conventions
- Follow `.editorconfig` defaults: UTF-8, LF endings, 2-space indentation for web files.
- React components are PascalCase (`FuelGaugePanel.tsx`), hooks start with `use`, utilities stay camelCase, and TypeScript types/interfaces use PascalCase with the `Props` or `Dto` suffix where relevant.
- Tailwind utility classes should stay declarative; shared design tokens live in `styles/` and `src/config/theme`.
- Run `npm run lint:fix` before submitting to keep ESLint, react-hooks, and Tailwind ordering rules consistent.

## Testing Guidelines
- No automated test runner ships with the repo yet (`npm test` is a placeholder); add new tests with Vitest or Playwright and place them under `src/__tests__` or alongside components as `*.test.tsx`.
- Prefer descriptive test names aligned with user journeys (e.g., `renders fuel trend chart for active station`).
- When adding backend scripts, provide reproducible checks in `server/test-*.js` style and document manual verification steps in the related PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commits with scopes drawn from domain areas (`feat(tanks): …`, `fix(notifications): …`); keep the subject in the imperative mood.
- Group related changes per commit and keep messages bilingual only when necessary—English summaries help reviewers outside the core team.
- Pull requests need a short summary, linked issue or task ID, screenshots or GIFs for UI changes, and notes on data migrations or manual steps.
- Ensure linting and type-checks pass locally; mention any intentionally skipped validations in the PR description.

## Agent Workflow Notes
- Multi-agent pipelines use the provided scripts: `npm run agent1:setup`, `npm run agent2:migrate`, and `npm run agent3:api`. Compose them with `npm run agents:run` when orchestrating full deployments.
- Keep agent scripts idempotent; store configuration overrides in `.env` or scoped `.env.<mode>` files and avoid hardcoding secrets.
- Все внешние сообщения и ответы для команды оформляйте по-русски, включая логи и уведомления.
- When extending agent behaviour, mirror the existing script structure and add usage notes to `docs/` for future operators.
