---
name: tradeframe
description: TradeFrame — платформа управления сетями АЗС. Bootstrap для AI-агентов.
type: project-bootstrap
kb_path: /home/dev/ai/projects/tradeframe/
---

# TradeFrame — AGENT.md (bootstrap для любого AI-агента)

## Стартовый протокол

1. Прочитай локальный актуальный контекст:
   - `README.md`
   - `docs/HANDOVER.md`
   - `docs/ARCHITECTURE_CURRENT.md`
   - `docs/ENVIRONMENT.md`
   - `docs/OPERATIONS_RUNBOOK.md`
   - `docs/DOCS_STATUS.md`
   - `docs/TECH_DEBT.md`
2. Если работа затрагивает инфраструктуру или смежные проекты, обнови KB: `cd /home/dev/ai && git pull --ff-only` (локально у МАГа — `D:/Users/magsp/ai-base/`).
3. Прочитай общий `ai/AGENT.md` (если не читал в этой сессии).
4. Прочитай проектный контекст ai-base, если он нужен задаче:
   - `projects/tradeframe/README.md`
   - `projects/tradeframe/context.md`
   - `projects/tradeframe/tech.md`
5. Проверь применимые скиллы: `projects/tradeframe/skills.md` + детальный `projects/tradeframe/SKILL.md`.
6. Проверь `AI/exchange/inbox/` на задачи с `project: tradeframe` во frontmatter.
7. Если в этой папке есть `CLAUDE.md` — прочитай (Claude-специфика).

## Ключевые команды

```bash
# dev
npm run start:backend         # backend :3001
npm run dev                   # frontend :3000
npm run lint
npm run type-check
npm test
npm run build:prod
npm run test:e2e

# prod (через SSH алиас dw-prod)
ssh dw-prod "pm2 list | grep tradeframe"
ssh dw-prod "pm2 logs tradeframe-prod-backend --lines 50 --nostream"
ssh dw-prod "cd /var/www/www-root/data/www/prod.dataworker.ru && pm2 restart tradeframe-prod-backend"

# health
curl -s -o /dev/null -w "%{http_code}\n" https://prod.dataworker.ru
curl -s -o /dev/null -w "%{http_code}\n" https://prod.dataworker.ru/api/healthz
```

## Связанные разделы KB

- Хост: `machines/` (HumbleSmew — см. `infrastructure/timeweb-servers.md`)
- Сервисы: `services/dataworker-services.md` (HAProxy + nginx)
- Смежные проекты: `projects/msto-integrator/`, `projects/tradelink/`

## Inbox по проекту

`AI/exchange/inbox/` с `project: tradeframe` во frontmatter — см. `procedures/agent-exchange.md`.

## Для Claude Code

См. `CLAUDE.md` рядом — Claude-специфика (порты, авто-запуск dev, правила работы). В этот файл дублировать не надо; всё нейтральное — здесь.
