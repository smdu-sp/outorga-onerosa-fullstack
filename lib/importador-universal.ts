import * as XLSX from 'xlsx';
import { corrigirNumProcesso } from './corrigir-num-processo';
import { normalizarSituacaoParcela } from './normalizar-status';
import { corrigirVencimentoConfirmado } from './correcoes-planilhas';

export type Obrigacao = 'PDE' | 'COTA' | 'AIU';
export type LinhaImportacao = {
  num_processo: string; obrigacao: Obrigacao; num_parcela: number; valor: number;
  vencimento: Date; data_quitacao: Date | null; ano_pagamento: number | null;
  status_quitacao: boolean; quebra: boolean; fonte: string;
  pagamentoConfiavel: boolean;
  data_entrada?: Date; cpf_cnpj?: string;
};
export type PendenciaImportacao = { fonte: string; motivo: string; processo?: string; parcela?: number };
const normalizar = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

/** Datas civis estritas: nunca usar Date.parse para texto preenchido manualmente. */
export function dataPlanilha(v: unknown, sistema1904 = false): Date | null {
  let y: number, m: number, d: number;
  if (v instanceof Date) { y = v.getUTCFullYear(); m = v.getUTCMonth() + 1; d = v.getUTCDate(); }
  else if (typeof v === 'number' && v > 20000 && v < 80000) {
    const p = XLSX.SSF.parse_date_code(v, { date1904: sistema1904 });
    if (!p) return null;
    y = p.y; m = p.m; d = p.d;
  } else {
    const s = String(v ?? '').trim();
    const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (br) { d = +br[1]; m = +br[2]; y = +br[3]; }
    else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
    else return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1990 && y <= 2100 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

export function valorPlanilha(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
  const s = String(v ?? '').replace(/R\$/gi, '').replace(/\s/g, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s) && !/^\d+\.\d{1,2}$/.test(s)) return null;
  return Math.round(Number(s.includes(',') || /^\d{1,3}(?:\.\d{3})+$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) * 100) / 100;
}

/** Detecção por cabeçalhos, independente da posição e ordem das abas. */
export function lerPlanilhaUniversal(wb: XLSX.WorkBook, arquivo: string, hoje: Date) {
  const linhas: LinhaImportacao[] = [], pendencias: PendenciaImportacao[] = [];
  const abasIgnoradas: string[] = [];
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome];
    // Não expandir dimensões infladas por formatação (há aba com 16.318 colunas).
    const rows = new Map<number, Map<number, unknown>>();
    for (const address of Object.keys(ws)) {
      if (address.startsWith('!')) continue;
      const cell = ws[address];
      if (cell.v == null) continue;
      const { r, c } = XLSX.utils.decode_cell(address);
      if (!rows.has(r)) rows.set(r, new Map());
      rows.get(r)!.set(c, cell.v);
    }
    let header = -1;
    let cols: Map<number, unknown> = new Map();
    for (const [r, row] of [...rows].sort((a,b) => a[0]-b[0]).slice(0, 20)) {
      const labels = [...row.values()].map(normalizar);
      if (labels.some(s => s.startsWith('VALOR')) && labels.some(s => s.startsWith('VENCIM'))) { header = r; cols = row; break; }
    }
    const find = (predicate: (s: string) => boolean) => [...cols].find(([, v]) => predicate(normalizar(v)))?.[0];
    const proc = find(s => s === 'PROCESSO' || s.includes('PROCESSO SEI') || s === 'SEI');
    const val = find(s => s.startsWith('VALOR')), venc = find(s => s.startsWith('VENCIM'));
    if (header < 0 || proc == null || val == null || venc == null) { abasIgnoradas.push(`${arquivo}/${nome}`); continue; }
    const parc = find(s => s.startsWith('PARC'));
    const cod = find(s => s.includes('CODIGO DA GUIA') || s.startsWith('C') && s.includes('D.') || s.startsWith('PDE('));
    const codAlternativo = find(s => s.startsWith('PDE'));
    const pag = find(s => s.startsWith('QUITA') || s.includes('PAGTO') || s === 'ANO DE PAGAMENTO');
    const ano = find(s => s.startsWith('ANO'));
    const status = find(s => s.startsWith('SITUA') || s === 'PAGAMENTO' || s === 'OBS.');
    const entrada = find(s => s === 'ENTRADA' || s === 'DATA');
    const cpf = find(s => s === 'CPF/CNPJ');
    let processo = '', obrigacao: Obrigacao | undefined;
    let dataEntrada: Date | undefined, cpfCnpj: string | undefined;
    for (const [r, row] of [...rows].sort((a,b) => a[0]-b[0])) {
      if (r <= header) continue;
      const get = (c?: number) => c == null ? undefined : row.get(c);
      const fonte = `${arquivo}/${nome}:${r + 1}`;
      const bruto = String(get(proc) ?? '').trim().replace(/\s/g, '');
      if (bruto && bruto !== processo) { processo = corrigirNumProcesso(bruto); obrigacao = undefined; dataEntrada = undefined; cpfCnpj = undefined; }
      dataEntrada = dataPlanilha(get(entrada), !!wb.Workbook?.WBProps?.date1904) ?? dataEntrada;
      cpfCnpj = get(cpf) != null ? String(get(cpf)).trim() : cpfCnpj;
      const tipos: Record<string, Obrigacao> = { '79':'PDE', '7022':'PDE', '7023':'PDE', '78':'COTA', '7137':'COTA', '109':'AIU' };
      obrigacao = tipos[String(get(cod) ?? '')] ?? tipos[String(get(codAlternativo) ?? '')] ?? obrigacao;
      if (get(val) == null && get(parc) == null) continue;
      const n = parc == null ? 1 : Number(get(parc));
      const valor = valorPlanilha(get(val)), vencimento = corrigirVencimentoConfirmado(processo, obrigacao, n, dataPlanilha(get(venc), !!wb.Workbook?.WBProps?.date1904));
      const alertar = (motivo: string) => pendencias.push({ fonte, motivo, processo, parcela: n });
      if (!/^(?:\d{4}\.\d{4}\/\d+-\d+|\d{4}[.-]\d[.-]\d[\d.]*-\d)$/.test(processo) || !obrigacao || !Number.isInteger(n) || n < 1 || valor == null || !vencimento) {
        alertar('Identificação, obrigação, parcela, valor ou vencimento inválido'); continue;
      }
      const rawPag = get(pag);
      let data = dataPlanilha(rawPag, !!wb.Workbook?.WBProps?.date1904);
      const year = /^\d{4}$/.test(String(rawPag ?? '').trim()) ? Number(rawPag) : Number(get(ano));
      let anoPagamento = year >= 1990 && year <= hoje.getUTCFullYear() ? year : null;
      let confiavel = true;
      if (data && (data > hoje || anoPagamento != null && anoPagamento !== data.getUTCFullYear())) { alertar('Pagamento futuro ou divergente do ano informado'); data = null; confiavel = false; }
      if (rawPag != null && String(rawPag).trim() && !data && !anoPagamento && !['S','N'].includes(normalizar(rawPag))) { alertar('Data de pagamento ilegível'); confiavel = false; }
      const situacao = normalizarSituacaoParcela(get(status));
      const quitada = situacao === 'QUITADO' || situacao === 'INDEFINIDO' && (data != null || normalizar(nome).includes('QUITADO'));
      if (quitada && situacao === 'INDEFINIDO' && !data && vencimento > hoje) { alertar('Quitação inferida da aba com vencimento futuro; revisar'); confiavel = false; }
      const quebra = situacao === 'QUEBRA' || situacao === 'INDEFINIDO' && !quitada && normalizar(nome).includes('QUEBRA');
      if (!quitada && data) { alertar('Data de pagamento contradiz situação da parcela'); confiavel = false; data = null; }
      if (quitada && !data) alertar('Sem data exata; pagamento considerado no vencimento quando passado');
      if (!quitada) { data = null; anoPagamento = null; }
      if (data) anoPagamento = data.getUTCFullYear();
      linhas.push({num_processo:processo, obrigacao, num_parcela:n, valor, vencimento, data_quitacao:data, ano_pagamento:anoPagamento, status_quitacao:quitada, quebra, fonte, pagamentoConfiavel:confiavel, data_entrada:dataEntrada, cpf_cnpj:cpfCnpj});
    }
  }
  return { linhas, pendencias, abasIgnoradas };
}
