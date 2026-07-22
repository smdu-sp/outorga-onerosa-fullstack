/**
 * Queries de exemplo para o dashboard de Outorga Onerosa.
 *
 * Assume os ajustes de schema descritos em schema-ajustes.prisma
 * (campos decimais migrados, dias_atraso materializado, historico_status
 * criado). Onde a query já funciona com o schema ATUAL (sem ajustes),
 * está marcado com [SCHEMA ATUAL]. Onde depende dos ajustes, está
 * marcado com [PRECISA AJUSTE].
 *
 * Todas as queries usam Prisma Client + agregações nativas quando possível,
 * caindo para $queryRaw só quando a agregação necessária não é suportada
 * pelo Prisma (ex: percentis, window functions).
 */

import { PrismaClient, StatusPagamento, Tipo } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// MÓDULO 1 — KPIs GERAIS
// ============================================================================

/** [SCHEMA ATUAL] Totais gerais por status de pagamento */
export async function kpisGerais() {
  const porStatus = await prisma.processo.groupBy({
    by: ['status_pagamento'],
    _count: { id: true },
  });

  const parcelas = await prisma.parcela.aggregate({
    _sum: { valor: true },
    where: { status_quitacao: true },
  });

  const emAberto = await prisma.parcela.aggregate({
    _sum: { valor: true },
    where: { status_quitacao: false, quebra: false },
  });

  const emQuebra = await prisma.parcela.aggregate({
    _sum: { valor: true },
    where: { quebra: true },
  });

  return {
    processosPorStatus: porStatus,
    totalArrecadado: parcelas._sum.valor ?? 0,
    totalEmAberto: emAberto._sum.valor ?? 0,
    totalEmQuebra: emQuebra._sum.valor ?? 0,
  };
}

/** [SCHEMA ATUAL] Ticket médio por tipo de processo (PDE/COTA/AIU) */
export async function ticketMedioPorTipo() {
  return prisma.$queryRaw<{ tipo: Tipo; ticket_medio: number; total_processos: bigint }[]>`
    SELECT p.tipo,
           AVG(sub.total_parcela) AS ticket_medio,
           COUNT(DISTINCT p.id) AS total_processos
    FROM processos p
    JOIN (
      SELECT processo_id, SUM(valor) AS total_parcela
      FROM parcelas
      GROUP BY processo_id
    ) sub ON sub.processo_id = p.id
    GROUP BY p.tipo
  `;
}

// ============================================================================
// MÓDULO 2 — FINANCEIRO
// ============================================================================

/** [SCHEMA ATUAL] Série temporal de arrecadação mensal */
export async function arrecadacaoMensal(anoInicio: number, anoFim: number) {
  return prisma.$queryRaw<{ ano: number; mes: number; total: number }[]>`
    SELECT YEAR(data_quitacao) AS ano,
           MONTH(data_quitacao) AS mes,
           SUM(valor) AS total
    FROM parcelas
    WHERE status_quitacao = true
      AND YEAR(data_quitacao) BETWEEN ${anoInicio} AND ${anoFim}
    GROUP BY YEAR(data_quitacao), MONTH(data_quitacao)
    ORDER BY ano, mes
  `;
}

/**
 * [PRECISA AJUSTE: dias_atraso materializado]
 * Aging report: parcelas vencidas não pagas, por faixa de atraso.
 * Sem o campo materializado, dá pra fazer com DATEDIFF direto (mostrado
 * como fallback comentado).
 */
export async function agingReport() {
  return prisma.$queryRaw<{ faixa: string; quantidade: bigint; valor_total: number }[]>`
    SELECT
      CASE
        WHEN DATEDIFF(CURDATE(), vencimento) BETWEEN 0 AND 30 THEN '0-30 dias'
        WHEN DATEDIFF(CURDATE(), vencimento) BETWEEN 31 AND 60 THEN '31-60 dias'
        WHEN DATEDIFF(CURDATE(), vencimento) > 60 THEN '60+ dias'
        ELSE 'em dia'
      END AS faixa,
      COUNT(*) AS quantidade,
      SUM(valor) AS valor_total
    FROM parcelas
    WHERE status_quitacao = false
      AND vencimento < CURDATE()
    GROUP BY faixa
  `;
}

/** [SCHEMA ATUAL] Antecipação: % de parcelas antecipadas e dias médios */
export async function analiseAntecipacao() {
  const total = await prisma.parcela.count();
  const antecipadas = await prisma.parcela.aggregate({
    where: { antecipada: true },
    _count: { id: true },
    _avg: { dias_antecipacao: true },
  });

  return {
    percentualAntecipadas: total > 0 ? (antecipadas._count.id / total) * 100 : 0,
    diasAntecipacaoMedio: antecipadas._avg.dias_antecipacao ?? 0,
  };
}

// ============================================================================
// MÓDULO 3 — GEOGRÁFICO
// ============================================================================

/** [SCHEMA ATUAL] Contrapartida total por subprefeitura */
export async function contrapartidaPorSubprefeitura() {
  return prisma.$queryRaw<{ subprefeitura: string; total: number; qtd_fichas: bigint }[]>`
    SELECT eu.subprefeitura,
           SUM(co.contrapartida_total) AS total,
           COUNT(DISTINCT f.id) AS qtd_fichas
    FROM monitoramento_fichas f
    JOIN monitoramento_enquadramento_urbanistico eu ON eu.monitoramento_ficha_id = f.id
    JOIN monitoramento_calculo_outorga co ON co.monitoramento_ficha_id = f.id
    WHERE eu.subprefeitura IS NOT NULL
    GROUP BY eu.subprefeitura
    ORDER BY total DESC
  `;
  // NOTA: contrapartida_total precisa estar como Decimal (ver ajuste #3);
  // enquanto for String, SUM() vai falhar ou dar resultado incorreto no MySQL.
}

// ============================================================================
// MÓDULO 4 — URBANÍSTICO
// ============================================================================

/** [SCHEMA ATUAL] Distribuição de coeficiente utilizado vs básico (para histograma) */
export async function distribuicaoCoeficientes() {
  return prisma.monitoramentoCalculoOutorga.findMany({
    select: {
      coeficiente_basico: true,
      coeficiente_utilizado: true,
    },
    where: {
      coeficiente_basico: { not: null },
      coeficiente_utilizado: { not: null },
    },
  });
  // O binning em faixas (histograma) fica melhor feito no frontend
  // (ex: recharts) a partir da lista bruta, ou com CASE WHEN no SQL
  // se o volume de linhas for muito grande.
}

// ============================================================================
// MÓDULO 5 — COTA DE SOLIDARIEDADE
// ============================================================================

/** [SCHEMA ATUAL] Gap entre valor calculado e valor pago, por modalidade */
export async function gapCotaSolidariedade() {
  return prisma.monitoramentoCotaSolidariedade.groupBy({
    by: ['modalidade'],
    _sum: {
      valor_calculado_processo: true,
      estimativa_deposito_fundurb: true,
    },
    _count: { id: true },
  });
  // valor_pago/valor_devido ficam de fora aqui pois ainda são String;
  // após o ajuste #3, incluir na agregação.
}

// ============================================================================
// MÓDULO 6 — PREVISÕES / INSIGHTS
// ============================================================================

/**
 * [SCHEMA ATUAL, mas melhora muito com histórico]
 * Forecast simples de arrecadação: soma das parcelas com vencimento futuro,
 * ponderada pela taxa histórica de quebra do mesmo tipo de processo.
 *
 * Abordagem: calcular taxa_quebra_historica = quebras / total_parcelas_vencidas
 * por Tipo de processo, e aplicar (1 - taxa_quebra) sobre o valor nominal
 * das parcelas futuras. É um forecast ingênuo (não é ML), mas já é muito
 * mais realista que somar o valor nominal bruto.
 */
export async function forecastArrecadacao() {
  const taxasQuebra = await prisma.$queryRaw<{ tipo: Tipo; taxa_quebra: number }[]>`
    SELECT p.tipo,
           SUM(CASE WHEN pc.quebra = true THEN 1 ELSE 0 END) / COUNT(*) AS taxa_quebra
    FROM parcelas pc
    JOIN processos p ON p.id = pc.processo_id
    WHERE pc.vencimento < CURDATE()
    GROUP BY p.tipo
  `;

  const parcelasFuturas = await prisma.$queryRaw<{ tipo: Tipo; valor_nominal: number }[]>`
    SELECT p.tipo, SUM(pc.valor) AS valor_nominal
    FROM parcelas pc
    JOIN processos p ON p.id = pc.processo_id
    WHERE pc.vencimento >= CURDATE()
      AND pc.status_quitacao = false
    GROUP BY p.tipo
  `;

  const mapaTaxas = new Map(taxasQuebra.map((t) => [t.tipo, t.taxa_quebra]));

  return parcelasFuturas.map((pf) => {
    const taxa = mapaTaxas.get(pf.tipo) ?? 0;
    return {
      tipo: pf.tipo,
      valorNominal: pf.valor_nominal,
      valorProjetado: pf.valor_nominal * (1 - taxa),
      taxaQuebraAplicada: taxa,
    };
  });
}

/**
 * [PRECISA AJUSTE: histórico de antecipação por CPF/CNPJ]
 * Score de risco simplificado por processo: combina tipo, origem e
 * comportamento histórico do CPF/CNPJ nas parcelas já vencidas.
 * Isso é um ponto de partida heurístico — para um modelo real, os
 * mesmos dados alimentam uma regressão logística treinada fora do banco
 * (Python/scikit-learn) e o score calculado é salvo de volta numa coluna
 * (ex: Processo.score_risco).
 */
export async function scoreRiscoHeuristico(processoId: string) {
  const processo = await prisma.processo.findUniqueOrThrow({
    where: { id: processoId },
    include: { parcelas: true },
  });

  const cpfsCnpjs = [...new Set(processo.parcelas.map((p) => p.cpf_cnpj).filter(Boolean))];

  let historicoQuebras = 0;
  let historicoTotal = 0;

  if (cpfsCnpjs.length > 0) {
    const historico = await prisma.parcela.groupBy({
      by: ['cpf_cnpj'],
      where: { cpf_cnpj: { in: cpfsCnpjs as string[] }, vencimento: { lt: new Date() } },
      _count: { id: true },
    });
    const quebras = await prisma.parcela.groupBy({
      by: ['cpf_cnpj'],
      where: { cpf_cnpj: { in: cpfsCnpjs as string[] }, quebra: true },
      _count: { id: true },
    });
    historicoTotal = historico.reduce((acc, h) => acc + h._count.id, 0);
    historicoQuebras = quebras.reduce((acc, q) => acc + q._count.id, 0);
  }

  const taxaHistoricaQuebra = historicoTotal > 0 ? historicoQuebras / historicoTotal : 0;

  // Score simples de 0 (baixo risco) a 100 (alto risco) — placeholder,
  // ajustar pesos conforme validação com dados reais.
  const score = Math.min(100, taxaHistoricaQuebra * 100);

  return { processoId, taxaHistoricaQuebra, score };
}

// ============================================================================
// MÓDULO 7 — QUALIDADE DE DADOS
// ============================================================================

/** [SCHEMA ATUAL] % de completude de campos-chave por ficha de monitoramento */
export async function completudeFichas() {
  const fichas = await prisma.monitoramentoFicha.findMany({
    include: {
      enquadramento_urbanistico: true,
      calculo_outorga: true,
      situacao: true,
    },
  });

  return fichas.map((f) => {
    const camposChave = [
      f.enquadramento_urbanistico?.subprefeitura,
      f.enquadramento_urbanistico?.distrito,
      f.calculo_outorga?.contrapartida_total,
      f.calculo_outorga?.area_computavel_total,
      f.situacao?.situacao,
    ];
    const preenchidos = camposChave.filter((c) => c !== null && c !== undefined).length;

    return {
      fichaId: f.id,
      completude: (preenchidos / camposChave.length) * 100,
    };
  });
}
