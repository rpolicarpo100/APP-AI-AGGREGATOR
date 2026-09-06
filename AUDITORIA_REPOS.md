# Auditoria de Repositórios — rpolicarpo100

Data: 2026-09-06 · Fonte: GitHub API com classic PAT (scopes `repo`, `project`)
**33 repositórios** · 4 públicos · 29 privados · Todos os dados são reais.

## Nota sobre o acesso

Os quatro tokens anteriores eram **fine-grained** e alcançavam apenas 4 repositórios.
O classic PAT com scope `repo` revelou os 33. A minha conclusão anterior de que os
projetos "não existiam" estava errada — era limitação do token, não ausência de repos.

---

## Panorama

| Métrica | Valor |
|---|---|
| Repositórios | 33 |
| Tools | 28 |
| Content sites | 5 |
| Com falha de CI | **12** |
| Linguagens | 14 |
| Eventos de atividade | 284 |

Distribuição: Python 13 · TypeScript 12 · HTML 4 · JavaScript 3 · sem linguagem 2

---

## CRÍTICO — 12 repositórios com CI a falhar

Confirmado run a run: são falhas **reais**, não ausência de workflows.

| Repositório | Workflow | Falha desde |
|---|---|---|
| `DigitalWorker` | Short render worker | 2026-09-06 |
| `fabrica-mvps` | Rede de agentes (ciclo horário) | 2026-09-06 |
| `SOLOD_UPDATE` | CI | recente |
| `ai-god-girl` | CI | recente |
| `DigitalCryptoWorker` | CI | recente |
| `News_ai_Agreger` | CI | recente |
| `Fabrica_2.0_AI` | CI | recente |
| `CompanyFinder` | CI | 2026-08-26 |
| `SoloD_game` | CI | 2026-08-28 |
| `Bones_discordsuperAI` | CI | recente |
| `amp-mining-platform` | CI | 2026-08-11 |

Dois são especialmente graves porque correm em **ciclo agendado** — falham repetidamente:
`fabrica-mvps` (rede de agentes horária) e `DigitalWorker` (render worker).

---

## Famílias de projetos — candidatos a consolidação

O sinal mais forte da auditoria: existem **4 famílias com nomes quase idênticos**.

### Família DigitalWorker — 4 repositórios
| Repo | Linguagem | Health | IA | Último push |
|---|---|---|---|---|
| `Digitalworker_Crypto` | TypeScript | **100** | 64% | hoje |
| `DigitalCryptoWorker_beta` | TypeScript | 95 | 56% | 4d |
| `DigitalCryptoWorker` | Python | 70 ⚠ | 70% | 8d |
| `DigitalWorker` | Python | 70 ⚠ | 32% | hoje |

Provável evolução Python → TypeScript. `Digitalworker_Crypto` é claramente o vencedor.

### Família GOD / GodGirl — 3 repositórios
| Repo | Linguagem | Health | IA |
|---|---|---|---|
| `GOD` | Python | 95 | **100%** |
| `GodGirl_AI` | Python | 88 | 64% |
| `ai-god-girl` | Python | 70 ⚠ | 56% |

### Família shorts — 2 repositórios
`ai-shorts` (Python, 83) · `local-shorts-factory` (TypeScript, 83)

### Família SoloD — 2 repositórios
`SoloD_game` (HTML, 70 ⚠) · `SOLOD_UPDATE` (Python, 70 ⚠)

**11 dos 33 repositórios pertencem a apenas 4 famílias.**

---

## Ranking por saúde

### Excelentes — manter (health ≥ 95)
`Digitalworker_Crypto` 100 · `Plataforma_VendasProdutos_Digital` 100 ·
`Game_Redo_improved` 100 · `DigitalCryptoWorker_beta` 95 · `GOD` 95 ·
`XMR-Platform` 95 · `APP-AI-AGGREGATOR` 95 · `Arbitagem_APP` 95 ·
`Emolator_Android` 95 · `LandPage_RP` 95 · `Capa_generator` 95 · `RoadMap4M` 95

### Bons (83–90)
`AI_survive` 90 (1 PR aberto) · `GodGirl_AI` 88 · `opportunity-engine` 88 ·
`ai-shorts` 83 · `local-shorts-factory` 83

### Precisam de atenção (≤ 73)
`MobGuild_Website` 73 · `Site_Historia_Mundo` 73 · `fabrica-mvps` 70 ·
mais os 12 com CI partido · `Bones_discordsuperAI` 58 · `amp-mining-platform` 58

---

## Projetos de IA

Confirmados com dependências reais: `GOD` 100% · `DigitalCryptoWorker` 70% ·
`Digitalworker_Crypto` 64% · `GodGirl_AI` 64% · `APP-AI-AGGREGATOR` 64% ·
`ai-god-girl` 56% · `DigitalCryptoWorker_beta` 56% · `ai-shorts` 54% ·
`opportunity-engine` 40%

---

## Recomendação

### Eliminar / arquivar — nenhum imediatamente
Nenhum repositório é lixo evidente. Mas **11 estão em famílias sobrepostas** e é aí
que está o ganho real: consolidar reduz de 33 para ~26 sem perder trabalho.

### Candidatos a arquivar após confirmação
| Repo | Motivo |
|---|---|
| `DigitalCryptoWorker` | Versão Python, superada pela TypeScript; CI partido |
| `ai-god-girl` | Sobrepõe-se ao `GOD` (100% IA, health 95); CI partido |
| `amp-mining-platform` | Health 58, parado há 26 dias, CI partido |
| `Bones_discordsuperAI` | Health 58, CI partido |
| `Camping_Info_APP`, `GAMEWEB3` | Sem linguagem detetada — provavelmente vazios |

### Ações por prioridade

1. **Desligar os 2 workflows agendados que falham** (`fabrica-mvps`, `DigitalWorker`) —
   estão a consumir minutos de Actions e a gerar ruído diário
2. **Decidir cada família**: escolher o vencedor, arquivar os restantes
3. **Reparar ou remover** os restantes 10 CI partidos
4. **Verificar `Camping_Info_APP` e `GAMEWEB3`** — sem linguagem, possivelmente vazios
5. **Licença + descrição + topics** nos que forem para manter

### Segurança
Varrimento nos 4 públicos: nenhum segredo real commitado. Os 29 privados não foram
varridos individualmente — recomenda-se `gitleaks` antes de tornar algum público.
