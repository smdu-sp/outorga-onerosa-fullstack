# Contexto de Domínio — Outorga Onerosa (SMUL / DEUSO)

Documento de referência para entender **o que os dados significam** antes de mexer
no código. A fonte primária é uma planilha de controle preenchida manualmente pela
equipe, que está virando banco de dados (MySQL + Prisma). O problema central é que
**cada pessoa preenche a planilha de um jeito** — este documento fixa os conceitos e
registra as inconsistências conhecidas para que decisões de parsing/relatório sejam
consistentes.

---

## 1. O que é Outorga Onerosa

A **Outorga Onerosa do Direito de Construir (OODC)** é a contrapartida financeira que
o empreendedor paga à Prefeitura de São Paulo para construir **acima do coeficiente de
aproveitamento básico** do lote, até o coeficiente máximo permitido pela lei de
zoneamento. É um instrumento de *land value capture* previsto no Plano Diretor
Estratégico (Lei 16.050/2014). O recurso arrecadado vai para o **FUNDURB** (Fundo de
Desenvolvimento Urbano).

Gestão: **SMUL / DEUSO** (Departamento de Uso do Solo). A planilha original é o
"controle DEUSO".

---

## 2. Os três tipos de arrecadação — PDE / COTA / AIU

O tipo é identificado na planilha por um **código de serviço/receita da Prefeitura**
(coluna `PDE(79) / COTA (78) / AIU(109)`). São regimes jurídicos diferentes de
contrapartida:

| Código | Tipo (enum `Tipo`) | Nome | O que é |
|--------|--------------------|------|---------|
| **79** | `PDE` | Outorga Onerosa (Plano Diretor) | Regime "padrão": paga-se para construir acima do coef. básico até o máximo. Lei 16.050/2014. É a maioria esmagadora dos processos. |
| **78** | `COTA` | Cota de Solidariedade | Obrigação para empreendimentos com área computável acima de 20.000 m² (Art. 111–112 do PDE): produzir HIS (Habitação de Interesse Social) equivalente a 10% da área computável, **ou** doar terreno, **ou** depositar o equivalente no FUNDURB. Tem ficha própria (`MonitoramentoCotaSolidariedade`). |
| **109** | `AIU` | Outorga em Área de Intervenção Urbana | Outorga arrecadada dentro do perímetro de uma AIU (ex.: AIU Setor Central, Lei 17.844/2022), com regras/base de cálculo próprias da intervenção. |

> **Mapeamento de códigos (fonte: cabeçalho da planilha da equipe):**
> `79 → PDE`, `78 → COTA`, `109 → AIU`. Já refletido em
> [prisma/import-planilhas.ts](../prisma/import-planilhas.ts) (`TIPO_POR_CODIGO`) e
> [importacao/_components/form-importacao.tsx](../app/(rotas-auth)/importacao/_components/form-importacao.tsx).
> Códigos variantes vistos nos dados: `7022`/`7023` (PDE), `7137` (COTA). O `7022`
> aparece em processos **SLC** (Serviço/Licenciamento) sem `SISTEMA` preenchido.

### Um processo pode ter OODC **e** Cota
São **obrigações independentes**: um empreendimento acima do coeficiente básico **e**
acima do limite da Cota paga OODC (PDE/AIU) **e** cumpre a Cota de Solidariedade. É
comum — na planilha há **10 processos** com códigos 78 e 79 juntos, cada obrigação
podendo estar parcelada ou à vista, com valores distintos.

Por isso a obrigação vive na **parcela**, não só no processo: `Parcela.obrigacao`
(`Tipo`) diz qual obrigação cada parcela paga, e um processo pode ter os dois conjuntos
(OODC parcela 1..N **e** COTA parcela 1..M). `Processo.tipo` continua como tipo
predominante, mas **não** é fonte de verdade para "tem Cota?" — isso vem das parcelas.
O **cálculo** da Cota (valor, HIS, área) fica em `MonitoramentoCotaSolidariedade`.

---

## 3. Conceitos financeiros

### Contrapartida (valor total do processo)
Valor total que o empreendedor deve pagar. **Não confie na coluna de contrapartida
total da planilha de monitoramento** — ela está corrompida por erro de escala
(ver [prisma/auditar-contrapartida.ts](../prisma/auditar-contrapartida.ts)). A **fonte
de verdade é a soma das parcelas** (`SUM(parcelas.valor)`), materializada em
`Processo.valor_total_parcelas` por
[prisma/backfill-totais.ts](../prisma/backfill-totais.ts).

### Parcela
Uma **prestação** do pagamento da contrapartida. A contrapartida é dividida em N
parcelas (normalmente **10**; nos dados vão de 1 a 20). Cada linha da planilha
financeira é **uma parcela** — um processo ocupa várias linhas consecutivas, uma por
parcela. Campos por parcela (modelo `Parcela`):

- `obrigacao` — qual obrigação paga (`PDE`/OODC, `COTA`, `AIU`); ver §2
- `num_parcela` — ordem (1..N), reinicia por obrigação
- `vencimento` — data de vencimento
- `valor` — valor da parcela (geralmente igual entre as parcelas do mesmo processo)
- `data_quitacao` / `ano_pagamento` — quando foi paga
- `status_quitacao` — paga ou não
- `antecipada` — quitada em mês anterior ao planejado (ver **Antecipação** abaixo)
- `quebra` — ver abaixo

### Quebra
**Inadimplência / rescisão do parcelamento.** Quando o empreendedor para de pagar, as
parcelas restantes a partir daquele ponto são marcadas como **Quebra**. Exemplo real
(processo `1010.2020/0008360-3`): parcelas 1–4 `Pago`, parcelas 5–10 `Quebra` — o plano
foi "quebrado" na 5ª parcela. No enum `StatusPagamento` do processo, `QUEBRA` é o status
de maior prioridade (um processo com qualquer parcela quebrada é classificado como
quebra). Uma parcela em quebra **não** conta como arrecadada nem como "a vencer".

### Antecipação
Pela prática administrativa da SMUL, **pode-se antecipar** o pagamento: quitar uma
parcela futura, várias, ou todo o saldo. **Não há desconto** — o valor da parcela é o
mesmo, apenas pago antes; para arrecadação, entra no **mês do pagamento** (não no do
vencimento).

Nem todo pagamento adiantado é antecipação. A regra canônica está em
[lib/antecipacao.ts](../lib/antecipacao.ts) (`classificarAntecipacao`):

> **antecipada = o pagamento caiu num mês anterior ao do vencimento E mais de
> `DIAS_TOLERANCIA_VIRADA_MES` (7) dias antes.**

A tolerância descarta a **virada de mês**: quando o vencimento é no início do mês e o
pagamento acontece nos últimos dias do mês anterior (ex.: vence 01/07, pago 29/06), é
pagamento no prazo, não antecipação. Pagamento no mesmo mês do vencimento nunca é
antecipação (o dinheiro entra no mês planejado). Um único pagamento bem adiantado
(quitar uma parcela futura) **é** antecipação — não é preciso ser em lote.

### Status do processo (`StatusPagamento`)
Derivado do conjunto de parcelas — prioridade `QUEBRA > EM_PAGAMENTO > QUITADO`:
- `QUITADO` — todas as parcelas pagas
- `EM_PAGAMENTO` — ainda há parcelas a vencer, sem quebra
- `QUEBRA` — houve interrupção do pagamento

---

## 4. Estrutura da planilha `OUTORGA APROVA DIGITAL.xlsx`

Aba única `Planilha1`, ~1.622 linhas de dados (246 processos distintos). Uma linha por
parcela. Colunas:

| # | Coluna | Vira campo | Observações |
|---|--------|-----------|-------------|
| 1 | Data de Entrada | `Processo.data_entrada` | preenchida na 1ª linha do processo |
| 2 | SISTEMA | `Processo.origem` | "APROVA DIGITAL"; **em branco nas linhas de continuação** |
| 3 | PDE(79)/COTA(78)/AIU(109) | `Processo.tipo` (via código) | 79/78/109/7022… |
| 4 | Protocolo APROVA DIGITAL | `Processo.protocolo_ad` | às vezes com `\n` embutido |
| 5 | Processo SEI | `Processo.num_processo` | chave do processo (`num_processo` é `@unique`) |
| 6 | CPF/CNPJ | `Parcela.cpf_cnpj` | do empreendedor/proprietário |
| 7 | PARCELA | `Parcela.num_parcela` | |
| 8 | VENCIMENTO | `Parcela.vencimento` | |
| 9 | VALOR R$ | `Parcela.valor` | **fonte de verdade** do total (somado) |
| 10 | Data de Pagamento | `Parcela.data_quitacao` | |
| 11 | Situação | deriva `status_quitacao`/`quebra` | **coluna mais bagunçada** (ver §5) |

Existem outras planilhas no fluxo de import (nomes históricos): *Aprova Digital*,
*Físicos e SEI*, *Banco de Dados Outorga Onerosa* (monitoramento urbanístico) e
*Cota de Solidariedade*. Cada uma tem layout próprio — ver `parseParcelSheet` e os
layouts `ad_dpd` / `ad_dpci` / `fisico` no import.

---

## 5. Inconsistências de preenchimento (o problema central)

Porque "cada um preenche de um jeito", o parsing precisa ser tolerante. Observado nos
dados reais:

- **Coluna Situação** mistura vocabulário, caixa e formatação:
  `Pago`, `Quitado`, `à vista`, `A Vencer`, `A VENCER`, `Quebra`, `QUEBRA` — inclusive
  alguns `Pago` gravados como *rich text* colorido (objeto, não string). Normalizar
  **sempre** com [`normalizarSituacaoParcela`](../lib/normalizar-status.ts), que
  desembrulha rich text/fórmula, tira acento e caixa, e classifica em
  `QUITADO | A_VENCER | QUEBRA | INDEFINIDO`. Distribuição real: 575 QUITADO /
  516 A_VENCER / 458 QUEBRA / 74 INDEFINIDO.
- **Dados vazando para a coluna errada:** ~61 linhas têm uma **data** na coluna Situação
  (às vezes como resultado de fórmula) — viram `INDEFINIDO` na normalização. Nos
  processos com código `7022`, a **Data de Pagamento aparece na coluna Situação** e
  SISTEMA / Data de Entrada ficam vazios.
- **Linhas de continuação em branco:** só a 1ª parcela do processo traz
  Data de Entrada / SISTEMA / Protocolo; as demais herdam (fill-forward). Por isso o
  parser guarda o "processo corrente" e só troca quando aparece novo nº de processo.
- **Protocolo com quebras de linha** (`\n`) e espaços extras — limpar com `cleanText`.
- **Processos sem nº** (19 linhas) — descartados no import.
- **Placeholders** tipo `processo`, `xxxxxxx`, `0000-0.000` — filtrados por
  `normalizeProcesso`.

Fontes canônicas de parsing já implementadas (reutilizar, não reinventar):
[lib/parse-numero-br.ts](../lib/parse-numero-br.ts) (números BR: `1.234,56`),
[lib/normalizar-status.ts](../lib/normalizar-status.ts) (Situação → status canônico),
`parseExcelDate`, `cleanText`, `normalizeProcesso` no import.

---

## 6. Regras de ouro para código novo

1. **Total de contrapartida = soma das parcelas.** Nunca usar a contrapartida da
   planilha de monitoramento (corrompida por escala).
2. **Arrecadado** = parcelas com `status_quitacao = true`. **Não** inclui quebra.
   Quitada sem `data_quitacao` → considerar a data de **vencimento** como pagamento
   (`dataPagamentoParcela` em `lib/parcelas-utils.ts`), **desde que o vencimento não
   esteja no futuro** (nunca inventar data de pagamento futura). Na Aprova Digital,
   a coluna "Data/Ano de PAGTO" pode trazer data completa — usar como `data_quitacao`.
   Data de pagamento futura na fonte: se o vencimento já passou, proxy no vencimento;
   se ainda não venceu, tratar como a vencer.
3. **Quebra ≠ a vencer ≠ vencido não pago.** São estados distintos.
4. **Tipo vem do código**, não de texto livre: `79 → PDE`, `78 → COTA`, `109 → AIU`.
5. Ao ler qualquer célula, assumir que **pode estar na coluna errada ou com caixa/
   acento variados** — normalizar sempre.

---

_Ver também: [propostas-relatorios.md](./propostas-relatorios.md) (relatórios que
dependem desses conceitos) e o `schema.prisma` (modelos `Processo`, `Parcela`,
`MonitoramentoFicha`, `MonitoramentoCotaSolidariedade`)._
