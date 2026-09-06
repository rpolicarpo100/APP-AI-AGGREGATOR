# Projetos a agregar — estado de acesso

Verificado em 2026-09-06 contra a API pública do GitHub (sem token).

| # | Repositório | Estado | Notas |
|---|---|---|---|
| 1 | `fabrica-mvps` | 404 | Privado ou nome diferente |
| 2 | `Digitalworker_Crypto` | **OK** | TypeScript · push 2026-09-06 |
| 3 | `Historia_Porutgal` | **OK** | HTML · push 2026-08-28 |
| 4 | `DigitalWorker` | 404 | Privado ou nome diferente |
| 5 | `CompanyFinder` | 404 | O link colado juntava dois URLs |
| 6 | `News_ai_Agreger` | 404 | Privado ou nome diferente |
| 7 | `LandPage_RP` | 404 | Privado ou nome diferente |
| 8 | `Site_Historia_Mundo` | 404 | Privado ou nome diferente |
| 9 | `Fabrica_2.0_AI` | 404 | Privado ou nome diferente |

**404 não significa que não existam.** A API pública devolve 404 tanto para repositórios
inexistentes como para privados — é uma proteção do GitHub para não revelar a existência
de repos privados. Com um token com scope `repo`, os privados passam a ser visíveis.

## Classificação validada com dados reais

Executada com o motor de `src/lib/intelligence.ts` sobre os dois repos acessíveis:

```
Digitalworker_Crypto   AI=true   64%   AI AGENTS · RAG · TRADING AI
                       sinais: agent, multi-agent, rag, trading, backtest, market data

Historia_Porutgal      AI=false   0%   —
                       (site HTML de história — corretamente não classificado como IA)
```

O classificador acerta nos dois sentidos: deteta o projeto de IA e não gera falso
positivo no site estático.

## Nota sobre a agregação

O dashboard **não precisa de uma lista fixa de repositórios**. O `GitHubAdapter` chama
`/user/repos` com `affiliation=owner,collaborator,organization_member`, o que traz
automaticamente todos os repos a que a conta tem acesso — públicos e privados.

Ou seja: assim que o `GITHUB_TOKEN` estiver em `.env`, estes 9 projetos (e quaisquer
outros) aparecem sozinhos, sem serem codificados em lado nenhum. Isto respeita a regra
"NO FAKE DATA" — a lista vem da API, não de um array no código.

## Correção de link

O item 5 da lista original continha dois URLs concatenados:

```
https://github.com/rpolicarpo100/CompanyFinderhttps://github.com/rpolicarpo100/News_ai_Agreger
```

Foi interpretado como dois repositórios distintos: `CompanyFinder` e `News_ai_Agreger`.
