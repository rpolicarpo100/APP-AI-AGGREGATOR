# Projetos a agregar — estado de acesso

Verificado em 2026-09-06 **com token autenticado** (fine-grained PAT, rate limit 5000/h).

## Repositórios efetivamente sincronizados

| Repositório | Tipo | IA | Health | Linguagem |
|---|---|---|---|---|
| `GOD` | TOOL / APPLICATION | 100% | 95 | Python |
| `Digitalworker_Crypto` | TOOL / APPLICATION | 64% | 100 | TypeScript |
| `APP-AI-AGGREGATOR` | TOOL / APPLICATION | 64% | 95 | TypeScript |
| `Historia_Porutgal` | CONTENT / STATIC SITE | — | 85 | HTML |

A tua distinção ferramenta/conteúdo confirmou-se nos dados reais: **3 TOOL, 1 CONTENT**.

## Repositórios não encontrados

A API `/user` reporta **4 repositórios públicos e 0 privados** nesta conta. Os 7 abaixo
devolvem 404 mesmo com token autenticado:

| Repositório | Pesquisa global no GitHub |
|---|---|
| `fabrica-mvps` | sem resultados |
| `DigitalWorker` | existe noutras contas (tybalex, nidarg, Jameshelloworld) — nenhuma tua |
| `CompanyFinder` | existe noutras contas (zep1994, tuokkom, Chase-Klingel) — nenhuma tua |
| `News_ai_Agreger` | sem resultados |
| `LandPage_RP` | sem resultados |
| `Site_Historia_Mundo` | sem resultados |
| `Fabrica_2.0_AI` | sem resultados |

### Interpretação

Não é uma limitação do token. Dois tokens diferentes devolveram exatamente os mesmos 4
repositórios, e o campo `total_private_repos` da conta é 0. Hipóteses:

1. Estão noutra conta GitHub (pessoal vs profissional)
2. Estão numa organização a que este token não tem acesso
3. Existem apenas localmente, sem push para o GitHub
4. Foram apagados ou renomeados

Apareceu ainda o repositório **`GOD`** (Python, 100% IA), que não constava da lista original.

## Nota de arquitetura

O dashboard não tem lista fixa de repositórios: usa `/user/repos` com
`affiliation=owner,collaborator,organization_member`. Assim que estes repos existirem e
forem acessíveis pelo token, aparecem automaticamente — sem alterações de código.
