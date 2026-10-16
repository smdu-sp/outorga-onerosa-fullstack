/**
 * Consolida as planilhas de controle (Aprova Digital + Físicos/SEI) e as parcelas
 * do "Portal" já gravadas no banco em UMA planilha orientada a parcelas
 * (uma linha = uma parcela, com os dados do processo repetidos).
 *
 * Uso:
 *   npx tsx scripts/consolidar-planilhas-parcelas.ts [aprova.xlsm] [fisicos.xlsx] [saida.xlsx]
 *
 * Regras de domínio: projeto/contexto-dominio.md. Em especial:
 *  - tipo/obrigação vem do código (79 PDE, 78 COTA, 109 AIU, 7022/7023 PDE, 7137 COTA);
 *  - total = soma das parcelas (a contrapartida da planilha de monitoramento não é usada);
 *  - data de pagamento só com ANO (ou "S"/sem data) = data do vencimento;
 *  - nunca inventar data de pagamento no futuro.
 */
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PrismaClient, type Tipo } from '@prisma/client';
import { desembrulharCelula, serialExcelParaData } from '../lib/excel-cell';
import { normalizarSituacaoParcela } from '../lib/normalizar-status';
import { classificarAntecipacao } from '../lib/antecipacao';
import { corrigirNumProcesso } from '../lib/corrigir-num-processo';
import { dataCivilHoje } from '../lib/datas';

// ---------------------------------------------------------------- tipos

type Sistema = 'APROVA_DIGITAL' | 'SEI' | 'FISICO' | 'SLCE' | 'PORTAL';
type StatusParcela = 'PAGO' | 'A_VENCER' | 'VENCIDA_NAO_PAGA' | 'QUEBRA';
type StatusSheet = 'QUITADO' | 'EM_PAGAMENTO' | 'QUEBRA';

interface Cfg {
  arquivo: 'AD' | 'FIS';
  aba: string; // trim() do nome da aba
  statusSheet: StatusSheet;
  sistema: Sistema;
  /** Colunas 1-based; arrays = primeira célula preenchida vence. */
  entrada?: number;
  cod: number[];
  protocolo?: number[];
  processo: number[];
  cpf?: number;
  parc?: number; // sem parc => parcela única
  venc: number;
  valor: number;
  /** Colunas com evidência de pagamento (data completa, só ano, S/N...). */
  pagto: number[];
  sit: number[];
  /** Sobrescreve a obrigação quando o código não vem (ex.: aba AIU-PIU). */
  obrigacaoPadrao?: Tipo;
  /** Layout de processo (para canonicalizar). */
  formatoProcesso?: 'SEI' | 'FISICO';
}

const CFGS: Cfg[] = [
  // ---- Aprova Digital
  { arquivo: 'AD', aba: 'AIU-PIU', statusSheet: 'EM_PAGAMENTO', sistema: 'APROVA_DIGITAL', entrada: 1, cod: [2], protocolo: [3], processo: [4], cpf: 5, parc: 6, venc: 7, valor: 8, pagto: [9], sit: [10], obrigacaoPadrao: 'AIU' },
  { arquivo: 'AD', aba: 'Em pagamento - DPD', statusSheet: 'EM_PAGAMENTO', sistema: 'APROVA_DIGITAL', entrada: 1, cod: [2], protocolo: [3], processo: [4], cpf: 5, parc: 6, venc: 7, valor: 8, pagto: [9], sit: [10] },
  { arquivo: 'AD', aba: 'QUEBRA - DPD', statusSheet: 'QUEBRA', sistema: 'APROVA_DIGITAL', entrada: 1, cod: [2], protocolo: [3], processo: [4], cpf: 5, parc: 6, venc: 7, valor: 8, pagto: [9], sit: [10] },
  { arquivo: 'AD', aba: 'Quitado - DPD', statusSheet: 'QUITADO', sistema: 'APROVA_DIGITAL', entrada: 1, cod: [2], protocolo: [3], processo: [4], cpf: 5, parc: 6, venc: 7, valor: 8, pagto: [9], sit: [10] },
  { arquivo: 'AD', aba: 'Pagamento à Vista  - DPCI', statusSheet: 'EM_PAGAMENTO', sistema: 'APROVA_DIGITAL', cod: [3, 2], protocolo: [5], processo: [6], cpf: 7, venc: 8, valor: 9, pagto: [10], sit: [11, 13] },
  { arquivo: 'AD', aba: 'Quitado - DPCI', statusSheet: 'QUITADO', sistema: 'APROVA_DIGITAL', cod: [3], protocolo: [4], processo: [5, 6], cpf: 7, venc: 8, valor: 9, pagto: [10], sit: [12] },
  { arquivo: 'AD', aba: 'Quebra - DPCI', statusSheet: 'QUEBRA', sistema: 'APROVA_DIGITAL', cod: [3, 2], protocolo: [5], processo: [6, 4], cpf: 7, venc: 8, valor: 9, pagto: [10], sit: [11] },
  // ---- Físicos e SEI
  { arquivo: 'FIS', aba: 'A Vencer - DPD - FISICO', statusSheet: 'EM_PAGAMENTO', sistema: 'FISICO', formatoProcesso: 'FISICO', entrada: 1, cod: [2], processo: [3], cpf: 4, parc: 5, venc: 6, valor: 7, pagto: [8], sit: [9, 11] },
  { arquivo: 'FIS', aba: 'Quitado', statusSheet: 'QUITADO', sistema: 'FISICO', formatoProcesso: 'FISICO', entrada: 1, cod: [2], processo: [3], cpf: 4, parc: 5, venc: 6, valor: 7, pagto: [8], sit: [9] },
  { arquivo: 'FIS', aba: 'Quebra', statusSheet: 'QUEBRA', sistema: 'FISICO', formatoProcesso: 'FISICO', entrada: 1, cod: [2], processo: [3], cpf: 4, parc: 5, venc: 6, valor: 7, pagto: [8], sit: [9] },
  { arquivo: 'FIS', aba: 'A Vencer - SEI - DPD', statusSheet: 'EM_PAGAMENTO', sistema: 'SEI', formatoProcesso: 'SEI', entrada: 1, cod: [2], processo: [3], cpf: 4, parc: 5, venc: 6, valor: 7, pagto: [8], sit: [9] },
  { arquivo: 'FIS', aba: 'SEI - QUITADO', statusSheet: 'QUITADO', sistema: 'SEI', formatoProcesso: 'SEI', entrada: 1, cod: [2], processo: [3], cpf: 4, parc: 5, venc: 6, valor: 7, pagto: [8, 12], sit: [9] },
  { arquivo: 'FIS', aba: 'SEI - QUEBRA', statusSheet: 'QUEBRA', sistema: 'SEI', formatoProcesso: 'SEI', entrada: 1, cod: [2], processo: [3], cpf: 4, parc: 5, venc: 6, valor: 7, pagto: [8], sit: [9] },
];

const TIPO_POR_CODIGO: Record<string, Tipo> = {
  '79': 'PDE',
  '78': 'COTA',
  '109': 'AIU',
  '7022': 'PDE',
  '7023': 'PDE',
  '7137': 'COTA',
};

interface Rec {
  sistema: Sistema;
  arquivo: string;
  aba: string;
  linha: number;
  statusSheet: StatusSheet;
  num_processo: string;
  num_processo_original: string;
  codigo?: string;
  obrigacao?: Tipo;
  protocolo?: string;
  data_entrada?: Date;
  cpf_cnpj?: string;
  num_parcela: number;
  parcela_unica: boolean;
  vencimento?: Date;
  valor?: number;
  situacao_original?: string;
  pagamento_original?: string;
  quitada: boolean;
  quebra: boolean;
  data_pagamento?: Date;
  data_pagamento_origem: string;
  antecipada: boolean;
  dias_antecipacao?: number;
  /** ano que a planilha trazia na coluna de pagamento (quando só havia o ano) */
  ano_informado?: number;
  alertas: Set<string>;
  /** Alertas que exigem conferência humana (os demais são só informativos). */
  revisar: boolean;
  /** vem do banco (Portal) */
  doBanco?: boolean;
}

// ---------------------------------------------------------------- utilitários

const HOJE = dataCivilHoje();
const DIA = 86_400_000;

const un = (v: unknown) => desembrulharCelula(v);

function txt(v: unknown): string | undefined {
  const b = un(v);
  if (b === null || b === undefined) return undefined;
  if (b instanceof Date || typeof b === 'object') return undefined; // data ou erro de fórmula
  const s = String(b).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.toLowerCase() === 'nan' || s === '-') return undefined;
  return s;
}

/** Linhas que não viraram parcela (auditoria na aba DESCARTADAS). */
const descartadas: { arquivo: string; aba: string; linha: number; motivo: string; resumo: string }[] = [];

function resumoLinha(row: Linha): string {
  return row
    .slice(1, 13)
    .map((c) => {
      const b = un(c);
      if (b === null || b === undefined) return '';
      if (b instanceof Date) return fmtISO(b);
      if (typeof b === 'object') return '#ERRO';
      return String(b).replace(/\s+/g, ' ').trim().slice(0, 28);
    })
    .join(' | ');
}

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DIA);
}

function addMeses(d: Date, n: number): Date {
  const alvo = d.getUTCMonth() + n;
  const y = d.getUTCFullYear() + Math.floor(alvo / 12);
  const m = ((alvo % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return utc(y, m + 1, Math.min(d.getUTCDate(), ultimo));
}

function fmtISO(d?: Date): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

function anoValido(y: number) {
  return y >= 1990 && y <= 2100;
}

interface DataParse {
  data?: Date;
  /** corrigida a partir de texto malformado ou dia inexistente */
  ajustada?: boolean;
}

/** Interpreta Date/serial/texto (inclusive texto malformado, ex.: "1704/2023", "02/0921"). */
function parseData(v: unknown): DataParse {
  const b = un(v);
  if (b === null || b === undefined || b === '') return {};
  if (b instanceof Date) {
    if (isNaN(b.getTime())) return {};
    const d = utc(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate());
    return { data: d };
  }
  if (typeof b === 'number') {
    if (b > 20000 && b < 80000) {
      const s = serialExcelParaData(b);
      return s ? { data: s } : {};
    }
    return {};
  }
  const s = String(b).trim();
  if (!s) return {};
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { data: utc(+m[1], +m[2], +m[3]) };
  // dd/mm/aaaa, dd/mm/aa, dd/mm/aaa(malformado)
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
  let d: number | undefined, mo: number | undefined, y: number | undefined;
  let malformada = false;
  if (m) {
    d = +m[1];
    mo = +m[2];
    const ys = m[3];
    if (ys.length === 4) y = +ys;
    else if (ys.length === 2) y = 2000 + +ys;
    else {
      // "025" -> 2025, "205" -> 2025
      y = ys[0] === '0' ? +('2' + ys) : +(ys.slice(0, 2) + '2' + ys.slice(2));
      malformada = true;
    }
  } else if ((m = s.match(/^(\d{2})(\d{2})\/(\d{2,4})$/))) {
    // "1704/2023", "1710/21"
    d = +m[1];
    mo = +m[2];
    y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    malformada = true;
  } else if ((m = s.match(/^(\d{1,2})\/(\d{2})(\d{2}|\d{4})$/))) {
    // "02/0921", "14/0423", "25/042022"
    d = +m[1];
    mo = +m[2];
    y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    malformada = true;
  }
  if (d === undefined || mo === undefined || y === undefined) return {};
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || !anoValido(y)) return {};
  const ultimo = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > ultimo) return { data: utc(y, mo, ultimo), ajustada: true }; // 30/02/19 -> 28/02/19
  return { data: utc(y, mo, d), ajustada: malformada };
}

/** Valor monetário em formato BR ("R$ 1.234,56"), US ("139,159.71") ou número. */
function parseValor(v: unknown): { valor?: number; suspeito?: boolean; textoLixo?: boolean } {
  const b = un(v);
  if (b === null || b === undefined || b === '') return {};
  if (typeof b === 'number') {
    if (!isFinite(b)) return {};
    // 1990..2100 inteiro = ano digitado na coluna de valor
    if (Number.isInteger(b) && b >= 1990 && b <= 2100) return { suspeito: true };
    return { valor: Math.round(b * 100) / 100 };
  }
  if (b instanceof Date) return { suspeito: true };
  let s = String(b).replace(/ /g, ' ').trim();
  if (!/\d/.test(s)) return { textoLixo: true }; // "R$     " vazio
  s = s.replace(/[^\d.,-]/g, '');
  if (!s) return {};
  const temV = s.includes(',');
  const temP = s.includes('.');
  if (temV && temP) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (temV) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/,/g, (m, i) => (i === s.lastIndexOf(',') ? '.' : '')) : s.replace(/,/g, '');
  } else if (temP) {
    if (!/\.\d{3}$/.test(s) || (s.match(/\./g)?.length ?? 0) > 1) {
      if ((s.match(/\./g)?.length ?? 0) > 1) s = s.replace(/\./g, '');
    } else s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return isNaN(n) ? { textoLixo: true } : { valor: Math.round(n * 100) / 100 };
}

function somenteDigitos(s: string) {
  return s.replace(/\D/g, '');
}

/** Normaliza o nº de processo para o formato canônico do banco; devolve `ok` = formato reconhecido. */
function normalizarProcesso(
  bruto: string,
  formato?: 'SEI' | 'FISICO',
): { num: string; ok: boolean; reparado: boolean } {
  const original = corrigirNumProcesso(bruto.replace(/\s+/g, ' ').trim());
  let t = original.replace(/\s+/g, '');
  const dig = somenteDigitos(t);
  const pareceFisico = formato === 'FISICO' || /^\d{4}[-.]\d[-.]?\d/.test(t);
  if (pareceFisico && dig.length === 12) {
    return {
      num: `${dig.slice(0, 4)}-${dig[4]}.${dig.slice(5, 8)}.${dig.slice(8, 11)}-${dig[11]}`,
      ok: true,
      reparado: !/^\d{4}-\d\.\d{3}\.\d{3}-\d$/.test(t),
    };
  }
  if (dig.length === 16) {
    const canon = `${dig.slice(0, 4)}.${dig.slice(4, 8)}/${dig.slice(8, 15)}-${dig[15]}`;
    return { num: canon, ok: true, reparado: canon !== t };
  }
  if (/^\d{4}\.\d{4}\/\d{7}-\d{2,3}$/.test(t)) {
    // DV com 2+ dígitos = auto-incremento do Excel; corrigido depois pela família do processo
    return { num: t, ok: true, reparado: false };
  }
  if (dig.length === 17 && !pareceFisico && dig[8] === '0' && dig[9] === '0') {
    // zero a mais no sequencial (1010.2022/00022454-0 -> 1010.2022/0022454-0)
    const canon = `${dig.slice(0, 4)}.${dig.slice(4, 8)}/${dig.slice(9, 16)}-${dig[16]}`;
    return { num: canon, ok: true, reparado: true };
  }
  if (dig.length === 15 && !pareceFisico) {
    // sequencial com 6 dígitos: completa com zero à esquerda (ex.: 1010.2022/000844-1)
    const canon = `${dig.slice(0, 4)}.${dig.slice(4, 8)}/0${dig.slice(8, 14)}-${dig[14]}`;
    return { num: canon, ok: true, reparado: true };
  }
  return { num: original, ok: false, reparado: false };
}

function digitosVerificadoresCpf(d: string): boolean {
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += +d[i] * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === +d[9] && calc(10) === +d[10];
}

function digitosVerificadoresCnpj(d: string): boolean {
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < n; i++) soma += +d[i] * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

function formatarCpfCnpj(bruto: string): { texto: string; valido: boolean } {
  const d = somenteDigitos(bruto);
  if (d.length === 11)
    return {
      texto: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`,
      valido: digitosVerificadoresCpf(d),
    };
  if (d.length === 14)
    return {
      texto: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`,
      valido: digitosVerificadoresCnpj(d),
    };
  return { texto: bruto, valido: false };
}

function parseCodigo(v: unknown): { codigo?: string; obrigacao?: Tipo } {
  const t = txt(v);
  if (!t) return {};
  const up = t.toUpperCase();
  const m = up.match(/^\s*(\d{2,4})/);
  if (m && TIPO_POR_CODIGO[m[1]]) return { codigo: m[1], obrigacao: TIPO_POR_CODIGO[m[1]] };
  if (up.includes('COTA')) return { codigo: t, obrigacao: 'COTA' };
  if (up.includes('PDE')) return { codigo: t, obrigacao: 'PDE' };
  if (up.includes('AIU') || up.includes('PIU')) return { codigo: t, obrigacao: 'AIU' };
  return { codigo: t };
}

// ---------------------------------------------------------------- leitura

type Linha = unknown[]; // 1-based (índice 0 ignorado)

function lerAba(ws: ExcelJS.Worksheet): Linha[] {
  const n = ws.columnCount;
  const out: Linha[] = [[]];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const arr: unknown[] = [undefined];
    for (let c = 1; c <= n; c++) arr[c] = row.getCell(c).value;
    out.push(arr);
  }
  return out;
}

function primeira(row: Linha, cols: number[]): unknown {
  for (const c of cols) {
    const b = un(row[c]);
    if (b !== null && b !== undefined && String(b).trim() !== '') return row[c];
  }
  return undefined;
}

function brutoParaTexto(v: unknown): string | undefined {
  const b = un(v);
  if (b === null || b === undefined) return undefined;
  if (b instanceof Date) return fmtISO(b);
  const s = String(b).trim();
  return s || undefined;
}

interface PagInfo {
  kind: 'vazio' | 'data' | 'ano' | 'sim' | 'nao' | 'antecipacao' | 'pago' | 'outro';
  data?: Date;
  ano?: number;
  ajustada?: boolean;
}

function classificarPagamento(v: unknown): PagInfo {
  const b = un(v);
  if (b === null || b === undefined || String(b).trim() === '') return { kind: 'vazio' };
  if (typeof b === 'number' && b >= 1990 && b <= 2100 && Number.isInteger(b)) return { kind: 'ano', ano: b };
  if (b instanceof Date) {
    const d = parseData(b).data;
    return d ? { kind: 'data', data: d } : { kind: 'outro' };
  }
  const s = String(b).trim();
  if (/^(19|20)\d{2}$/.test(s)) return { kind: 'ano', ano: +s };
  const up = s.toUpperCase();
  if (up === 'S' || up === 'SIM') return { kind: 'sim' };
  if (up === 'N' || up === 'NAO' || up === 'NÃO') return { kind: 'nao' };
  if (up.startsWith('ANTECIP')) return { kind: 'antecipacao' };
  if (up === 'PAGO' || up === 'QUITADO') return { kind: 'pago' };
  const pd = parseData(b);
  if (pd.data) return { kind: 'data', data: pd.data, ajustada: pd.ajustada };
  return { kind: 'outro' };
}

// ---------------------------------------------------------------- parsing por aba

function parseAba(cfg: Cfg, rows: Linha[], arquivoNome: string): Rec[] {
  const recs: Rec[] = [];
  // contexto herdado entre linhas (a planilha só preenche a 1ª parcela do processo)
  let ctx: {
    processoOrig?: string;
    entrada?: Date;
    codigo?: string;
    obrigacao?: Tipo;
    protocolo?: string;
    cpf?: string;
  } = {};

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const algo = row.some((c, i) => i > 0 && un(c) !== null && un(c) !== undefined && String(un(c)).trim() !== '');
    if (!algo) continue;

    const alertas = new Set<string>();

    const procBruto = txt(primeira(row, cfg.processo));
    // célula do processo com erro de fórmula (#REF!, ...) = linha de total/lixo
    const procCelulaErro = cfg.processo.some((c) => {
      const b = un(row[c]);
      return b !== null && b !== undefined && typeof b === 'object' && !(b instanceof Date);
    });
    if (procCelulaErro && !procBruto) {
      descartadas.push({ arquivo: arquivoNome, aba: cfg.aba, linha: r, motivo: 'CELULA_PROCESSO_COM_ERRO (provável linha de total)', resumo: resumoLinha(row) });
      continue;
    }
    let vencRaw = row[cfg.venc];
    let valorRaw = row[cfg.valor];
    // vencimento e valor trocados: coluna do vencimento com nº pequeno (serial 1,2,3...) e a de valor com serial de data
    {
      const bv = un(vencRaw), bl = un(valorRaw);
      const serialPequeno = (x: unknown) => (x instanceof Date && x.getUTCFullYear() < 1990) || (typeof x === 'number' && x < 20000);
      if (serialPequeno(bv) && typeof bl === 'number' && Number.isInteger(bl) && bl >= 36526 && bl < 80000) {
        vencRaw = bl;
        valorRaw = undefined;
        alertas.add('VENCIMENTO_RECUPERADO_DA_COLUNA_VALOR');
        alertas.add('VALOR_PERDIDO_NA_PLANILHA');
      }
    }
    const parcRaw = cfg.parc ? un(row[cfg.parc]) : 1;

    // linha de cabeçalho/legenda embutida ("CONTROLE OUTORGAS", "Quitados"...)
    const vencTxt = txt(vencRaw);
    if (vencTxt && /controle|quitad|quebra|pagamento|vista/i.test(vencTxt) && !/\d/.test(vencTxt)) continue;

    const pv = parseData(vencRaw);
    const vl = parseValor(valorRaw);

    let numParcela: number | undefined;
    let parcUnica = !cfg.parc;
    if (typeof parcRaw === 'number') numParcela = Math.trunc(parcRaw);
    else {
      const s = String(parcRaw ?? '').trim();
      if (/^\d+$/.test(s)) numParcela = +s;
      else if (/^[ÚU]NICA$/i.test(s)) {
        numParcela = 1;
        parcUnica = true;
      } else if (s && /\d/.test(s)) numParcela = +(s.match(/\d+/)![0]);
      else if (s) {
        // texto livre na coluna da parcela ("int/quebra", "Outorga Recalculada")
        alertas.add(`PARCELA_TEXTO:${s.slice(0, 30)}`);
      }
    }

    const temDados = pv.data || vl.valor !== undefined || vl.suspeito || vl.textoLixo;
    if (!procBruto && !temDados) continue; // lixo sem processo/valor/vencimento
    if (numParcela === undefined && !temDados) continue;
    // linha de legenda/cabeçalho repetido (sem processo e sem parcela numerada)
    if (!procBruto && numParcela === undefined) continue;
    if (numParcela === undefined) {
      if (cfg.parc) {
        numParcela = 0; // resolvido depois (sequência por processo)
        alertas.add('PARCELA_SEM_NUMERO');
      } else numParcela = 1;
    }

    // ---- processo / contexto
    const cod = parseCodigo(primeira(row, cfg.cod));
    const prot = cfg.protocolo ? txt(primeira(row, cfg.protocolo)) : undefined;
    const ent = cfg.entrada ? parseData(row[cfg.entrada]) : {};
    const cpfBruto = cfg.cpf ? txt(row[cfg.cpf]) : undefined;

    if (procBruto && procBruto !== ctx.processoOrig) {
      ctx = {
        processoOrig: procBruto,
        entrada: ent.data,
        codigo: cod.codigo,
        obrigacao: cod.obrigacao,
        protocolo: prot,
        cpf: cpfBruto,
      };
    } else {
      if (ent.data && !ctx.entrada) ctx.entrada = ent.data;
      if (cod.obrigacao && !ctx.obrigacao) {
        ctx.obrigacao = cod.obrigacao;
        ctx.codigo = cod.codigo;
      }
      if (prot && !ctx.protocolo) ctx.protocolo = prot;
      if (cpfBruto && !ctx.cpf) ctx.cpf = cpfBruto;
    }
    if (!ctx.processoOrig) {
      // sem processo (não dá para importar) — registra se tinha cara de parcela
      if (temDados) descartadas.push({ arquivo: arquivoNome, aba: cfg.aba, linha: r, motivo: 'SEM_NUMERO_DE_PROCESSO', resumo: resumoLinha(row) });
      continue;
    }
    // O código da própria linha manda na obrigação (processo pode ter COTA e PDE nas linhas)
    const obrigacao = cod.obrigacao ?? ctx.obrigacao ?? cfg.obrigacaoPadrao;
    if (!obrigacao) alertas.add('SEM_CODIGO_OBRIGACAO');
    if (cod.codigo && !cod.obrigacao) alertas.add(`CODIGO_DESCONHECIDO:${cod.codigo.slice(0, 30)}`);

    const np = normalizarProcesso(ctx.processoOrig, cfg.formatoProcesso);
    if (!np.ok) alertas.add('PROCESSO_FORMATO_INVALIDO');
    else if (np.reparado) alertas.add('PROCESSO_REPARADO');

    if (pv.ajustada) alertas.add('VENCIMENTO_TEXTO_CORRIGIDO');
    if (vencTxt && !pv.data) alertas.add(`VENCIMENTO_ILEGIVEL:${vencTxt.slice(0, 20)}`);
    if (vl.suspeito) alertas.add('VALOR_SUSPEITO_ANO_OU_DATA');
    if (vl.textoLixo) alertas.add('VALOR_VAZIO');

    // ---- situação
    const sitRaw = primeira(row, cfg.sit);
    const sitTxt = brutoParaTexto(sitRaw);
    const sitNorm = normalizarSituacaoParcela(sitRaw);

    // ---- pagamento
    let pagInfo: PagInfo = { kind: 'vazio' };
    const pagRaws: string[] = [];
    for (const c of cfg.pagto) {
      const raw = row[c];
      const t = brutoParaTexto(raw);
      if (t) pagRaws.push(t);
      const k = classificarPagamento(raw);
      // data completa > ano > resto
      const peso = (p: PagInfo) => (p.kind === 'data' ? 3 : p.kind === 'ano' ? 2 : p.kind === 'vazio' ? 0 : 1);
      if (peso(k) > peso(pagInfo)) pagInfo = k;
    }
    // quando a situação vazou data (ex.: 7022: data de pagamento na coluna Situação)
    if (pagInfo.kind === 'vazio' || pagInfo.kind === 'outro') {
      for (const c of cfg.sit) {
        const k = classificarPagamento(row[c]);
        if (k.kind === 'data') {
          pagInfo = k;
          alertas.add('DATA_PAGTO_NA_COLUNA_SITUACAO');
        }
      }
    }
    if (pagInfo.ajustada) alertas.add('PAGAMENTO_TEXTO_CORRIGIDO');

    // ---- status bruto
    let quebra = sitNorm === 'QUEBRA';
    let quitada: boolean;
    if (sitNorm === 'QUITADO') quitada = true;
    else if (sitNorm === 'A_VENCER' || sitNorm === 'QUEBRA') quitada = false;
    else {
      // situação ilegível: decide pelas evidências de pagamento/nome da aba
      alertas.add('SITUACAO_INDEFINIDA');
      if (pagInfo.kind === 'data' || pagInfo.kind === 'sim' || pagInfo.kind === 'pago' || pagInfo.kind === 'antecipacao')
        quitada = true;
      else if (pagInfo.kind === 'nao') quitada = false;
      else quitada = cfg.statusSheet === 'QUITADO';
    }
    if (!quebra && cfg.statusSheet === 'QUEBRA' && !quitada) quebra = true;
    if (sitNorm === 'QUEBRA' && (pagInfo.kind === 'data' || pagInfo.kind === 'sim'))
      alertas.add('QUEBRA_COM_PAGAMENTO_INFORMADO');
    // Aba "Quitado" sem situação e sem nenhum pagamento + vencimento futuro = parcela a vencer repetida
    if (
      quitada &&
      sitNorm === 'INDEFINIDO' &&
      pagInfo.kind === 'vazio' &&
      pv.data &&
      pv.data.getTime() > HOJE.getTime()
    ) {
      quitada = false;
      alertas.add('QUITADA_SEM_EVIDENCIA_VENC_FUTURO');
    }
    if (quitada && pagInfo.kind === 'nao') alertas.add('SITUACAO_PAGA_MAS_PAGTO_N');

    recs.push({
      sistema:
        cfg.sistema === 'APROVA_DIGITAL' && /^\s*SLC/i.test(ctx.protocolo ?? '') ? 'SLCE' : cfg.sistema,
      arquivo: arquivoNome,
      aba: cfg.aba,
      linha: r,
      statusSheet: cfg.statusSheet,
      num_processo: np.num,
      num_processo_original: ctx.processoOrig,
      codigo: cod.codigo ?? ctx.codigo,
      obrigacao,
      protocolo: ctx.protocolo?.replace(/\s+/g, ' ').trim(),
      data_entrada: ctx.entrada,
      cpf_cnpj: ctx.cpf,
      num_parcela: numParcela,
      parcela_unica: parcUnica,
      vencimento: pv.data,
      valor: vl.valor,
      situacao_original: sitTxt,
      pagamento_original: pagRaws.join(' | ') || undefined,
      quitada,
      quebra,
      data_pagamento: undefined,
      data_pagamento_origem: '',
      antecipada: false,
      alertas,
      revisar: false,
      // guardamos a evidência para o passo de resolução de datas
      ...({ _pag: pagInfo } as object),
    } as Rec);
  }
  return recs;
}

// ---------------------------------------------------------------- resolução de datas de pagamento

type RecComPag = Rec & { _pag: PagInfo };

/** Limites para considerar uma data de pagamento "estranha" em relação ao vencimento. */
const LIM_ATRASO_DIAS = 400; // pago > 400 dias depois do vencimento
const LIM_ANTECIPA_DIAS = 400; // pago > 400 dias antes (pagamento total antecipado existe, mas é raro)

interface CtxPag {
  /** data ISO -> nº de parcelas do processo+obrigação pagas nessa data (>=2 = pagamento em lote) */
  lote: Map<string, number>;
  /** mediana (dias) de pagamento - vencimento das parcelas "normais" do grupo */
  lagMed: number;
  anoProc?: number;
}

function resolverPagamento(rec: RecComPag, ctx: CtxPag): void {
  const { _pag: pag } = rec;
  const venc = rec.vencimento;
  const a = rec.alertas;

  if (rec.quebra && !rec.quitada) {
    rec.data_pagamento_origem = 'NAO_PAGA';
    return;
  }
  if (!rec.quitada) {
    // Informaram uma data mesmo sem estar paga? só avisa.
    if (pag.kind === 'data') a.add('DATA_PAGTO_EM_PARCELA_NAO_PAGA');
    rec.data_pagamento_origem = 'NAO_PAGA';
    return;
  }

  const usaVenc = (origem: string) => {
    if (venc && venc.getTime() <= HOJE.getTime()) {
      rec.data_pagamento = venc;
      rec.data_pagamento_origem = origem;
    } else if (venc) {
      // paga com vencimento futuro e sem data real: não inventar data futura
      rec.data_pagamento = undefined;
      rec.data_pagamento_origem = 'SEM_DATA_VENC_FUTURO';
      a.add('PAGA_SEM_DATA_VENCIMENTO_FUTURO');
      rec.revisar = true;
    } else {
      rec.data_pagamento_origem = 'SEM_DATA_SEM_VENCIMENTO';
      a.add('PAGA_SEM_DATA_E_SEM_VENCIMENTO');
      rec.revisar = true;
    }
  };

  switch (pag.kind) {
    case 'ano': {
      // Regra do usuário: só o ano => mesma data do vencimento.
      rec.ano_informado = pag.ano;
      usaVenc('ANO_APENAS->VENCIMENTO');
      if (venc && pag.ano !== venc.getUTCFullYear()) {
        a.add(`ANO_PAGTO_DIFERE_VENC:${pag.ano}`);
        if (pag.ano! < venc.getUTCFullYear()) {
          rec.antecipada = true; // pago em ano anterior ao do vencimento
          a.add('ANTECIPADA_PELO_ANO');
        } else {
          rec.revisar = true; // pago em ano posterior ao do vencimento
          a.add('ANO_PAGTO_POSTERIOR_AO_VENC');
        }
      }
      return;
    }
    case 'sim':
    case 'pago':
    case 'vazio':
    case 'nao':
    case 'outro':
      usaVenc('SEM_DATA->VENCIMENTO');
      return;
    case 'antecipacao':
      usaVenc('ANTECIPACAO_SEM_DATA->VENCIMENTO');
      rec.antecipada = true;
      a.add('ANTECIPACAO_SEM_DATA_REAL');
      return;
    case 'data': {
      let d = pag.data!;
      let origem = 'DATA_INFORMADA';
      if (!anoValido(d.getUTCFullYear())) {
        a.add('DATA_PAGTO_ANO_INVALIDO');
        usaVenc('DATA_INVALIDA->VENCIMENTO');
        rec.revisar = true;
        return;
      }
      // Mesma data em várias parcelas do processo = pagamento em lote (quitação de saldo,
      // regularização): legítimo mesmo longe do vencimento.
      const emLote = (ctx.lote.get(fmtISO(d)) ?? 0) >= 2;
      if (emLote) a.add('PAGTO_EM_LOTE');
      const antesDoProcesso = ctx.anoProc !== undefined && d.getUTCFullYear() < ctx.anoProc;
      if (venc) {
        const dif = diasEntre(d, venc); // >0 = pago depois do vencimento
        const estranha = antesDoProcesso || (!emLote && (dif > LIM_ATRASO_DIAS || dif < -LIM_ANTECIPA_DIAS));
        if (estranha) {
          // referência: vencimento + atraso/antecipação típico das outras parcelas do processo
          const esperada = new Date(venc.getTime() + ctx.lagMed * DIA);
          const cands: { d: Date; motivo: string }[] = [];
          const dia = d.getUTCDate();
          const mes = d.getUTCMonth() + 1;
          if (dia <= 12) cands.push({ d: utc(d.getUTCFullYear(), dia, mes), motivo: 'DIA_MES_INVERTIDO' });
          for (const ay of [esperada.getUTCFullYear(), esperada.getUTCFullYear() - 1, esperada.getUTCFullYear() + 1]) {
            const ultimo = new Date(Date.UTC(ay, d.getUTCMonth() + 1, 0)).getUTCDate();
            cands.push({ d: utc(ay, d.getUTCMonth() + 1, Math.min(dia, ultimo)), motivo: 'ANO_CORRIGIDO' });
          }
          const melhor = cands
            .map((c) => ({ ...c, dist: Math.abs(diasEntre(c.d, esperada)) }))
            .filter((c) => c.dist <= (antesDoProcesso ? 150 : 45) && (ctx.anoProc === undefined || c.d.getUTCFullYear() >= ctx.anoProc))
            .sort((x, y) => x.dist - y.dist)[0];
          a.add(`DATA_PAGTO_DISTANTE_DO_VENC:${dif}d`);
          if (melhor) {
            a.add(`DATA_PAGTO_CORRIGIDA:${melhor.motivo}:${fmtISO(d)}`);
            d = melhor.d;
            origem = `DATA_CORRIGIDA(${melhor.motivo})`;
            rec.revisar = true;
          } else {
            // sem correção plausível: usa o vencimento (evita jogar a arrecadação no mês errado)
            a.add(`DATA_PAGTO_DESCARTADA:${fmtISO(d)}`);
            rec.revisar = true;
            usaVenc('DATA_IMPLAUSIVEL->VENCIMENTO');
            return;
          }
        }
      }
      if (d.getTime() > HOJE.getTime()) {
        a.add(`DATA_PAGTO_FUTURA:${fmtISO(d)}`);
        if (venc && venc.getTime() <= HOJE.getTime()) {
          rec.data_pagamento = venc;
          rec.data_pagamento_origem = 'PAGTO_FUTURO->VENCIMENTO';
          return;
        }
        // ainda não venceu: data futura não é pagamento efetivo => a vencer
        rec.quitada = false;
        rec.data_pagamento = undefined;
        rec.data_pagamento_origem = 'PAGTO_FUTURO->A_VENCER';
        rec.revisar = true;
        return;
      }
      rec.data_pagamento = d;
      rec.data_pagamento_origem = origem;
      return;
    }
  }
}

// ---------------------------------------------------------------- consolidação

function qualidade(r: Rec): number {
  let s = 0;
  if (r.situacao_original && !r.alertas.has('SITUACAO_INDEFINIDA')) s += 10;
  if (r.data_pagamento_origem.startsWith('DATA_')) s += 8;
  if (r.data_pagamento_origem.startsWith('ANO_APENAS')) s += 2;
  if (!r.quitada && !r.quebra) s += 3; // aba "em pagamento" é a mais atual
  if (r.vencimento) s += 2;
  if (r.valor !== undefined) s += 1;
  return s;
}

function chaveParcela(r: Rec) {
  return `${r.num_processo}|${r.obrigacao ?? '?'}|${r.num_parcela}`;
}

function mediana(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
}

// ---------------------------------------------------------------- reparos por grupo

/** Família do processo = mesmo número sem o DV. O Excel auto-incrementa o DV ao arrastar a célula. */
function corrigirFamiliasDv(recs: Rec[]) {
  const fam = new Map<string, Map<string, number>>();
  for (const r of recs) {
    const m = r.num_processo.match(/^(.*)-(\d+)$/);
    if (!m) continue;
    const f = fam.get(m[1]) ?? fam.set(m[1], new Map()).get(m[1])!;
    f.set(m[2], (f.get(m[2]) ?? 0) + 1);
  }
  const canon = new Map<string, string>();
  for (const [root, dvs] of fam) {
    if (dvs.size < 2) continue;
    const nums = [...dvs.keys()].map(Number).sort((a, b) => a - b);
    const consecutivo = nums.length >= 3 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
    let escolhido = '';
    if (consecutivo) escolhido = String(nums[0]);
    else {
      const ord = [...dvs.entries()].sort((a, b) => b[1] - a[1]);
      if (ord[0][1] > ord[1][1]) escolhido = ord[0][0];
    }
    canon.set(root, escolhido);
  }
  for (const r of recs) {
    const m = r.num_processo.match(/^(.*)-(\d+)$/);
    if (!m || !canon.has(m[1])) continue;
    const esc = canon.get(m[1])!;
    if (!esc) {
      r.alertas.add('PROCESSO_DV_DIVERGENTE');
      r.revisar = true;
      continue;
    }
    if (m[2] !== esc) {
      r.alertas.add(`PROCESSO_DV_CORRIGIDO(${r.num_processo})`);
      r.num_processo = `${m[1]}-${esc}`;
    }
    if (esc.length > 1) {
      r.alertas.add('PROCESSO_DV_INVALIDO');
      r.revisar = true;
    }
  }
}

/** Linhas de total coladas no fim do bloco do processo (soma das parcelas / valor gigante). */
function detectarTotais(g: RecComPag[], out: Set<RecComPag>) {
  if (g.length < 4) return;
  for (const r of g) {
    if (r.valor === undefined) continue;
    const outros = g.filter((x) => x !== r && x.valor !== undefined && !out.has(x));
    if (outros.length < 3) continue;
    const soma = outros.reduce((acc, x) => acc + x.valor!, 0);
    const max = Math.max(...outros.map((x) => x.valor!));
    const maxNum = Math.max(...outros.map((x) => x.num_parcela));
    const ehSoma = Math.abs(r.valor - soma) <= 0.01 * soma;
    const ehGigante = r.valor >= 5 * max && r.num_parcela > maxNum;
    if (ehSoma || ehGigante) {
      out.add(r);
      descartadas.push({
        arquivo: r.arquivo,
        aba: r.aba,
        linha: r.linha,
        motivo: `LINHA_DE_TOTAL (${ehSoma ? 'valor = soma das parcelas' : 'valor muito acima das parcelas'})`,
        resumo: `${r.num_processo_original} | parcela ${r.num_parcela} | valor ${r.valor}`,
      });
    }
  }
}


/** Vencimentos "arrastados": +1 ano por parcela (mesmo dia/mês) ou a mesma data copiada para baixo. */
function repararVencimentosArrastados(g: RecComPag[]) {
  const ord = g.filter((x) => x.vencimento && x.num_parcela > 0).sort((a, b) => a.num_parcela - b.num_parcela);
  const mIdx = (r: Rec) => r.vencimento!.getUTCFullYear() * 12 + r.vencimento!.getUTCMonth();
  // (1) +12 meses a cada parcela
  let i = 0;
  while (i < ord.length) {
    let j = i;
    while (j + 1 < ord.length && ord[j + 1].num_parcela === ord[j].num_parcela + 1 && mIdx(ord[j + 1]) - mIdx(ord[j]) === 12) j++;
    if (j - i + 1 >= 3) {
      const base = ord[i].vencimento!;
      for (let k = i + 1; k <= j; k++) {
        ord[k].alertas.add(`VENCIMENTO_ARRASTADO_POR_ANO(era ${fmtISO(ord[k].vencimento)})`);
        ord[k].vencimento = addMeses(base, ord[k].num_parcela - ord[i].num_parcela);
        ord[k].revisar = true;
      }
    }
    i = j + 1;
  }
  // (2) mesma data copiada em parcelas consecutivas
  i = 0;
  while (i < ord.length) {
    let j = i;
    while (
      j + 1 < ord.length &&
      ord[j + 1].num_parcela === ord[j].num_parcela + 1 &&
      ord[j + 1].vencimento!.getTime() === ord[j].vencimento!.getTime()
    )
      j++;
    if (j > i) {
      const base = ord[i].vencimento!;
      for (let k = i + 1; k <= j; k++) {
        ord[k].alertas.add(`VENCIMENTO_REPETIDO_CORRIGIDO(era ${fmtISO(ord[k].vencimento)})`);
        ord[k].vencimento = addMeses(base, ord[k].num_parcela - ord[i].num_parcela);
        ord[k].revisar = true;
      }
    }
    i = j + 1;
  }
}

/** Vencimento com ano digitado errado (ex.: 2010 em vez de 2022): alinha à série mensal do processo. */
function repararVencimentosPorSerie(g: RecComPag[]) {
  const com = g.filter((x) => x.vencimento && x.num_parcela > 0);
  if (com.length < 3) return;
  const idx = (r: Rec) => r.vencimento!.getUTCFullYear() * 12 + r.vencimento!.getUTCMonth() - r.num_parcela;
  const cont = new Map<number, number>();
  for (const r of com) cont.set(idx(r), (cont.get(idx(r)) ?? 0) + 1);
  const [modo, n] = [...cont.entries()].sort((a, b) => b[1] - a[1])[0];
  if (n / com.length < 0.5) return;
  for (const r of com) {
    const off = idx(r) - modo;
    if (off === 0) continue;
    if (off % 12 === 0) {
      r.alertas.add(`VENCIMENTO_CORRIGIDO_PELA_SERIE(${fmtISO(r.vencimento)})`);
      r.vencimento = addMeses(r.vencimento!, -off);
      r.revisar = true;
    } else {
      r.alertas.add(`VENCIMENTO_FORA_DA_SERIE(${off > 0 ? '+' : ''}${off}m)`);
    }
  }
}

function anoDoProcesso(num: string): number | undefined {
  const m = num.match(/^\d{4}\.(\d{4})\//) ?? num.match(/^(\d{4})-\d\./);
  return m ? +m[1] : undefined;
}


/** Série inteira de vencimentos com ano errado (ex.: 2010-10-30... em processo de 2019): desloca pelos pagamentos. */
function repararSerieInteiraDeVencimento(g: RecComPag[]) {
  const com = g.filter((x) => x.vencimento);
  if (com.length < 2) return;
  const anoProc = anoDoProcesso(g[0].num_processo);
  if (anoProc === undefined) return;
  const antes = com.filter((x) => x.vencimento!.getUTCFullYear() < anoProc).length;
  if (antes / com.length < 0.5) return;
  const pagos = com.filter((x) => x._pag.kind === 'data' && x._pag.data);
  let melhorK: number | undefined;
  if (pagos.length) {
    let melhor = Infinity;
    for (let k = 1; k <= 30; k++) {
      const difs = pagos
        .map((x) => Math.abs(diasEntre(x._pag.data!, addMeses(x.vencimento!, 12 * k))))
        .sort((a, b) => a - b);
      const med = difs[Math.floor(difs.length / 2)];
      if (med < melhor) {
        melhor = med;
        melhorK = k;
      }
    }
    if (melhor > 60) melhorK = undefined;
  }
  for (const r of com) {
    if (r.vencimento!.getUTCFullYear() >= anoProc) continue;
    if (melhorK) {
      r.alertas.add(`VENCIMENTO_CORRIGIDO_ANO(+${melhorK}a;era ${fmtISO(r.vencimento)})`);
      r.vencimento = addMeses(r.vencimento!, 12 * melhorK);
    } else r.alertas.add('VENCIMENTO_ANTERIOR_AO_PROCESSO');
    r.revisar = true;
  }
}

/** Datas de pagamento que avançam 1 dia por parcela = autopreenchimento do Excel; vale a 1ª data. */
function repararDatasArrastadas(g: RecComPag[]) {
  const ord = g
    .filter((x) => x._pag.kind === 'data' && x._pag.data)
    .sort((a, b) => a.num_parcela - b.num_parcela);
  let i = 0;
  while (i < ord.length) {
    let j = i;
    while (
      j + 1 < ord.length &&
      ord[j + 1].num_parcela === ord[j].num_parcela + 1 &&
      diasEntre(ord[j + 1]._pag.data!, ord[j]._pag.data!) === 1 &&
      ord[j + 1].vencimento && ord[j].vencimento &&
      diasEntre(ord[j + 1].vencimento!, ord[j].vencimento!) >= 20
    )
      j++;
    if (j - i + 1 >= 3) {
      const primeira = ord[i]._pag.data!;
      for (let k = i + 1; k <= j; k++) {
        ord[k].alertas.add(`DATA_PAGTO_ARRASTADA_NO_EXCEL(era ${fmtISO(ord[k]._pag.data)})`);
        ord[k]._pag = { kind: 'data', data: primeira };
        ord[k].revisar = true;
      }
      ord[i].alertas.add('DATA_PAGTO_ARRASTADA_NO_EXCEL(1a data mantida)');
    }
    i = j + 1;
  }
}

function resolverGrupoPagamento(g: RecComPag[]) {
  const lote = new Map<string, number>();
  for (const r of g) {
    if (r._pag.kind === 'data' && r._pag.data) {
      const k = fmtISO(r._pag.data);
      lote.set(k, (lote.get(k) ?? 0) + 1);
    }
  }
  const lags: number[] = [];
  for (const r of g) {
    if (r._pag.kind === 'data' && r._pag.data && r.vencimento) {
      const dif = diasEntre(r._pag.data, r.vencimento);
      if (Math.abs(dif) <= LIM_ATRASO_DIAS && (lote.get(fmtISO(r._pag.data)) ?? 0) < 2) lags.push(dif);
    }
  }
  const lagMed = Math.max(-60, Math.min(120, mediana(lags) ?? 0));
  for (const r of g) resolverPagamento(r, { lote, lagMed, anoProc: anoDoProcesso(r.num_processo) });
}

/**
 * Planilha do Portal (UL0113_ProcessosComOutorgaOnerosa): UMA linha por processo, sem parcelas.
 * Traz nº total de parcelas, valor devido/pago e a guia (DAMSP) mais recente. As parcelas são deduzidas:
 *  - parcelas pagas k = round(pago / (devido / N)); as anteriores à guia informada foram pagas no vencimento;
 *  - Paga: a guia informada é a última parcela (k = N), com a data de pagamento da guia;
 *  - Pendente/Enviado CDM: a data de vencimento é da PRÓXIMA parcela (k+1) e o pagamento é o da parcela k
 *    (a diferença venc-pgto fica em ~1 mês, enquanto nas pagas é de poucos dias);
 *  - as parcelas depois de k seguem mês a mês e ficam a vencer/vencidas (ou QUEBRA se "Enviado CDM").
 */
interface PortalStats {
  linhas: number;
  processos: number;
  comParcelas: number;
  geradas: number;
  jaNasPlanilhas: number;
  semDados: { processo: string; situacao: string; motivo: string }[];
}

async function carregarPortalArquivo(
  caminho: string,
  jaExistentes: Set<string>,
): Promise<{ recs: Rec[]; stats: PortalStats }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(caminho);
  const ws = wb.worksheets[0];
  const nome = path.basename(caminho);
  const val = (r: number, c: number) => un(ws.getRow(r).getCell(c).value);
  const num = (v: unknown) => {
    if (typeof v === 'number') return v;
    const t = txt(v);
    return t ? parseValor(t).valor : undefined;
  };

  type L = {
    linha: number; proc: string; protocolo?: string; entrada?: Date; situacao?: string;
    dev?: number; pago?: number; venc?: Date; pg?: Date; n?: number;
  };
  const porProc = new Map<string, L[]>();
  for (let r = 2; r <= ws.rowCount; r++) {
    const procBruto = txt(val(r, 2));
    if (!procBruto) continue;
    const np = normalizarProcesso(procBruto);
    const l: L = {
      linha: r,
      proc: np.num,
      protocolo: txt(val(r, 1)),
      entrada: parseData(val(r, 4)).data,
      situacao: txt(val(r, 11)),
      dev: num(val(r, 12)),
      pago: num(val(r, 13)),
      venc: parseData(val(r, 15)).data,
      pg: parseData(val(r, 16)).data,
      n: num(val(r, 17)),
    };
    (porProc.get(l.proc) ?? porProc.set(l.proc, []).get(l.proc)!).push(l);
  }

  const stats: PortalStats = { linhas: ws.rowCount - 1, processos: porProc.size, comParcelas: 0, geradas: 0, jaNasPlanilhas: 0, semDados: [] };
  const recs: Rec[] = [];

  for (const [proc, ls] of porProc) {
    // linha com dados de pagamento (o processo repete por tarefa/situação do assunto)
    const l = ls.find((x) => x.situacao && x.n) ?? ls[0];
    if (!l.situacao || !l.n || !l.dev) {
      stats.semDados.push({ processo: proc, situacao: l.situacao ?? '(sem guia/pagamento)', motivo: 'sem parcelamento no Portal' });
      continue;
    }
    if (jaExistentes.has(proc)) {
      stats.jaNasPlanilhas++;
      continue;
    }
    const N = Math.trunc(l.n);
    const sit = l.situacao.toUpperCase();
    const parcela = l.dev / N;
    const pago = l.pago ?? 0;
    const alertasBase: string[] = ['OBRIGACAO_ASSUMIDA_PDE_PORTAL', 'PARCELAS_DEDUZIDAS_DO_PORTAL', 'SEM_CPF_CNPJ_NO_PORTAL'];
    let k = Math.round(pago / parcela);
    if (Math.abs(pago / parcela - k) > 0.05) alertasBase.push('PAGO_NAO_MULTIPLO_DA_PARCELA');
    if (k > N) {
      alertasBase.push(`PAGO_MAIOR_QUE_DEVIDO(${pago}/${l.dev})`);
      k = N;
    }
    const cancelada = sit.startsWith('CANCEL');
    if (cancelada || !l.venc) {
      stats.semDados.push({ processo: proc, situacao: l.situacao, motivo: cancelada ? 'guia cancelada, sem vencimentos' : 'sem vencimento da guia' });
      continue;
    }
    const fechada = sit.startsWith('PAGA') && k >= N;
    // âncora: vencimento informado = parcela k (quitado) ou k+1 (pendente / CDM)
    const ancora = fechada ? N : k + 1;
    const cdm = sit.includes('CDM');
    for (let j = 1; j <= N; j++) {
      const venc = addMeses(l.venc, j - ancora);
      const al = new Set<string>(alertasBase);
      let quitada = j <= k;
      let dataPg: Date | undefined;
      let origem = 'NAO_PAGA';
      let quebra = false;
      if (quitada) {
        if (j === k && l.pg) {
          dataPg = l.pg;
          origem = 'DATA_INFORMADA';
        } else {
          dataPg = venc <= HOJE ? venc : undefined;
          origem = dataPg ? 'DEDUZIDA_PAGA_NO_VENCIMENTO' : 'DEDUZIDA_SEM_DATA';
          if (!dataPg) al.add('PAGA_SEM_DATA_VENCIMENTO_FUTURO');
        }
        al.add(j === k && l.pg ? 'PARCELA_DA_GUIA_INFORMADA' : 'PARCELA_DEDUZIDA_PAGA');
      } else if (cdm) {
        quebra = true;
        al.add('ENVIADO_CDM_PARCELAS_RESTANTES_COMO_QUEBRA');
      } else al.add('PARCELA_DEDUZIDA_A_PAGAR');
      const valor = j < N ? Math.round(parcela * 100) / 100 : Math.round((l.dev - Math.round(parcela * 100) / 100 * (N - 1)) * 100) / 100;
      recs.push({
        sistema: 'PORTAL',
        arquivo: nome,
        aba: ws.name,
        linha: l.linha,
        statusSheet: quitada ? 'QUITADO' : quebra ? 'QUEBRA' : 'EM_PAGAMENTO',
        num_processo: proc,
        num_processo_original: proc,
        obrigacao: 'PDE',
        protocolo: l.protocolo,
        data_entrada: l.entrada,
        num_parcela: j,
        parcela_unica: N === 1,
        vencimento: venc,
        valor,
        situacao_original: `${l.situacao} (k=${k}/${N})`,
        pagamento_original: l.pg ? fmtISO(l.pg) : undefined,
        quitada,
        quebra,
        data_pagamento: dataPg,
        data_pagamento_origem: origem,
        antecipada: false,
        alertas: al,
        revisar: al.has('PAGO_NAO_MULTIPLO_DA_PARCELA') || [...al].some((a) => a.startsWith('PAGO_MAIOR')) || cdm || al.has('PAGA_SEM_DATA_VENCIMENTO_FUTURO'),
      } as Rec);
    }
    stats.comParcelas++;
    stats.geradas += N;
  }
  return { recs, stats };
}

async function carregarPortal(prisma: PrismaClient): Promise<Rec[]> {
  const parcelas = await prisma.parcela.findMany({
    where: { processo: { origem: 'PORTAL' } },
    include: { processo: true },
    orderBy: [{ processo_id: 'asc' }, { num_parcela: 'asc' }],
  });
  return parcelas.map((p) => {
    const quebra = p.quebra;
    const dp = p.data_quitacao ?? undefined;
    return {
      sistema: 'PORTAL',
      arquivo: 'BANCO (origem=PORTAL)',
      aba: 'parcelas',
      linha: 0,
      statusSheet: quebra ? 'QUEBRA' : p.status_quitacao ? 'QUITADO' : 'EM_PAGAMENTO',
      num_processo: p.processo.num_processo,
      num_processo_original: p.processo.num_processo,
      codigo: p.processo.codigo ?? undefined,
      obrigacao: p.obrigacao ?? p.processo.tipo ?? undefined,
      protocolo: p.processo.protocolo_ad ?? undefined,
      data_entrada: p.processo.data_entrada ?? undefined,
      cpf_cnpj: p.cpf_cnpj ?? p.processo.cnpj ?? undefined,
      num_parcela: p.num_parcela,
      parcela_unica: false,
      vencimento: p.vencimento,
      valor: p.valor,
      situacao_original: quebra ? 'Quebra' : p.status_quitacao ? 'Pago' : 'A Vencer',
      pagamento_original: p.data_quitacao ? fmtISO(p.data_quitacao) : undefined,
      quitada: p.status_quitacao,
      quebra,
      data_pagamento: dp,
      data_pagamento_origem: dp ? 'DATA_INFORMADA' : p.status_quitacao ? 'SEM_DATA' : 'NAO_PAGA',
      antecipada: p.antecipada,
      dias_antecipacao: p.dias_antecipacao ?? undefined,
      alertas: new Set<string>(),
      revisar: false,
      doBanco: true,
    } as Rec;
  });
}

// ---------------------------------------------------------------- principal

async function main() {
  const [, , adArg, fisArg, outArg, portalArg] = process.argv;
  const home = os.homedir();
  const adPath = adArg ?? path.join(home, 'Downloads', 'PLANILHA OUTORGA - APROVA DIGITAL.xlsm');
  const fisPath = fisArg ?? path.join(home, 'Downloads', 'Planilha de Outorga - FISICOS  e SEI2.xlsx');
  const outPath = outArg ?? path.join(home, 'Downloads', 'OUTORGA - PARCELAS CONSOLIDADAS.xlsx');

  const portalPath = portalArg ?? path.join(home, 'Downloads', 'UL0113_ProcessosComOutorgaOnerosa.xlsx');
  let todos: RecComPag[] = [];
  const cont: Record<string, number> = {};

  for (const [arquivo, caminho] of [
    ['AD', adPath],
    ['FIS', fisPath],
  ] as const) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(caminho);
    const nomeArq = path.basename(caminho);
    const verificar = new Map<string, string>(); // protocolo AD -> informação da aba "Verificar manualmente"
    if (arquivo === 'AD') {
      const wsv = wb.worksheets.find((w) => /verificar/i.test(w.name));
      if (wsv) {
        for (let r = 2; r <= wsv.rowCount; r++) {
          const prot = txt(wsv.getRow(r).getCell(1).value);
          const info = txt(wsv.getRow(r).getCell(2).value);
          if (prot && info) verificar.set(prot.replace(/^#/, ''), (verificar.get(prot.replace(/^#/, '')) ?? '') + (verificar.has(prot.replace(/^#/, '')) ? ' / ' : '') + info);
        }
      }
    }
    const abasLidas = new Set<string>();
    for (const cfg of CFGS.filter((c) => c.arquivo === arquivo)) {
      const ws = wb.worksheets.find((w) => w.name.trim() === cfg.aba.trim());
      if (!ws) {
        console.warn(`! aba não encontrada: ${cfg.aba}`);
        continue;
      }
      abasLidas.add(ws.name);
      const recs = parseAba(cfg, lerAba(ws), nomeArq) as RecComPag[];
      for (const r of recs) {
        if (r.protocolo) {
          const info = verificar.get(r.protocolo.replace(/^#|^AD:?\s*/i, '').replace(/-SP-.*$/i, ''));
          if (info) {
            r.alertas.add(`VERIFICAR_MANUALMENTE:${info.slice(0, 80)}`);
            r.revisar = true;
          }
        }
      }
      cont[`${arquivo}/${cfg.aba}`] = recs.length;
      todos.push(...recs);
    }
    const ignoradas = wb.worksheets.filter((w) => !abasLidas.has(w.name)).map((w) => w.name);
    console.log(`${nomeArq}: abas ignoradas (sem parcelas): ${ignoradas.join(', ') || '-'}`);
  }

  // ---- Portal (banco)
  const prisma = new PrismaClient();
  let portal: Rec[] = [];
  try {
    portal = await carregarPortal(prisma);
  } catch (e) {
    console.warn('! não foi possível ler parcelas do Portal no banco:', (e as Error).message.slice(0, 200));
  } finally {
    await prisma.$disconnect();
  }
  console.log(`Parcelas do Portal no banco: ${portal.length}`);

  // ---- Portal (planilha UL0113): parcelas deduzidas
  let portalStats: PortalStats | undefined;
  if (fs.existsSync(portalPath)) {
    const existentes = new Set([...todos, ...portal].map((r) => r.num_processo));
    const res = await carregarPortalArquivo(portalPath, existentes);
    portalStats = res.stats;
    portal = [...portal, ...res.recs];
    for (const sd of res.stats.semDados)
      descartadas.push({ arquivo: path.basename(portalPath), aba: 'Planilha1', linha: 0, motivo: `PORTAL: ${sd.motivo}`, resumo: `${sd.processo} | ${sd.situacao}` });
    console.log(`Portal: ${res.stats.processos} processos, ${res.stats.comParcelas} com parcelas deduzidas (${res.stats.geradas} parcelas), ${res.stats.jaNasPlanilhas} já nas outras planilhas, ${res.stats.semDados.length} sem dados`);
  } else console.warn('! planilha do Portal não encontrada:', portalPath);

  // ---- 1) DV auto-incrementado: unifica a família do processo
  corrigirFamiliasDv(todos);

  // ---- 2) numeração de parcelas ausentes (sequência por processo+obrigação)
  const grupoAntes = new Map<string, RecComPag[]>();
  for (const r of todos) {
    const k = `${r.aba}|${r.num_processo}|${r.obrigacao ?? '?'}`;
    (grupoAntes.get(k) ?? grupoAntes.set(k, []).get(k)!).push(r);
  }
  for (const g of grupoAntes.values()) {
    const usados = new Set(g.filter((x) => x.num_parcela > 0).map((x) => x.num_parcela));
    let prox = 1;
    for (const r of g) {
      if (r.num_parcela === 0) {
        while (usados.has(prox)) prox++;
        r.num_parcela = prox;
        usados.add(prox);
      }
    }
  }

  // ---- 3) por grupo (aba+processo+obrigação): linhas de total, vencimento fora da série, pagamento
  const gruposAba = new Map<string, RecComPag[]>();
  for (const r of todos) {
    const k = `${r.aba}|${r.num_processo}|${r.obrigacao ?? '?'}`;
    (gruposAba.get(k) ?? gruposAba.set(k, []).get(k)!).push(r);
  }
  const descartar = new Set<RecComPag>();
  for (const g of gruposAba.values()) {
    detectarTotais(g, descartar);
    const validos = g.filter((x) => !descartar.has(x));
    repararVencimentosArrastados(validos);
    repararVencimentosPorSerie(validos);
    repararSerieInteiraDeVencimento(validos);
    repararDatasArrastadas(validos);
    resolverGrupoPagamento(validos);
  }
  todos = todos.filter((r) => !descartar.has(r));

  // ---- DPCI (pagamento à vista/quitação de saldo) de processo que também tem parcelamento DPD:
  // não é a "parcela 1" do parcelamento — é um pagamento à parte. Numera depois da última parcela.
  {
    const porProcObrig = new Map<string, RecComPag[]>();
    for (const r of todos) {
      const k = `${r.num_processo}|${r.obrigacao ?? '?'}`;
      (porProcObrig.get(k) ?? porProcObrig.set(k, []).get(k)!).push(r);
    }
    for (const g of porProcObrig.values()) {
      const dpci = g.filter((x) => /DPCI/.test(x.aba));
      const parcelado = g.filter((x) => !/DPCI/.test(x.aba));
      if (!dpci.length || new Set(parcelado.map((x) => x.num_parcela)).size < 2) continue;
      let prox = Math.max(...parcelado.map((x) => x.num_parcela)) + 1;
      for (const r of dpci) {
        r.num_parcela = prox++;
        r.parcela_unica = false;
        r.alertas.add('PAGAMENTO_A_VISTA_DPCI_COMPLEMENTA_PARCELAMENTO');
        r.revisar = true;
      }
    }
  }

  // ---- deduplicação por (processo, obrigação, parcela)
  const porChave = new Map<string, Rec[]>();
  for (const r of [...todos, ...portal]) {
    const k = chaveParcela(r);
    (porChave.get(k) ?? porChave.set(k, []).get(k)!).push(r);
  }
  let duplicadas = 0;
  let conflitoSistema = 0;
  const finais: Rec[] = [];
  for (const [k, lista] of porChave) {
    if (lista.length === 1) {
      finais.push(lista[0]);
      continue;
    }
    duplicadas += lista.length - 1;
    const ord = [...lista].sort((a, b) => qualidade(b) - qualidade(a));
    const venc = ord[0];
    const outras = ord.slice(1);
    venc.alertas.add(
      `DUPLICADA_EM:${outras.map((o) => `${o.aba}#${o.linha}`).join(';')}`,
    );
    if (outras.some((o) => o.sistema !== venc.sistema)) {
      conflitoSistema++;
      venc.alertas.add('DUPLICADA_ENTRE_SISTEMAS');
      venc.revisar = true;
    }
    // divergência real de status/valor/vencimento entre as cópias
    if (outras.some((o) => o.quitada !== venc.quitada || o.quebra !== venc.quebra))
      venc.alertas.add('DUPLICADA_COM_STATUS_DIVERGENTE');
    if (outras.some((o) => o.valor !== undefined && venc.valor !== undefined && Math.abs(o.valor - venc.valor) > 0.01))
      venc.alertas.add('DUPLICADA_COM_VALOR_DIVERGENTE');
    // completa campos que só a cópia descartada tem
    for (const o of outras) {
      venc.vencimento ??= o.vencimento;
      venc.valor ??= o.valor;
      venc.cpf_cnpj ??= o.cpf_cnpj;
      venc.protocolo ??= o.protocolo;
      venc.data_entrada ??= o.data_entrada;
    }
    void k;
    finais.push(venc);
  }

  // ---- por processo+obrigação: valor/vencimento faltantes, consistência
  const grupos = new Map<string, Rec[]>();
  for (const r of finais) {
    const k = `${r.num_processo}|${r.obrigacao ?? '?'}`;
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(r);
  }
  for (const g of grupos.values()) {
    g.sort((a, b) => a.num_parcela - b.num_parcela);
    const valoresOk = g.filter((x) => x.valor !== undefined && !x.alertas.has('VALOR_SUSPEITO_ANO_OU_DATA')).map((x) => x.valor!);
    const med = mediana(valoresOk);
    for (const r of g) {
      if (r.valor === undefined) {
        if (med !== undefined) {
          r.valor = med;
          r.alertas.add('VALOR_INFERIDO_DAS_OUTRAS_PARCELAS');
        } else {
          r.alertas.add('SEM_VALOR');
        }
        r.revisar = true;
      } else if (med !== undefined && g.length > 1 && Math.abs(r.valor - med) > Math.max(1, med * 0.02) && !r.alertas.has('DUPLICADA_COM_VALOR_DIVERGENTE')) {
        r.alertas.add(`VALOR_DIFERE_DAS_OUTRAS_PARCELAS(mediana ${med.toFixed(2)})`);
      }
    }
    // vencimento faltante: mês a mês a partir da parcela vizinha
    for (let i = 0; i < g.length; i++) {
      const r = g[i];
      if (r.vencimento) continue;
      const ant = [...g.slice(0, i)].reverse().find((x) => x.vencimento);
      const pos = g.slice(i + 1).find((x) => x.vencimento);
      if (ant) r.vencimento = addMeses(ant.vencimento!, r.num_parcela - ant.num_parcela);
      else if (pos) r.vencimento = addMeses(pos.vencimento!, r.num_parcela - pos.num_parcela);
      if (r.vencimento) {
        r.alertas.add('VENCIMENTO_INFERIDO_DAS_VIZINHAS');
        r.revisar = true;
        if (r.quitada && !r.data_pagamento && r.vencimento.getTime() <= HOJE.getTime()) {
          r.data_pagamento = r.vencimento;
          r.data_pagamento_origem = 'SEM_DATA->VENCIMENTO(INFERIDO)';
        }
      } else {
        r.alertas.add('SEM_VENCIMENTO');
        r.revisar = true;
      }
    }
    // parcelas faltando na sequência (buracos)
    const nums = g.map((x) => x.num_parcela);
    const max = Math.max(...nums);
    const faltam: number[] = [];
    for (let n = 1; n <= max; n++) if (!nums.includes(n)) faltam.push(n);
    if (faltam.length && max <= 30) for (const r of g) r.alertas.add(`PARCELAS_AUSENTES_NA_SEQUENCIA:${faltam.join(',')}`);
    // vencimentos fora de ordem
    for (let i = 1; i < g.length; i++) {
      const a = g[i - 1].vencimento, b = g[i].vencimento;
      if (a && b && b.getTime() < a.getTime()) g[i].alertas.add('VENCIMENTO_FORA_DE_ORDEM');
    }
  }

  // ---- DV auto-incrementado (processos "fantasmas" por parcela)
  const porRaiz = new Map<string, Set<string>>();
  for (const r of finais) {
    const raiz = r.num_processo.replace(/-\d+$/, '');
    (porRaiz.get(raiz) ?? porRaiz.set(raiz, new Set()).get(raiz)!).add(r.num_processo);
  }
  for (const r of finais) {
    const raiz = r.num_processo.replace(/-\d+$/, '');
    const conjunto = porRaiz.get(raiz)!;
    if (conjunto.size >= 3) {
      r.alertas.add(`POSSIVEL_DV_AUTOINCREMENTADO(${conjunto.size} variantes)`);
      r.revisar = true;
    }
  }

  // ---- CPF/CNPJ (o Excel também arrasta o DV: 08.576.146/0001-14, -15, -16...)
  const validosPorProcesso = new Map<string, string[]>();
  for (const r of finais) {
    if (!r.cpf_cnpj) continue;
    const f = formatarCpfCnpj(r.cpf_cnpj);
    if (f.valido) (validosPorProcesso.get(r.num_processo) ?? validosPorProcesso.set(r.num_processo, []).get(r.num_processo)!).push(f.texto);
  }
  const cpfPorProcesso = new Map<string, Set<string>>();
  for (const r of finais) {
    if (!r.cpf_cnpj) {
      r.alertas.add('SEM_CPF_CNPJ');
      continue;
    }
    let f = formatarCpfCnpj(r.cpf_cnpj);
    if (!f.valido) {
      const d = somenteDigitos(r.cpf_cnpj);
      // 1) erro de digitação recuperável: zero à esquerda perdido, ou um dígito a mais (…0001-674, 00001-69)
      let ok: { texto: string; valido: boolean } | undefined;
      const validos = new Set<string>();
      const tenta = (t: string) => {
        if (t.length !== 11 && t.length !== 14) return;
        const f2 = formatarCpfCnpj(t);
        if (f2.valido) validos.add(f2.texto);
      };
      if (d.length === 10 || d.length === 13) tenta('0' + d);
      if (d.length > 14) {
        tenta(d.slice(0, 14));
        tenta(d.slice(0, 11));
      }
      if (d.length === 15 || d.length === 12) for (let i = 0; i < d.length; i++) tenta(d.slice(0, i) + d.slice(i + 1));
      if (validos.size === 1) ok = formatarCpfCnpj([...validos][0]);
      // 2) outro CPF/CNPJ válido do mesmo processo com a mesma raiz
      if (!ok) {
        const raiz = d.length >= 12 ? d.slice(0, 8) : d.slice(0, 9);
        const cand = (validosPorProcesso.get(r.num_processo) ?? []).find((v) => somenteDigitos(v).startsWith(raiz));
        if (cand) ok = formatarCpfCnpj(cand);
      }
      if (ok) {
        r.alertas.add(`CPF_CNPJ_CORRIGIDO(${r.cpf_cnpj})`);
        f = ok;
      } else r.alertas.add('CPF_CNPJ_INVALIDO');
    }
    r.cpf_cnpj = f.texto;
    (cpfPorProcesso.get(r.num_processo) ?? cpfPorProcesso.set(r.num_processo, new Set()).get(r.num_processo)!).add(f.texto);
  }
  for (const r of finais) {
    if ((cpfPorProcesso.get(r.num_processo)?.size ?? 0) > 1) r.alertas.add('CPF_CNPJ_DIFERE_ENTRE_PARCELAS');
  }

  // ---- antecipação + status final
  for (const r of finais) {
    if (r.quitada && r.data_pagamento && r.vencimento && r.data_pagamento_origem.startsWith('DATA_')) {
      const c = classificarAntecipacao(r.vencimento, r.data_pagamento);
      r.antecipada = c.antecipada;
      r.dias_antecipacao = c.antecipada ? c.diasAntecipacao : undefined;
    } else if (!r.quitada) {
      r.antecipada = false;
    }
    if (r.sistema !== 'SLCE' && r.sistema === 'FISICO' && !/^\d{4}-\d\.\d{3}\.\d{3}-\d$/.test(r.num_processo)) {
      /* já sinalizado por PROCESSO_FORMATO_INVALIDO */
    }
    // processo SEI na aba de físicos e vice-versa
    const ehFisico = /^\d{4}-\d\.\d{3}\.\d{3}-\d$/.test(r.num_processo);
    const ehSei = /^\d{4}\.\d{4}\/\d{7}-\d$/.test(r.num_processo);
    if (r.sistema === 'FISICO' && ehSei) r.alertas.add('NUM_PROCESSO_E_SEI_MAS_SISTEMA_FISICO');
    if ((r.sistema === 'SEI' || r.sistema === 'APROVA_DIGITAL') && ehFisico) r.alertas.add('NUM_PROCESSO_E_FISICO_MAS_SISTEMA_' + r.sistema);
    for (const a of r.alertas) {
      if (/^(DATA_PAGTO_DISTANTE|DATA_PAGTO_FUTURA|VALOR_SUSPEITO|PROCESSO_FORMATO_INVALIDO|SEM_CODIGO_OBRIGACAO|SITUACAO_INDEFINIDA|DUPLICADA_COM_|QUEBRA_COM_PAGAMENTO|PARCELA_TEXTO|PARCELA_SEM_NUMERO|CODIGO_DESCONHECIDO|VENCIMENTO_ILEGIVEL|SITUACAO_PAGA_MAS_PAGTO_N|VALOR_PERDIDO|NUM_PROCESSO_E_)/.test(a))
        r.revisar = true;
    }
  }

  const statusDe = (r: Rec): StatusParcela => {
    if (r.quitada) return 'PAGO';
    if (r.quebra) return 'QUEBRA';
    if (r.vencimento && r.vencimento.getTime() < HOJE.getTime()) return 'VENCIDA_NAO_PAGA';
    return 'A_VENCER';
  };

  // ---- status do processo e totais
  const statusProc = new Map<string, string>();
  const totalProc = new Map<string, { n: number; soma: number }>();
  const porProc = new Map<string, Rec[]>();
  for (const r of finais) (porProc.get(r.num_processo) ?? porProc.set(r.num_processo, []).get(r.num_processo)!).push(r);
  for (const [p, g] of porProc) {
    const st = g.some((x) => statusDe(x) === 'QUEBRA') ? 'QUEBRA' : g.every((x) => x.quitada) ? 'QUITADO' : 'EM_PAGAMENTO';
    statusProc.set(p, st);
    totalProc.set(p, { n: g.length, soma: g.reduce((s, x) => s + (x.valor ?? 0), 0) });
  }
  const nPorGrupo = new Map<string, number>();
  for (const [k, g] of grupos) nPorGrupo.set(k, Math.max(...g.map((x) => x.num_parcela)));

  // ---- ordenação final
  finais.sort(
    (a, b) =>
      a.num_processo.localeCompare(b.num_processo) ||
      (a.obrigacao ?? '').localeCompare(b.obrigacao ?? '') ||
      a.num_parcela - b.num_parcela,
  );

  await escreverXlsx(outPath, finais, { statusDe, statusProc, totalProc, nPorGrupo, cont, duplicadas, conflitoSistema, portalQtd: portal.length, portalStats });
  console.log('Gerado:', outPath);
}

// ---------------------------------------------------------------- saída

interface Aux {
  statusDe: (r: Rec) => StatusParcela;
  statusProc: Map<string, string>;
  totalProc: Map<string, { n: number; soma: number }>;
  nPorGrupo: Map<string, number>;
  cont: Record<string, number>;
  duplicadas: number;
  conflitoSistema: number;
  portalQtd: number;
  portalStats?: PortalStats;
}

const ymd = (d?: Date) => (d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` : null);
/** Date UTC meia-noite → o Excel mostra o dia certo com numFmt dd/mm/yyyy. */
const dx = (d?: Date) => d ?? null;

async function escreverXlsx(outPath: string, finais: Rec[], aux: Aux) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Portal Outorga';
  wb.created = new Date();

  const colunas: { header: string; key: string; width: number; fmt?: string }[] = [
    { header: 'chave_parcela', key: 'chave', width: 34 },
    { header: 'sistema', key: 'sistema', width: 16 },
    { header: 'num_processo', key: 'num_processo', width: 22 },
    { header: 'protocolo_ad', key: 'protocolo', width: 22 },
    { header: 'data_entrada', key: 'data_entrada', width: 12, fmt: 'dd/mm/yyyy' },
    { header: 'cpf_cnpj', key: 'cpf_cnpj', width: 19 },
    { header: 'codigo_receita', key: 'codigo', width: 10 },
    { header: 'obrigacao', key: 'obrigacao', width: 10 },
    { header: 'num_parcela', key: 'num_parcela', width: 8 },
    { header: 'total_parcelas_obrigacao', key: 'total_parcelas', width: 10 },
    { header: 'parcela_unica', key: 'unica', width: 8 },
    { header: 'vencimento', key: 'vencimento', width: 12, fmt: 'dd/mm/yyyy' },
    { header: 'valor', key: 'valor', width: 16, fmt: '#,##0.00' },
    { header: 'status_parcela', key: 'status', width: 18 },
    { header: 'status_quitacao', key: 'quitada', width: 9 },
    { header: 'quebra', key: 'quebra', width: 8 },
    { header: 'data_pagamento', key: 'data_pagamento', width: 12, fmt: 'dd/mm/yyyy' },
    { header: 'origem_data_pagamento', key: 'origem_pag', width: 30 },
    { header: 'ano_pagamento', key: 'ano_pagamento', width: 9 },
    { header: 'antecipada', key: 'antecipada', width: 9 },
    { header: 'dias_antecipacao', key: 'dias_antecipacao', width: 9 },
    { header: 'mes_competencia', key: 'mes_competencia', width: 10 },
    { header: 'mes_arrecadacao', key: 'mes_arrecadacao', width: 10 },
    { header: 'status_processo', key: 'status_processo', width: 14 },
    { header: 'valor_total_processo', key: 'total_processo', width: 16, fmt: '#,##0.00' },
    { header: 'revisar', key: 'revisar', width: 8 },
    { header: 'alertas', key: 'alertas', width: 60 },
    { header: 'situacao_original', key: 'situacao_original', width: 14 },
    { header: 'pagamento_original', key: 'pagamento_original', width: 18 },
    { header: 'num_processo_original', key: 'num_processo_original', width: 22 },
    { header: 'arquivo_origem', key: 'arquivo', width: 30 },
    { header: 'aba_origem', key: 'aba', width: 24 },
    { header: 'linha_origem', key: 'linha', width: 8 },
  ];

  const ws = wb.addWorksheet('PARCELAS', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] });
  ws.columns = colunas.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.fmt ? { numFmt: c.fmt } : {} }));

  for (const r of finais) {
    const g = `${r.num_processo}|${r.obrigacao ?? '?'}`;
    const tp = aux.totalProc.get(r.num_processo);
    ws.addRow({
      chave: chaveParcela(r),
      sistema: r.sistema,
      num_processo: r.num_processo,
      protocolo: r.protocolo ?? null,
      data_entrada: dx(r.data_entrada),
      cpf_cnpj: r.cpf_cnpj ?? null,
      codigo: r.codigo ?? null,
      obrigacao: r.obrigacao ?? null,
      num_parcela: r.num_parcela,
      total_parcelas: aux.nPorGrupo.get(g) ?? null,
      unica: r.parcela_unica,
      vencimento: dx(r.vencimento),
      valor: r.valor ?? null,
      status: aux.statusDe(r),
      quitada: r.quitada,
      quebra: r.quebra,
      data_pagamento: dx(r.data_pagamento),
      origem_pag: r.data_pagamento_origem,
      ano_pagamento: r.ano_informado ?? (r.data_pagamento ? r.data_pagamento.getUTCFullYear() : null),
      antecipada: r.antecipada,
      dias_antecipacao: r.dias_antecipacao ?? null,
      mes_competencia: ymd(r.vencimento),
      mes_arrecadacao: r.quitada ? ymd(r.data_pagamento) : null,
      status_processo: aux.statusProc.get(r.num_processo) ?? null,
      total_processo: tp ? Math.round(tp.soma * 100) / 100 : null,
      revisar: r.revisar,
      alertas: [...r.alertas].join('; ') || null,
      situacao_original: r.situacao_original ?? null,
      pagamento_original: r.pagamento_original ?? null,
      num_processo_original: r.num_processo_original,
      arquivo: r.arquivo,
      aba: r.aba,
      linha: r.linha || null,
    });
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  head.alignment = { vertical: 'middle', wrapText: true };
  head.height = 32;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  // realça linhas a revisar
  const iRev = colunas.findIndex((c) => c.key === 'revisar') + 1;
  ws.eachRow((row, n) => {
    if (n > 1 && row.getCell(iRev).value === true) row.getCell(iRev).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
  });

  // ---------------- resumo
  const wr = wb.addWorksheet('RESUMO');
  const cnt = <T,>(f: (r: Rec) => T) => {
    const m = new Map<T, number>();
    for (const r of finais) m.set(f(r), (m.get(f(r)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const soma = (f: (r: Rec) => boolean) => finais.filter(f).reduce((s, r) => s + (r.valor ?? 0), 0);
  const L = (a: unknown, b?: unknown, c?: unknown) => wr.addRow([a, b ?? null, c ?? null]);
  L('Consolidação de parcelas — Outorga Onerosa').font = { bold: true, size: 14 };
  L('Gerado em', new Date().toLocaleString('pt-BR'));
  L('Data de referência ("hoje")', fmtISO(HOJE));
  L('');
  L('Totais').font = { bold: true };
  L('Parcelas (linhas)', finais.length);
  L('Processos distintos', new Set(finais.map((r) => r.num_processo)).size);
  L('Soma dos valores das parcelas (R$)', Math.round(soma(() => true) * 100) / 100);
  L('Arrecadado (parcelas pagas, sem quebra) (R$)', Math.round(soma((r) => r.quitada) * 100) / 100);
  L('Linhas marcadas para revisar', finais.filter((r) => r.revisar).length);
  L('Duplicatas descartadas (mesma processo+obrigação+parcela em mais de uma aba)', aux.duplicadas);
  L('  das quais entre sistemas diferentes', aux.conflitoSistema);
  L('Linhas descartadas (aba DESCARTADAS)', descartadas.length);
  L('Parcelas do Portal (banco + planilha UL0113, deduzidas)', aux.portalQtd);
  if (aux.portalStats) {
    L('  processos na planilha do Portal', aux.portalStats.processos);
    L('  processos com parcelas geradas', aux.portalStats.comParcelas);
    L('  já presentes nas outras planilhas (mantidas as de lá)', aux.portalStats.jaNasPlanilhas);
    L('  sem parcelamento/sem vencimento (ver DESCARTADAS)', aux.portalStats.semDados.length);
  }
  L('');
  L('Por sistema').font = { bold: true };
  for (const [k, v] of cnt((r) => r.sistema)) L(k, v);
  L('');
  L('Por obrigação').font = { bold: true };
  for (const [k, v] of cnt((r) => r.obrigacao ?? '(sem)')) L(k, v);
  L('');
  L('Por status da parcela').font = { bold: true };
  for (const [k, v] of cnt((r) => aux.statusDe(r))) L(k, v);
  L('');
  L('Origem da data de pagamento').font = { bold: true };
  for (const [k, v] of cnt((r) => r.data_pagamento_origem)) L(k, v);
  L('');
  L('Alertas (quantidade de linhas)').font = { bold: true };
  const al = new Map<string, number>();
  for (const r of finais) for (const a of r.alertas) al.set(a.split(':')[0].replace(/\(.*$/, ''), (al.get(a.split(':')[0].replace(/\(.*$/, '')) ?? 0) + 1);
  for (const [k, v] of [...al.entries()].sort((a, b) => b[1] - a[1])) L(k, v);
  L('');
  L('Linhas lidas por aba (antes de deduplicar)').font = { bold: true };
  for (const [k, v] of Object.entries(aux.cont)) L(k, v);
  wr.getColumn(1).width = 78;
  wr.getColumn(2).width = 18;
  wr.getColumn(3).width = 50;

  // ---------------- legenda dos alertas
  const LEGENDA: Record<string, [string, string]> = {
    ANO_PAGTO_DIFERE_VENC: ['info', 'O ano informado na coluna de pagamento é diferente do ano do vencimento. ano_pagamento guarda o ano informado.'],
    ANTECIPADA_PELO_ANO: ['info', 'Ano de pagamento anterior ao do vencimento: marcada como antecipada (sem dias precisos).'],
    ANO_PAGTO_POSTERIOR_AO_VENC: ['REVISAR', 'Pago em ano posterior ao vencimento e só o ano foi informado.'],
    PAGTO_EM_LOTE: ['info', 'Várias parcelas do processo com a mesma data de pagamento (quitação de saldo/regularização): data mantida.'],
    DATA_PAGTO_ARRASTADA_NO_EXCEL: ['REVISAR', 'Datas de pagamento avançando 1 dia por parcela (autopreenchimento): usada a 1ª data da sequência para todas.'],
    DATA_PAGTO_DISTANTE_DO_VENC: ['REVISAR', 'Data de pagamento a mais de 400 dias do vencimento (e não é lote). Veja DATA_PAGTO_CORRIGIDA / DESCARTADA.'],
    DATA_PAGTO_CORRIGIDA: ['REVISAR', 'Data com ano ou dia/mês provavelmente trocado; corrigida para a mais próxima do esperado. A original está no texto do alerta.'],
    DATA_PAGTO_DESCARTADA: ['REVISAR', 'Data implausível sem correção possível: data_pagamento = vencimento.'],
    DATA_PAGTO_ANO_INVALIDO: ['REVISAR', 'Ano da data de pagamento fora de 1990-2100 (ex.: 2676): data_pagamento = vencimento.'],
    DATA_PAGTO_FUTURA: ['REVISAR', 'Data de pagamento posterior a hoje. Se já venceu: = vencimento; se não venceu: volta para A_VENCER.'],
    DATA_PAGTO_EM_PARCELA_NAO_PAGA: ['info', 'Há data de pagamento mas a Situação não é paga: parcela mantida como não paga.'],
    DATA_PAGTO_NA_COLUNA_SITUACAO: ['info', 'A data de pagamento estava na coluna Situação (processos 7022 sem SISTEMA).'],
    PAGAMENTO_TEXTO_CORRIGIDO: ['info', 'Data de pagamento digitada como texto malformado (ex.: 1704/2023); interpretada.'],
    PAGA_SEM_DATA_VENCIMENTO_FUTURO: ['REVISAR', 'Paga, mas sem data de pagamento e com vencimento futuro: data_pagamento vazia (não se inventa data futura).'],
    PAGA_SEM_DATA_E_SEM_VENCIMENTO: ['REVISAR', 'Paga sem data de pagamento nem vencimento.'],
    ANTECIPACAO_SEM_DATA_REAL: ['info', 'Coluna de pagamento dizia Antecipação sem data: marcada antecipada.'],
    SITUACAO_INDEFINIDA: ['REVISAR', 'Situação vazia/ilegível: status decidido pela evidência de pagamento ou pelo nome da aba.'],
    SITUACAO_PAGA_MAS_PAGTO_N: ['REVISAR', 'Situação diz Pago/Quitado mas a coluna de pagamento diz N.'],
    QUEBRA_COM_PAGAMENTO_INFORMADO: ['REVISAR', 'Situação Quebra mas há data ou S de pagamento.'],
    QUITADA_SEM_EVIDENCIA_VENC_FUTURO: ['info', 'Aba Quitado sem situação nem pagamento e vencimento futuro: tratada como a vencer.'],
    VENCIMENTO_TEXTO_CORRIGIDO: ['info', 'Vencimento digitado como texto (ex.: 30/02/19): interpretado/ajustado ao fim do mês.'],
    VENCIMENTO_ILEGIVEL: ['REVISAR', 'Vencimento não interpretável.'],
    VENCIMENTO_INFERIDO_DAS_VIZINHAS: ['REVISAR', 'Vencimento ausente: calculado mês a mês a partir da parcela vizinha.'],
    SEM_VENCIMENTO: ['REVISAR', 'Sem vencimento e sem como inferir.'],
    VENCIMENTO_CORRIGIDO_PELA_SERIE: ['REVISAR', 'Ano do vencimento digitado errado (múltiplo de 12 meses fora da série): alinhado à série do processo.'],
    VENCIMENTO_CORRIGIDO_ANO: ['REVISAR', 'Série inteira de vencimentos com ano errado (antes do ano do processo): deslocada pelos pagamentos.'],
    VENCIMENTO_ANTERIOR_AO_PROCESSO: ['REVISAR', 'Vencimento anterior ao ano do processo e sem como corrigir.'],
    VENCIMENTO_ARRASTADO_POR_ANO: ['REVISAR', 'Vencimentos avançando 1 ano por parcela (autopreenchimento): refeitos mês a mês.'],
    VENCIMENTO_REPETIDO_CORRIGIDO: ['REVISAR', 'Mesma data de vencimento copiada em parcelas consecutivas: refeitos mês a mês.'],
    VENCIMENTO_FORA_DA_SERIE: ['info', 'Vencimento fora da série mensal do processo (não corrigido).'],
    VENCIMENTO_FORA_DE_ORDEM: ['info', 'Vencimento anterior ao da parcela anterior.'],
    VENCIMENTO_RECUPERADO_DA_COLUNA_VALOR: ['REVISAR', 'Colunas vencimento/valor bagunçadas: o vencimento estava (como serial) na coluna do valor.'],
    VALOR_PERDIDO_NA_PLANILHA: ['REVISAR', 'O valor da parcela não existe mais na planilha (coluna ocupada pelo vencimento).'],
    VALOR_SUSPEITO_ANO_OU_DATA: ['REVISAR', 'A coluna de valor tem um ano/data no lugar do valor.'],
    VALOR_VAZIO: ['info', 'Coluna de valor só com R$.'],
    VALOR_INFERIDO_DAS_OUTRAS_PARCELAS: ['REVISAR', 'Valor ausente: usada a mediana das outras parcelas do processo.'],
    SEM_VALOR: ['REVISAR', 'Parcela sem valor e sem como inferir.'],
    VALOR_DIFERE_DAS_OUTRAS_PARCELAS: ['info', 'Valor diferente da mediana das parcelas do processo (pode ser recálculo ou valor agregado).'],
    PARCELA_SEM_NUMERO: ['REVISAR', 'Sem nº de parcela: numerada em sequência.'],
    PARCELA_TEXTO: ['REVISAR', 'Texto livre na coluna da parcela (int/quebra, Outorga Recalculada...).'],
    PARCELAS_AUSENTES_NA_SEQUENCIA: ['info', 'Faltam parcelas na sequência 1..N do processo+obrigação.'],
    SEM_CODIGO_OBRIGACAO: ['REVISAR', 'Sem código 79/78/109/7022...: obrigacao vazia.'],
    CODIGO_DESCONHECIDO: ['REVISAR', 'Código fora da lista conhecida (ex.: 79 alterado para c...).'],
    PROCESSO_FORMATO_INVALIDO: ['REVISAR', 'Nº de processo fora dos formatos SEI/físico; mantido como veio.'],
    PROCESSO_REPARADO: ['info', 'Nº do processo reformatado para o padrão (pontuação/zeros).'],
    PROCESSO_DV_CORRIGIDO: ['info', 'DV auto-incrementado pelo Excel: unificado com a família do processo.'],
    PROCESSO_DV_DIVERGENTE: ['REVISAR', 'Mesma raiz de processo com DVs diferentes e sem critério para escolher.'],
    PROCESSO_DV_INVALIDO: ['REVISAR', 'DV com 2+ dígitos sobrou após a unificação.'],
    NUM_PROCESSO_E_FISICO_MAS_SISTEMA_APROVA_DIGITAL: ['REVISAR', 'Nº no formato físico em aba do Aprova Digital.'],
    NUM_PROCESSO_E_FISICO_MAS_SISTEMA_SEI: ['REVISAR', 'Nº no formato físico em aba do SEI.'],
    NUM_PROCESSO_E_SEI_MAS_SISTEMA_FISICO: ['REVISAR', 'Nº no formato SEI em aba de físicos.'],
    CPF_CNPJ_INVALIDO: ['info', 'Dígitos verificadores não conferem (muitos vêm do DV arrastado no Excel).'],
    CPF_CNPJ_CORRIGIDO: ['info', 'CPF/CNPJ reparado (zero perdido, dígito a mais, ou valor válido de outra parcela do processo).'],
    CPF_CNPJ_DIFERE_ENTRE_PARCELAS: ['info', 'Parcelas do mesmo processo com CPF/CNPJ diferentes.'],
    SEM_CPF_CNPJ: ['info', 'Sem CPF/CNPJ.'],
    DUPLICADA_EM: ['info', 'A mesma parcela (processo+obrigação+nº) existe em outras abas; foi mantida a de melhor qualidade.'],
    DUPLICADA_COM_STATUS_DIVERGENTE: ['info', 'As cópias divergem no status (ex.: Quitado x Quebra); prevaleceu a mais confiável.'],
    DUPLICADA_COM_VALOR_DIVERGENTE: ['REVISAR', 'As cópias divergem no valor.'],
    DUPLICADA_ENTRE_SISTEMAS: ['REVISAR', 'Parcela repetida entre sistemas diferentes.'],
    PAGAMENTO_A_VISTA_DPCI_COMPLEMENTA_PARCELAMENTO: ['REVISAR', 'Processo com parcelamento (DPD) e também pagamento DPCI: este foi numerado como parcela extra, ao final.'],
    VERIFICAR_MANUALMENTE: ['REVISAR', 'Protocolo consta na aba Verificar manualmente - DPD (guia cancelada, emprestada, etc.).'],
    OBRIGACAO_ASSUMIDA_PDE_PORTAL: ['info', 'Portal não informa a obrigação: assumida PDE (OODC).'],
    PARCELAS_DEDUZIDAS_DO_PORTAL: ['info', 'Portal só traz o resumo do processo; parcelas geradas a partir de nº de parcelas, valor devido/pago e guia.'],
    SEM_CPF_CNPJ_NO_PORTAL: ['info', 'Planilha do Portal não traz CPF/CNPJ.'],
    PARCELA_DEDUZIDA_PAGA: ['info', 'Parcela anterior à guia informada: considerada paga no vencimento.'],
    PARCELA_DA_GUIA_INFORMADA: ['info', 'Parcela da última guia paga: usa a data de pagamento do Portal.'],
    PARCELA_DEDUZIDA_A_PAGAR: ['info', 'Parcela posterior à última paga: vencimento calculado mês a mês.'],
    PAGO_NAO_MULTIPLO_DA_PARCELA: ['REVISAR', 'Valor pago não é múltiplo do valor da parcela (devido/N): nº de parcelas pagas arredondado.'],
    PAGO_MAIOR_QUE_DEVIDO: ['REVISAR', 'Valor pago maior que o devido (pagamento em duplicidade ou de outra obrigação): limitado a N parcelas.'],
    ENVIADO_CDM_PARCELAS_RESTANTES_COMO_QUEBRA: ['REVISAR', 'Situação Enviado CDM: parcelas não pagas tratadas como quebra (suposição).'],
    POSSIVEL_DV_AUTOINCREMENTADO: ['REVISAR', 'Várias variantes do processo diferindo só no DV.'],
  };
  const wl = wb.addWorksheet('ALERTAS');
  wl.addRow(['alerta', 'gravidade', 'o que significa / o que foi feito', 'linhas']).font = { bold: true };
  const contAl = new Map<string, number>();
  for (const r of finais)
    for (const a of new Set([...r.alertas].map((x) => x.split(':')[0].replace(/\(.*$/, '')))) contAl.set(a, (contAl.get(a) ?? 0) + 1);
  for (const [k, v] of [...contAl.entries()].sort((a, b) => b[1] - a[1]))
    wl.addRow([k, LEGENDA[k]?.[0] ?? '?', LEGENDA[k]?.[1] ?? '(sem descrição)', v]);
  [48, 11, 120, 9].forEach((w, i) => (wl.getColumn(i + 1).width = w));

  // ---------------- descartadas
  const wx = wb.addWorksheet('DESCARTADAS');
  wx.addRow(['arquivo', 'aba', 'linha', 'motivo', 'conteúdo (colunas 1-12)']).font = { bold: true };
  for (const d of descartadas) wx.addRow([d.arquivo, d.aba, d.linha, d.motivo, d.resumo]);
  [30, 26, 8, 52, 120].forEach((w, i) => (wx.getColumn(i + 1).width = w));

  // ---------------- dicionário
  const wd = wb.addWorksheet('DICIONARIO');
  const dic: [string, string][] = [
    ['chave_parcela', 'num_processo|obrigacao|num_parcela — identificador único da linha (use para upsert).'],
    ['sistema', 'Sistema de origem: APROVA_DIGITAL, SEI, FISICO, SLCE (protocolo SLC) ou PORTAL (banco). Valores iguais ao enum OrigemProcesso do schema.'],
    ['num_processo', 'Nº do processo no formato canônico do banco: SEI NNNN.AAAA/NNNNNNN-D; físico AAAA-D.DDD.DDD-D. O original fica em num_processo_original.'],
    ['protocolo_ad', 'Protocolo do Aprova Digital (ou SLC), herdado da 1ª linha do processo.'],
    ['data_entrada', 'Data de entrada do processo, herdada da 1ª linha.'],
    ['cpf_cnpj', 'CPF/CNPJ formatado. Alerta CPF_CNPJ_INVALIDO quando os dígitos verificadores não conferem.'],
    ['codigo_receita', 'Código da Prefeitura na planilha (79, 78, 109, 7022, 7023, 7137).'],
    ['obrigacao', 'PDE (79/7022/7023) | COTA (78/7137) | AIU (109). Um mesmo processo pode ter PDE e COTA, cada uma com sua numeração de parcelas.'],
    ['num_parcela / total_parcelas_obrigacao', 'Ordem da parcela e maior nº de parcela do processo+obrigação.'],
    ['parcela_unica', 'TRUE para pagamento à vista / DPCI (sem número de parcela na planilha).'],
    ['vencimento', 'Data de vencimento. Se faltava na planilha, é inferida das parcelas vizinhas (alerta VENCIMENTO_INFERIDO_DAS_VIZINHAS).'],
    ['valor', 'Valor da parcela em R$ (numérico). Fonte de verdade do total do processo.'],
    ['status_parcela', 'PAGO | A_VENCER | VENCIDA_NAO_PAGA | QUEBRA — estados distintos (quebra ≠ a vencer ≠ vencido não pago).'],
    ['status_quitacao / quebra', 'Booleanos para gravar direto em Parcela.status_quitacao / Parcela.quebra.'],
    ['data_pagamento', 'Data efetiva de pagamento (→ Parcela.data_quitacao). Só preenchida em parcelas pagas.'],
    ['origem_data_pagamento', 'DATA_INFORMADA | DATA_CORRIGIDA(...) | ANO_APENAS->VENCIMENTO | SEM_DATA->VENCIMENTO | PAGTO_FUTURO->VENCIMENTO | DATA_IMPLAUSIVEL->VENCIMENTO | SEM_DATA_VENC_FUTURO | NAO_PAGA.'],
    ['ano_pagamento', 'Ano da data_pagamento (→ Parcela.ano_pagamento).'],
    ['antecipada / dias_antecipacao', 'Regra de lib/antecipacao.ts (mês anterior ao vencimento e > 7 dias). Quando só havia o ano e ele é anterior ao do vencimento, antecipada=TRUE sem dias.'],
    ['mes_competencia / mes_arrecadacao', 'AAAA-MM do vencimento e do pagamento.'],
    ['status_processo', 'Derivado das parcelas: QUEBRA > EM_PAGAMENTO > QUITADO.'],
    ['valor_total_processo', 'Soma das parcelas do processo (todas as obrigações) → Processo.valor_total_parcelas.'],
    ['revisar', 'TRUE = há alerta que exige conferência humana antes de importar (ver alertas).'],
    ['alertas', 'Inconsistências detectadas/tratadas na linha, separadas por ";" (legenda na aba ALERTAS).'],
    ['situacao_original / pagamento_original', 'Texto cru das colunas Situação e Data/Ano de Pagamento — para auditoria.'],
    ['arquivo_origem / aba_origem / linha_origem', 'Rastreabilidade até a linha da planilha original (linha_origem vazia = veio do banco).'],
  ];
  wd.addRow(['Coluna', 'Descrição']).font = { bold: true };
  for (const d of dic) wd.addRow(d);
  wd.getColumn(1).width = 38;
  wd.getColumn(2).width = 140;

  await wb.xlsx.writeFile(outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
