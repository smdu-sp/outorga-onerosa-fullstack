import {
  OrigemProcesso,
  PrismaClient,
  StatusPagamento,
  Tipo,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

const ARQUIVO_PADRAO = path.join(
  __dirname,
  '..',
  'app',
  'planilhas',
  'Importacao outorga.xlsx',
);

const ARQUIVO_IMPORT =
  process.env.IMPORT_OUTORGA_FILE ??
  (fs.existsSync(ARQUIVO_PADRAO)
    ? ARQUIVO_PADRAO
    : '\\\\nas.prodam\\smul_atic_projetos\\Outorga_Onerosa\\Importacao outorga.xlsx');

interface ProcessoRow {
  tipo?: string;
  codigo?: unknown;
  num_processo: string;
  protocolo_ad?: string;
  data_entrada?: unknown;
  status_pagamento?: string;
  origem?: string;
}

interface ParcelaRow {
  num_processo: string;
  num_parcela: unknown;
  valor: unknown;
  vencimento: unknown;
  data_quitacao?: unknown;
  ano_pagamento?: unknown;
  cpf_cnpj?: string;
  status_quitacao?: unknown;
  antecipada?: unknown;
  quebra?: unknown;
}

interface AntecipadaRow {
  num_processo: string;
  num_parcela: unknown;
  valor: unknown;
  vencimento: unknown;
  data_quitacao?: unknown;
  dias_antecipacao?: unknown;
  mes_competencia?: string;
  mes_arrecadacao?: string;
  cpf_cnpj?: string;
}

interface ParcelaImport {
  num_parcela: number;
  valor: number;
  vencimento: Date;
  data_quitacao?: Date;
  ano_pagamento?: number;
  cpf_cnpj?: string;
  status_quitacao: boolean;
  antecipada: boolean;
  quebra: boolean;
  dias_antecipacao?: number;
  mes_competencia?: string;
  mes_arrecadacao?: string;
}

function cleanText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).replace(/\u00a0/g, ' ').trim();
  if (!text || text.toLowerCase() === 'nan') return undefined;
  return text;
}

function normalizeProcesso(value: unknown): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  if (/processo|xxxxxxx|0000-0\.000/i.test(text)) return undefined;
  return text.replace(/\s+/g, ' ');
}

function isValidDbDate(date?: Date): date is Date {
  if (!date || isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= 1990 && year <= 2100;
}

function parseExcelDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) {
    const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    return isValidDbDate(date) ? date : undefined;
  }
  if (typeof value === 'number') {
    if (value > 20000 && value < 80000) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return undefined;
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      return isValidDbDate(date) ? date : undefined;
    }
    return undefined;
  }
  const text = cleanText(value);
  if (!text) return undefined;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [d, m, y] = text.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    return isValidDbDate(date) ? date : undefined;
  }
  const asDate = new Date(text);
  if (!isNaN(asDate.getTime())) {
    const date = new Date(asDate.getFullYear(), asDate.getMonth(), asDate.getDate());
    return isValidDbDate(date) ? date : undefined;
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number' && !isNaN(value)) return value;
  const text = cleanText(value);
  if (!text || text === '-') return undefined;
  const normalized = text
    .replace(/R\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const num = Number(normalized);
  return isNaN(num) ? undefined : num;
}

function parseIntSafe(value: unknown): number | undefined {
  const num = parseNumber(value);
  if (num === undefined) return undefined;
  return Math.trunc(num);
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const text = cleanText(value)?.toUpperCase();
  return text === 'TRUE' || text === '1' || text === 'SIM' || text === 'S';
}

function parseTipo(value: unknown): Tipo | undefined {
  const text = cleanText(value)?.toUpperCase();
  if (!text) return undefined;
  if (text === 'PDE' || text === 'COTA' || text === 'AIU') return text;
  return undefined;
}

function parseOrigem(value: unknown): OrigemProcesso | undefined {
  const text = cleanText(value)?.toUpperCase();
  if (!text) return undefined;
  if (text in OrigemProcesso) return text as OrigemProcesso;
  return undefined;
}

function parseStatus(value: unknown): StatusPagamento {
  const text = cleanText(value)?.toUpperCase();
  if (text === 'QUITADO') return 'QUITADO';
  if (text === 'QUEBRA') return 'QUEBRA';
  return 'EM_PAGAMENTO';
}

function chaveParcela(numProcesso: string, numParcela: number) {
  return `${numProcesso}::${numParcela}`;
}

function lerPlanilha(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const obrigatorias = ['processos', 'parcelas', 'antecipadas'];
  for (const aba of obrigatorias) {
    if (!wb.Sheets[aba]) {
      throw new Error(`Aba obrigatória não encontrada: ${aba}`);
    }
  }
  return wb;
}

function agruparParcelas(
  parcelas: ParcelaRow[],
  antecipadas: AntecipadaRow[],
): Map<string, ParcelaImport[]> {
  const antecipadasMap = new Map<string, AntecipadaRow>();
  for (const row of antecipadas) {
    const numProcesso = normalizeProcesso(row.num_processo);
    const numParcela = parseIntSafe(row.num_parcela);
    if (!numProcesso || numParcela === undefined) continue;
    antecipadasMap.set(chaveParcela(numProcesso, numParcela), row);
  }

  const porProcesso = new Map<string, Map<number, ParcelaImport>>();

  for (const row of parcelas) {
    const numProcesso = normalizeProcesso(row.num_processo);
    const numParcela = parseIntSafe(row.num_parcela);
    const vencimento = parseExcelDate(row.vencimento);
    const valor = parseNumber(row.valor);
    if (!numProcesso || numParcela === undefined || !vencimento || valor === undefined) {
      continue;
    }

    const ant = antecipadasMap.get(chaveParcela(numProcesso, numParcela));
    const parcela: ParcelaImport = {
      num_parcela: numParcela,
      valor,
      vencimento,
      data_quitacao: parseExcelDate(row.data_quitacao) ?? parseExcelDate(ant?.data_quitacao),
      ano_pagamento: parseIntSafe(row.ano_pagamento),
      cpf_cnpj: cleanText(row.cpf_cnpj) ?? cleanText(ant?.cpf_cnpj),
      status_quitacao: parseBool(row.status_quitacao),
      antecipada: parseBool(row.antecipada) || !!ant,
      quebra: parseBool(row.quebra),
      dias_antecipacao: parseIntSafe(ant?.dias_antecipacao),
      mes_competencia: cleanText(ant?.mes_competencia),
      mes_arrecadacao: cleanText(ant?.mes_arrecadacao),
    };

    if (!porProcesso.has(numProcesso)) {
      porProcesso.set(numProcesso, new Map());
    }
    porProcesso.get(numProcesso)!.set(numParcela, parcela);
  }

  const resultado = new Map<string, ParcelaImport[]>();
  for (const [numProcesso, parcelasMap] of porProcesso) {
    resultado.set(
      numProcesso,
      [...parcelasMap.values()].sort((a, b) => a.num_parcela - b.num_parcela),
    );
  }
  return resultado;
}

export async function importarOutorga() {
  console.log('Importando:', ARQUIVO_IMPORT);
  const wb = lerPlanilha(ARQUIVO_IMPORT);

  const processosRows = XLSX.utils.sheet_to_json<ProcessoRow>(wb.Sheets['processos'], {
    defval: null,
  });
  const parcelasRows = XLSX.utils.sheet_to_json<ParcelaRow>(wb.Sheets['parcelas'], {
    defval: null,
  });
  const antecipadasRows = XLSX.utils.sheet_to_json<AntecipadaRow>(
    wb.Sheets['antecipadas'],
    { defval: null },
  );

  const parcelasPorProcesso = agruparParcelas(parcelasRows, antecipadasRows);

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  for (const row of processosRows) {
    const numProcesso = normalizeProcesso(row.num_processo);
    if (!numProcesso) continue;

    const parcelas = parcelasPorProcesso.get(numProcesso) ?? [];
    if (!parcelas.length) {
      ignorados++;
      continue;
    }

    const dadosProcesso = {
      tipo: parseTipo(row.tipo),
      codigo: cleanText(row.codigo),
      protocolo_ad: cleanText(row.protocolo_ad),
      data_entrada: parseExcelDate(row.data_entrada),
      status_pagamento: parseStatus(row.status_pagamento),
      origem: parseOrigem(row.origem),
    };

    const existente = await prisma.processo.findUnique({
      where: { num_processo: numProcesso },
    });

    const parcelasCreate = parcelas.map((p) => ({
      num_parcela: p.num_parcela,
      valor: p.valor,
      vencimento: p.vencimento,
      data_quitacao: p.data_quitacao,
      ano_pagamento: p.ano_pagamento,
      cpf_cnpj: p.cpf_cnpj,
      status_quitacao: p.status_quitacao,
      antecipada: p.antecipada,
      quebra: p.quebra,
      dias_antecipacao: p.dias_antecipacao,
      mes_competencia: p.mes_competencia,
      mes_arrecadacao: p.mes_arrecadacao,
    }));

    try {
      if (existente) {
        await prisma.parcela.deleteMany({ where: { processo_id: existente.id } });
        await prisma.processo.update({
          where: { id: existente.id },
          data: {
            ...dadosProcesso,
            parcelas: { create: parcelasCreate },
          },
        });
        atualizados++;
      } else {
        await prisma.processo.create({
          data: {
            num_processo: numProcesso,
            ...dadosProcesso,
            parcelas: { create: parcelasCreate },
          },
        });
        criados++;
      }
    } catch (error) {
      console.warn(`Erro ao importar ${numProcesso}:`, error);
    }
  }

  const [processos, parcelas, antecipadas] = await Promise.all([
    prisma.processo.count(),
    prisma.parcela.count(),
    prisma.parcela.count({ where: { antecipada: true } }),
  ]);

  console.log(`Processos: ${criados} criados, ${atualizados} atualizados, ${ignorados} sem parcelas`);
  console.log('Resumo banco:', { processos, parcelas, antecipadas });
}

if (require.main === module) {
  importarOutorga()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
