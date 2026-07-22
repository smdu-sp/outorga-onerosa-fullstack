# Propostas de Relatórios — Dashboard de Outorga Onerosa

Documento de referência com os relatórios propostos para o dashboard, organizados por módulo. Cada item indica se pode ser implementado com o schema atual ou se depende dos ajustes descritos em `schema-ajustes.prisma`.

---

## 1. Visão Geral (KPIs)

| Relatório | Descrição | Status |
|---|---|---|
| Total arrecadado | Soma de parcelas quitadas | Schema atual |
| Total em aberto | Soma de parcelas pendentes (sem quebra) | Schema atual |
| Total em quebra | Soma de parcelas marcadas como quebra | Schema atual |
| Processos por status | Contagem agrupada por `status_pagamento` | Schema atual |
| Taxa de inadimplência | Quebras ÷ parcelas vencidas | Schema atual |
| Ticket médio por tipo | Valor médio de processo, agrupado por PDE/COTA/AIU | Schema atual |

## 2. Financeiro

| Relatório | Descrição | Status |
|---|---|---|
| Arrecadação mensal/anual | Série temporal de valores quitados | Schema atual |
| Aging report | Parcelas vencidas não pagas, por faixa de atraso (0-30, 31-60, 60+ dias) | Melhor com `dias_atraso` materializado |
| Distribuição de status de pagamento | Quitado / em pagamento / quebra | Schema atual |
| Análise de antecipação | % de parcelas antecipadas e média de `dias_antecipacao` | Schema atual |
| Valor de juros/correção arrecadado | Total cobrado por atraso | Precisa dos campos `valor_juros`/`valor_corrigido` |
| Gap calculado vs pago (Cota de Solidariedade) | `valor_calculado_processo` vs `valor_pago` | Precisa migrar `valor_pago`/`valor_devido` para Decimal |

## 3. Geográfico

| Relatório | Descrição | Status |
|---|---|---|
| Contrapartida total por subprefeitura | Ranking/mapa coroplético | Precisa migrar campos de contrapartida para Decimal |
| Contrapartida por distrito/macrozona | Mesma lógica, granularidade menor | Precisa migração de tipos |
| Mapa de pontos por coordenada (E/N) | Plotagem individual de processos | Schema atual (`coordenada_e`/`coordenada_n`) |

## 4. Urbanístico

| Relatório | Descrição | Status |
|---|---|---|
| Distribuição de zonas de uso | Frequência das zonas cadastradas na ficha | Schema atual |
| Coeficiente utilizado vs básico | Histograma comparando os dois valores | Schema atual |
| Área computável total por período | Evolução do potencial construtivo negociado | Schema atual |
| Tipologia de uso mais frequente | Ranking de `tipologia_uso_oodc` | Schema atual |

## 5. Cota de Solidariedade

| Relatório | Descrição | Status |
|---|---|---|
| Área de habitação social gerada | Soma de `area_habitacao_social` | Schema atual |
| Estimativa de depósito FUNDURB | Soma de `estimativa_deposito_fundurb` | Schema atual |
| Distribuição por modalidade | Contagem/valor agrupado por `modalidade` | Schema atual |
| Gap calculado vs pago | Ver item do módulo Financeiro | Precisa migração de tipos |

## 6. Previsões / Insights

| Relatório | Descrição | Status |
|---|---|---|
| Forecast de arrecadação | Soma de parcelas futuras ponderada pela taxa histórica de quebra por tipo | Schema atual (melhora com histórico de status) |
| Score de risco de inadimplência | Heurística baseada em histórico de quebra do CPF/CNPJ | Schema atual (melhora com mais histórico) |
| Sazonalidade de quitações | Identificar meses com mais pagamentos (ex: fim de exercício fiscal) | Schema atual |
| Tempo de processamento por origem | `data_entrada` → `data_quitacao`, comparado entre SEI/Aprova Digital/Físico/Portal | Schema atual |
| Modelo preditivo de inadimplência (ML) | Regressão logística treinada fora do banco, score salvo em `Processo.score_risco` | Requer coluna nova + pipeline externo (Python) |

## 7. Qualidade de Dados

| Relatório | Descrição | Status |
|---|---|---|
| Completude por ficha | % de campos-chave preenchidos em cada `MonitoramentoFicha` | Schema atual |
| Fichas pendentes de revisão | Baseado em `ficha_revisada_em` nulo ou antigo | Schema atual |
| Inconsistências de tipo | Auditoria dos campos String que deveriam ser numéricos, antes da migração | Schema atual |

---

## Priorização sugerida

1. **Curto prazo (schema atual):** KPIs gerais, arrecadação mensal, distribuição de status, urbanístico, qualidade de dados.
2. **Médio prazo (migração de tipos):** relatórios financeiros e geográficos que dependem de somar contrapartida/valores hoje armazenados como texto.
3. **Longo prazo (novas colunas/tabelas):** histórico de status, juros/atraso materializado, score de risco via modelo de ML.
