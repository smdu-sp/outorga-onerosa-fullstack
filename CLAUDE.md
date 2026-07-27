# CLAUDE.md

## Idioma

Responda **sempre em português do Brasil**, independentemente do idioma da pergunta.

Portal de **Outorga Onerosa** da Prefeitura de São Paulo (SMUL / DEUSO). O sistema
transforma planilhas de controle preenchidas manualmente em banco de dados e
dashboards/relatórios.

## Leia primeiro: contexto de domínio

Antes de mexer em qualquer coisa ligada a processos, parcelas, valores, tipos ou
importação de planilhas, leia **[projeto/contexto-dominio.md](projeto/contexto-dominio.md)**.
Ele define os conceitos (Outorga Onerosa, PDE/COTA/AIU, parcela, quebra,
contrapartida) e — importante — cataloga as **inconsistências de preenchimento** da
planilha que o parsing precisa tolerar.

Regras de ouro que valem para todo código novo:

1. **Total de contrapartida = soma das parcelas** (`Processo.valor_total_parcelas`,
   materializado por `prisma/backfill-totais.ts`). **Nunca** usar a contrapartida da
   planilha de monitoramento — está corrompida por escala.
2. **Arrecadado** = parcelas com `status_quitacao = true`; **não** inclui quebra.
3. **Quebra ≠ a vencer ≠ vencido não pago** — estados distintos.
4. **Tipo vem do código da Prefeitura:** `79 → PDE`, `78 → COTA`, `109 → AIU`.
5. Toda célula da planilha pode vir com caixa/acento variados ou na coluna errada —
   normalizar sempre (reusar `parse-numero-br.ts`, `cleanText`, `normalizeProcesso`).

## Stack

- **Next.js** (App Router, Turbopack, porta **3001**) + React + TypeScript
- **Prisma** + **MySQL**
- **exceljs** para leitura de planilhas
- Integração **GeoSampa** (WFS/GeoJSON) para dados territoriais

## Comandos

| Ação | Comando |
|------|---------|
| Dev | `npm run dev` (porta 3001) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Prisma Studio | `npm run db:studio` |
| Migração | `npm run db:migrate` |
| Importar planilhas | `npm run db:import-planilhas` |

## Estrutura relevante

- `prisma/schema.prisma` — modelos `Processo`, `Parcela`, `MonitoramentoFicha`,
  `MonitoramentoCotaSolidariedade` e enums (`Tipo`, `StatusPagamento`, `OrigemProcesso`).
- `prisma/import-planilhas.ts` — parsing das planilhas (layouts `ad_dpd`/`ad_dpci`/`fisico`).
- `lib/server/` — funções de servidor (processos, relatórios, geosampa).
- `app/(rotas-auth)/` — rotas autenticadas (processos, relatórios).
- `projeto/` — documentação de domínio e propostas de relatórios.
