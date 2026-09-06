# APP AI AGGREGATOR — Auditoria Técnica e Plano de Implementação

## 1. Auditoria do projeto atual

**Resultado: não existia projeto.** O workspace (`/home/user`) estava completamente vazio — sem
`package.json`, sem `.git`, sem código-fonte, sem dependências.

Consequências diretas para os pontos 1–10 do processo pedido (secção 27):

| Passo pedido | Resultado |
|---|---|
| Analisar código existente | Nada a analisar — 0 ficheiros |
| Analisar arquitetura | Inexistente |
| Analisar dependências | Inexistentes |
| Analisar performance | Sem baseline possível |
| Identificar problemas | N/A |
| Identificar código duplicado | N/A |
| Identificar componentes reutilizáveis | N/A |
| Identificar bottlenecks | N/A |
| Propor nova arquitetura | Feito (secção 3) |
| Implementar incrementalmente | Feito (secção 4) |

Não foi apagada nem substituída qualquer funcionalidade existente, porque não existia nenhuma.

### Auditoria do ambiente

| Recurso | Estado |
|---|---|
| Node | 20.20.2 |
| npm | 10.8.2 |
| Python | 3.13.14 |
| PostgreSQL | Ausente → **instalado (17.10)** |
| Docker | Ausente (não necessário) |

## 2. Decisões tomadas

| Questão | Decisão |
|---|---|
| Base de código | Construir de raiz |
| Autenticação GitHub | Personal Access Token, server-side |
| Base de dados | PostgreSQL 17 local (`ai_aggregator`) |
| Primeira etapa | Núcleo: shell visual + Dashboard + Command Palette |

## 3. Arquitetura implementada

```
GitHub API
    ↓  GitHubAdapter        (src/lib/providers/github.ts)
    ↓  Normalized* types    (src/lib/providers/types.ts)
    ↓  Intelligence         (src/lib/intelligence.ts)   AI · Health · Attention
    ↓  Sync orchestrator    (src/lib/sync.ts)
    ↓  PostgreSQL           (prisma/schema.prisma)
    ↓  Aggregation queries  (src/lib/queries.ts)
    ↓  React Server Components → UI
```

O frontend nunca conhece o formato do GitHub. Adicionar GitLab/Hugging Face é implementar
`ProviderAdapter` e registá-lo em `getAdapters()` — zero alterações à UI.

### Separação de estado
- **UI state** — `useState` local (filtros, cursor da palette)
- **Server state** — React Server Components, `force-dynamic`
- **Cache** — `Cache-Control` no índice de pesquisa, dedupe de sync in-flight
- **Persisted** — PostgreSQL
- **Background sync** — `npm run sync` (cron-ready)

### Base de dados (normalizada)
`Provider`, `Repository`, `RepositoryLanguage`, `Dependency`, `ActivityEvent`, `SyncState` —
com índices em `isAiProject`, `pushedAt`, `primaryLanguage`, `occurredAt`, `type`.

## 4. Etapas executadas (cada uma verificada)

| # | Etapa | Verificação |
|---|---|---|
| 1 | PostgreSQL 17 instalado, DB criada | `SELECT version()` OK |
| 2 | Schema Prisma → DB | `prisma db push` em sync |
| 3 | Camada de dados (adapter, tipos, intelligence, sync, queries) | build limpo |
| 4 | Identidade visual + shell + rail | build limpo |
| 5 | Command Palette (CTRL/CMD+K) | rota `/api/search` 200 |
| 6 | Dashboard + métricas reais | `/` 200, empty state correto |
| 7 | Sources (ligação GitHub) | `/sources` 200 |
| 8 | Projects, AI, Attention, Activity, Project Detail | todas 200; 404 correto |
| 9 | CLI de sync | `npm run sync` → `not_connected` (honesto) |
| 10 | Testes da intelligence | ver abaixo |

### Resultados dos testes da camada de inteligência
```
AI (positivo):  true · confiança 100 · AI AGENTS, AUTOMATION, LLM, RAG, TRADING AI
AI (negativo):  false · confiança 0        ← não gera falsos positivos
HEALTH (bom):   100 · RECENT ACTIVITY|ACTIVE|CI PASSING|LOW ISSUE LOAD|DOCUMENTED
HEALTH (mau):   0
ATTENTION:      CI FAILURE, STALE PROJECT, OPEN PR, OPEN ISSUES, NO DOCUMENTATION
```

## 5. Conformidade com os princípios

| Princípio | Como é cumprido |
|---|---|
| **NO FAKE DATA** | Nenhum valor hardcoded. Sem token, tudo mostra `NOT CONNECTED` e as métricas nem sequer são renderizadas |
| **NO FAKE FUNCTIONALITY** | Todos os botões/filtros/pesquisa executam. Providers por implementar aparecem como `NOT CONNECTED` |
| **100% FREE** | Sem tiers, paywalls ou limites artificiais |
| **FAST** | RSC; índice de pesquisa carregado uma vez e filtrado no cliente; sync incremental com limite por execução |
| **SECURITY** | Token só no servidor, lido de `.env`, nunca serializado para o cliente nem guardado na BD |
| **ACCESSIBILITY** | Navegação por teclado, `aria-*`, `role="listbox"`, skip-link, focus-visible |
| **RESPONSIVE** | Rail lateral em desktop → barra inferior em mobile |
| **MOTION** | `prefers-reduced-motion` respeitado globalmente |

## 6. Estado atual e próximo passo

A aplicação está **funcional e honesta**: sem credenciais, apresenta corretamente o estado
`NOT CONNECTED` com empty states intencionais, em vez de inventar dados.

**Para ver dados reais:**
1. Criar token em `github.com/settings/tokens` (scopes `repo`, `read:user`)
2. `app/.env` → `GITHUB_TOKEN="ghp_..."`
3. Reiniciar o servidor e clicar em **SYNC NOW** (ou `CTRL+K` → *Refresh GitHub data*)

### Trabalho futuro sugerido
- OAuth (multi-utilizador) sobre a camada de providers já existente
- Adapters GitLab / Hugging Face
- Virtualização de listas acima de ~500 repositórios
- Deteção de dependências desatualizadas (`OUTDATED DEPENDENCIES`)
