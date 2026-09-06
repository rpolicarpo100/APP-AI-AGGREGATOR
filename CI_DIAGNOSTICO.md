# Diagnóstico dos CI a falhar

Data: 2026-09-06 · Investigação sobre os workflows sinalizados pelo Attention Center.

## Conclusão: o código não está partido

**Nenhuma das falhas é um bug.** A mensagem devolvida pela API do GitHub em todos os
jobs falhados é a mesma:

> The job was not started because recent account payments have failed or your spending
> limit needs to be increased. Please check the 'Billing & plans' section in your settings.

Os jobs **nunca chegaram a arrancar**. Foram recusados pela plataforma antes de executar
qualquer step.

## Provas

### 1. Duração das execuções

Todos falham em **3 a 5 segundos**. Um workflow que compila, instala dependências ou faz
pedidos HTTP nunca termina nesse tempo — é o tempo de o GitHub recusar o job.

```
News_ai_Agreger   2026-09-06T20:05  failure  4s
                  2026-09-06T16:44  failure  3s
                  2026-09-06T13:26  failure  5s
DigitalWorker     2026-09-06T22:19  failure  3s
                  2026-09-06T21:56  failure  4s
```

### 2. Os serviços que os workflows contactam estão vivos

| Endpoint | Estado |
|---|---|
| `news-ai-agreger.onrender.com/api/health` | **200** |
| `news-ai-agreger.onrender.com/api/status` | **200** |
| `digitalworker-aios.onrender.com/` | **200** |

O `/api/status` do News_ai_Agreger devolve um sistema saudável:

```
artigos=14142  eventos=11475  publicados=8216
fontes online: 13/14
```

A única fonte em baixo (`arXiv cs.AI`) **não faz falhar o workflow** — o YAML só falha se
nenhuma fonte estiver online, o que está correto.

### 3. A falha é transversal, não específica

| Repositório | Anotação |
|---|---|
| `DigitalWorker` | payments failed / spending limit |
| `CompanyFinder` | payments failed / spending limit |
| `News_ai_Agreger` | payments failed / spending limit |

### 4. Repositórios públicos continuam a passar

`Digitalworker_Crypto` é **público** e o CI passou 6 vezes hoje:

```
2026-09-06T19:12  success  GOD Platform CI
2026-09-06T18:52  success  GOD Platform CI
```

Este é o detalhe decisivo: **o GitHub Actions é gratuito e ilimitado em repositórios
públicos**, mas consome minutos da quota em repositórios privados. Todos os que falham
são privados; o que passa é público.

## Causa

A conta esgotou os minutos gratuitos de Actions para repositórios privados (2000/mês no
plano Free), ou tem um problema de pagamento/limite de gastos.

O consumo é agravado por workflows agendados frequentes:

| Workflow | Agendamento | Execuções/mês |
|---|---|---|
| `News_ai_Agreger/ingest.yml` | 6×/dia (`0 2,6,10,14,18,22 * * *`) | ~180 |
| `DigitalWorker/digest.yml` | diário (`0 20 * * *`) | ~30 |
| `DigitalWorker/short_worker.yml` | frequente | muitas |
| `DigitalWorker/autopilot.yml` | diário | ~30 |

## O que fazer

Nenhuma correção de código resolve isto. Por ordem de eficácia:

### 1. Verificar o billing (imediato)
`github.com/settings/billing` — confirmar se há pagamento falhado ou limite de gastos a 0.
Se for método de pagamento, resolve tudo de uma vez.

### 2. Tornar públicos os repositórios que puderem sê-lo
Actions é **gratuito e ilimitado** em repos públicos. O `News_ai_Agreger` já assume isto
no próprio comentário do workflow: *"GitHub Actions é gratuito e ilimitado em
repositórios públicos"* — mas o repositório é privado, o que anula o pressuposto.

### 3. Reduzir a frequência dos agendamentos
O `ingest.yml` corre 6×/dia com 10 iterações de `sleep 30` — cerca de 5 minutos por
execução, ~15 h/mês só neste workflow. Passar a 2–3×/dia cortaria para metade ou menos.

### 4. Alternativa gratuita ao agendamento
Para o caso concreto de acordar serviços Render, um cron externo gratuito
(cron-job.org, UptimeRobot) faz o mesmo trabalho sem consumir minutos de Actions.

## Impacto no dashboard

O Attention Center está a reportar corretamente: os CI **estão** a falhar. Mas a causa é
de faturação, não de qualidade do código — algo que o rating não consegue distinguir só
pela conclusão do workflow.

Isto significa que a nota de qualidade destes repositórios está **injustamente penalizada**
em cerca de 22 pontos (peso do `ci_fail` no cálculo).
