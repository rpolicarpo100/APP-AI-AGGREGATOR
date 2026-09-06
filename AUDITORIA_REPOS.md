# Auditoria de Repositórios — rpolicarpo100

Data: 2026-09-06 · Fonte: GitHub API (dados reais, nenhum valor estimado)

## Alcance

**4 repositórios acessíveis.** Quatro tokens distintos devolveram sempre a mesma lista.
Os 7 indicados (`fabrica-mvps`, `DigitalWorker`, `CompanyFinder`, `News_ai_Agreger`,
`LandPage_RP`, `Site_Historia_Mundo`, `Fabrica_2.0_AI`) devolvem 404 — não foi possível
auditá-los. O stream de eventos da conta também não mostra qualquer atividade neles.

---

## Quadro comparativo

| | GOD | Digitalworker_Crypto | APP-AI-AGGREGATOR | Historia_Porutgal |
|---|---|---|---|---|
| Criado | 2026-09-04 | 2026-09-06 | 2026-09-06 | 2026-08-28 |
| Último push | hoje | hoje | hoje | há 9 dias |
| Commits | 100+ | 42 | 6 | **1** |
| Ficheiros de código | 60 | 180 | 31 | **1** |
| Volume de código | 750 KB | 495 KB | 141 KB | 84 KB |
| Documentação | 7 docs | 17 docs | 3 docs | **0** |
| Branches | 2 | 1 | 1 | 1 |
| CI / workflows | 0 | **1** | 0 | 0 |
| Licença | nenhuma | nenhuma | nenhuma | nenhuma |
| Descrição | **falta** | **falta** | **falta** | **falta** |
| Topics | **nenhum** | **nenhum** | **nenhum** | **nenhum** |
| Tipo | TOOL | TOOL | TOOL | CONTENT |
| IA | 100% | 64% | 64% | — |
| Health | 95 | 100 | 95 | 85 |

---

## Análise individual

### GOD — MANTER (projeto principal)
Python, 56 módulos, 100+ commits em 2 dias. O maior volume de código (750 KB) e o
único com suíte de testes visível (`tests/test_core.py`, 65 KB). Tem instaladores para
Windows e Unix, roadmap e documentação de troubleshooting.

- Classificado como 100% IA com 4 dependências de IA reais
- **Sem CI** apesar de ter testes — o retorno mais imediato seria ligar GitHub Actions
- `index.html` com 114 KB é o maior ficheiro; provavelmente merece ser dividido

### Digitalworker_Crypto — MANTER (mais maduro)
Next.js/TypeScript, 180 ficheiros, 42 commits. **O único com CI configurado.** Health 100.
Documentação muito completa (17 documentos, rácio docs/código de 0.33).

- Ponto de atenção: 6 ficheiros `PHASE1..6_REPORT.md` na raiz. São relatórios de
  processo, não documentação de produto — deviam ir para `docs/history/`
- `.env.example` declara `NEXT_PUBLIC_APP_NAME=GOD`, o que sugere que nasceu de um
  fork/cópia do GOD. Vale confirmar se há código duplicado entre os dois

### APP-AI-AGGREGATOR — MANTER (este projeto)
Criado hoje, 6 commits, 31 ficheiros. É o dashboard que agrega os restantes.

### Historia_Porutgal — DECIDIR
Um único ficheiro HTML de 84 KB, 1 commit, sem alterações há 9 dias.

- **Não é um projeto de software** — é uma página estática
- O nome tem uma gralha: "Porutgal" em vez de "Portugal"
- Opções: (a) manter e corrigir o nome, (b) publicar via GitHub Pages para servir
  algum propósito, (c) arquivar, (d) fundir com `Site_Historia_Mundo` se este existir

---

## Problemas transversais

Aplicam-se aos **4 repositórios**:

| Problema | Impacto | Correção |
|---|---|---|
| Nenhum tem descrição | Ilegíveis de fora; pesquisa do GitHub não os encontra | 1 minuto cada |
| Nenhum tem topics | Sem descoberta nem categorização | 1 minuto cada |
| Nenhum tem licença | **Sem licença, ninguém pode legalmente reutilizar o código** | Adicionar MIT |
| Só 1 de 4 tem CI | Sem validação automática | Actions no GOD (tem testes) |
| Nenhum tem releases | Sem versionamento | Tags semânticas quando estabilizar |

### Segurança — sem problemas

Auditei toda a árvore de ficheiros dos 4 repositórios à procura de `.env`, `.pem`,
`.key`, `id_rsa`, `credentials` e `secrets.*`:

- Nenhum segredo real commitado
- Os `.env.example` contêm apenas placeholders e valores de localhost
- `GOD/DEPLOY_KEY.pub` é uma chave **pública** — inofensiva por definição

---

## Recomendação

| Repositório | Decisão | Justificação |
|---|---|---|
| **GOD** | **Manter** | Maior base de código, testes, desenvolvimento ativo |
| **Digitalworker_Crypto** | **Manter** | Mais maduro, CI a passar, bem documentado |
| **APP-AI-AGGREGATOR** | **Manter** | Dashboard de agregação |
| **Historia_Porutgal** | **A decidir** | Página única; útil apenas se for publicada |

**Nada a eliminar.** Nenhum dos 4 é lixo ou duplicado óbvio. A única candidata a
arquivo é a `Historia_Porutgal`, e mesmo essa só se não tiver destino.

### Prioridades

1. Descrição, topics e licença nos 4 — 15 minutos, o maior retorno imediato
2. CI no GOD, que já tem testes mas não os corre
3. Arrumar os `PHASE*_REPORT.md` do Crypto para `docs/history/`
4. Verificar duplicação de código entre GOD e Digitalworker_Crypto
5. Decidir o destino da Historia_Porutgal
