/**
 * Aplica a planilha "OUTORGA - PARCELAS CONSOLIDADAS" (aba PARCELAS, gerada por
 * scripts/consolidar-planilhas-parcelas.ts) no banco, reutilizando o reconciliador
 * do importador universal (preserva IDs, não exclui parcelas, transação por processo).
 *
 * Uso:
 *   npx tsx scripts/importar-consolidada.ts <consolidada.xlsx>            # prévia
 *   npx tsx scripts/importar-consolidada.ts --aplicar <consolidada.xlsx>  # grava (com backup)
 *   --incluir-portal  inclui as parcelas deduzidas do Portal (heurística; padrão: ignora)
 *
 * Regras (projeto/contexto-dominio.md):
 *  - data de pagamento só é gravada quando foi informada (origem DATA_*); "ano apenas" ou
 *    "sem data" ficam só com o ano — a data assumida = vencimento é aplicada nos relatórios;
 *  - linhas sem obrigação, com processo inválido ou sem vencimento/valor não são importadas.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { normalizarNumeroProcesso } from '../lib/mascara-processo';
import { desembrulharCelula } from '../lib/excel-cell';
import { dataPlanilha, type LinhaImportacao, type Obrigacao, type PendenciaImportacao } from '../lib/importador-universal';
import { reconciliarParcelas } from '../lib/server/importador-universal';

const OBRIGACOES = new Set(['PDE', 'COTA', 'AIU']);
const ALERTAS_BLOQUEANTES = ['PROCESSO_FORMATO_INVALIDO', 'PROCESSO_DV_INVALIDO', 'PROCESSO_DV_DIVERGENTE'];
/** Origens em que a data de pagamento NÃO é uma data real informada. */
const ORIGENS_SEM_DATA_REAL = /^(ANO_APENAS|SEM_DATA|ANTECIPACAO_SEM_DATA|DEDUZIDA|DATA_IMPLAUSIVEL|DATA_INVALIDA|PAGTO_FUTURO|NAO_PAGA)/;

function sheetDeObjetos(wb: ExcelJS.Workbook, nome: string, linhas: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(nome);
  if (!linhas.length) return;
  ws.columns = Object.keys(linhas[0]).map((key) => ({ header: key, key }));
  ws.addRows(linhas);
}

async function main() {
  const args = process.argv.slice(2);
  const aplicar = args.includes('--aplicar');
  const incluirPortal = args.includes('--incluir-portal');
  const arquivo = args.find((a) => !a.startsWith('--'));
  if (!arquivo) throw new Error('Informe o caminho da planilha consolidada.');
  // --excluir=<processo>[#<parcela>] (repetível): deixa o processo (ou só a parcela) de fora
  const excluir = new Set(args.filter((a) => a.startsWith('--excluir=')).map((a) => a.slice(10)));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(arquivo);
  const ws = wb.getWorksheet('PARCELAS');
  if (!ws) throw new Error('Aba PARCELAS não encontrada.');
  const cab = new Map<string, number>();
  ws.getRow(1).eachCell((c, i) => cab.set(String(c.value).trim(), i));
  const col = (nome: string) => {
    const i = cab.get(nome);
    if (!i) throw new Error(`Coluna ausente na consolidada: ${nome}`);
    return i;
  };
  const C = Object.fromEntries(
    ['sistema', 'num_processo', 'data_entrada', 'cpf_cnpj', 'obrigacao', 'num_parcela', 'vencimento', 'valor', 'status_quitacao', 'quebra', 'data_pagamento', 'origem_data_pagamento', 'ano_pagamento', 'alertas', 'aba_origem', 'linha_origem'].map((n) => [n, col(n)]),
  ) as Record<string, number>;

  const hoje = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())}T00:00:00Z`);
  const linhas: LinhaImportacao[] = [];
  const pendencias: PendenciaImportacao[] = [];
  const ignoradas: Record<string, number> = {};
  const ignorar = (motivo: string) => { ignoradas[motivo] = (ignoradas[motivo] ?? 0) + 1; };

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const v = (n: string) => desembrulharCelula(row.getCell(C[n]).value);
    const fonte = `consolidada/${v('aba_origem') ?? '?'}:${v('linha_origem') ?? r}`;
    const sistema = String(v('sistema') ?? '');
    if (sistema === 'PORTAL' && !incluirPortal) { ignorar('Parcela deduzida do Portal'); continue; }
    const obrigacao = String(v('obrigacao') ?? '');
    if (!OBRIGACOES.has(obrigacao)) { ignorar('Sem obrigação (PDE/COTA/AIU)'); continue; }
    const alertas = String(v('alertas') ?? '');
    if (ALERTAS_BLOQUEANTES.some((a) => alertas.includes(a))) { ignorar('Processo com formato/DV inválido'); continue; }
    const processo = String(v('num_processo') ?? '').trim();
    const n = Number(v('num_parcela'));
    const valor = Number(v('valor'));
    const vencimento = dataPlanilha(v('vencimento'));
    if (!processo || !Number.isInteger(n) || n < 1 || !Number.isFinite(valor) || valor <= 0 || !vencimento) { ignorar('Parcela/valor/vencimento ausente'); continue; }

    if (excluir.has(processo) || excluir.has(`${processo}#${n}`)) { ignorar('Excluída por --excluir'); continue; }

    const quitada = v('status_quitacao') === true;
    const quebra = v('quebra') === true;
    const origem = String(v('origem_data_pagamento') ?? '');
    const dataReal = quitada && !ORIGENS_SEM_DATA_REAL.test(origem) ? dataPlanilha(v('data_pagamento')) : null;
    const ano = Number(v('ano_pagamento'));
    // paga, vencimento futuro e sem data: não há evidência confiável => mantém o que o banco já tem
    const confiavel = origem !== 'SEM_DATA_VENC_FUTURO';
    if (!confiavel) pendencias.push({ fonte, processo, parcela: n, motivo: 'Paga sem data e com vencimento futuro; mantido o estado do banco' });
    const cpf = String(v('cpf_cnpj') ?? '').trim();
    linhas.push({
      num_processo: processo,
      obrigacao: obrigacao as Obrigacao,
      num_parcela: n,
      valor,
      vencimento,
      data_quitacao: dataReal && dataReal <= hoje ? dataReal : null,
      ano_pagamento: quitada ? (dataReal ? dataReal.getUTCFullYear() : ano >= 1990 && ano <= hoje.getUTCFullYear() ? ano : null) : null,
      status_quitacao: quitada,
      quebra,
      fonte,
      pagamentoConfiavel: confiavel,
      data_entrada: dataPlanilha(v('data_entrada')) ?? undefined,
      cpf_cnpj: cpf && /^[\d./-]+$/.test(cpf) ? cpf : undefined,
    });
  }

  const output = path.resolve('scripts/output', `importacao-consolidada-${Date.now()}`);
  fs.mkdirSync(output, { recursive: true });
  const salvar = (nome: string, valor: unknown) => fs.writeFileSync(path.join(output, nome), JSON.stringify(valor, null, 2));

  const db = new PrismaClient();
  try {
    const previa = await reconciliarParcelas(db, linhas);
    salvar('auditoria.json', previa);
    const auditoria = new ExcelJS.Workbook();
    sheetDeObjetos(auditoria, 'Alteracoes', previa.alteracoes.map((a) => {
      const ant = (a.anterior ?? {}) as Record<string, unknown>;
      const novo = a.novo as Record<string, unknown>;
      const f = (x: unknown) => (x instanceof Date ? x.toISOString().slice(0, 10) : x ?? '');
      return {
        processo: a.processo, obrigacao: a.obrigacao, parcela: a.parcela, tipo: a.anterior ? 'ATUALIZA' : 'NOVA',
        valor_antes: f(ant.valor), valor_depois: f(novo.valor),
        venc_antes: f(ant.vencimento), venc_depois: f(novo.vencimento),
        pago_antes: f(ant.status_quitacao), pago_depois: f(novo.status_quitacao),
        quebra_antes: f(ant.quebra), quebra_depois: f(novo.quebra),
        data_pgto_antes: f(ant.data_quitacao), data_pgto_depois: f(novo.data_quitacao),
      };
    }));
    sheetDeObjetos(auditoria, 'Pendencias', [...pendencias, ...previa.pendencias]);
    sheetDeObjetos(auditoria, 'Processos ausentes', previa.processosAusentes.map((processo) => ({ processo })));
    await auditoria.xlsx.writeFile(path.join(output, 'auditoria-consolidada.xlsx'));

    if (aplicar) {
      const numeros = [...new Set(linhas.map((l) => normalizarNumeroProcesso(l.num_processo)))];
      salvar('backup.json', await db.processo.findMany({ where: { num_processo: { in: numeros } }, include: { parcelas: true } }));
      salvar('aplicacao.json', await reconciliarParcelas(db, linhas, true));
      salvar('verificacao.json', await reconciliarParcelas(db, linhas));
    }
    const a = previa.alteracoes;
    const camposMudados = { valor: 0, vencimento: 0, status: 0, quebra: 0, data_pagamento: 0 };
    for (const x of a) {
      if (!x.anterior) continue;
      const ant = x.anterior as Record<string, unknown>, novo = x.novo as Record<string, unknown>;
      const dif = (k: string) => JSON.stringify(ant[k]) !== JSON.stringify(novo[k]);
      if (dif('valor')) camposMudados.valor++;
      if (dif('vencimento')) camposMudados.vencimento++;
      if (dif('status_quitacao')) camposMudados.status++;
      if (dif('quebra')) camposMudados.quebra++;
      if (dif('data_quitacao')) camposMudados.data_pagamento++;
    }
    console.log(JSON.stringify({
      output, aplicar, linhasLidas: linhas.length, ignoradas,
      processosAusentes: previa.processosAusentes.length, parcelasNovas: previa.parcelasNovas,
      parcelasAtualizadas: a.filter((x) => x.anterior).length, camposMudados,
      pendencias: pendencias.length + previa.pendencias.length,
    }, null, 2));
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : 'Falha na importação'); process.exitCode = 1; });
