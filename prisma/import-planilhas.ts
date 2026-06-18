import {
  ConstaDocumentoMonitoramento,
  IncidenciaCotaSolidariedade,
  OrigemMonitoramento,
  Prisma,
  PrismaClient,
  SituacaoMonitoramento,
  StatusPagamento,
  Tipo,
  TipoLicencaMonitoramento,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

const PLANILHAS_DIR =
  process.env.PLANILHAS_DIR ??
  path.join('C:', 'Users', 'd854440', 'Downloads', 'Planilhas CAP OO');

const ARQUIVOS = {
  aprovaDigital: 'PLANILHA OUTORGA - APROVA DIGITAL.xlsm',
  fisicosSei: 'Planilha de Outorga - FISICOS  e SEI2.xlsx',
  cotaSolidariedade: 'BANCO DE DADOS - Cota Solidariedade OODC para ATIC.xlsx',
  monitoramentoOutorga:
    'CÓPIA_BANCO DE DADOS Outorga Onerosa 16.050_14 e 17.975_23 - versão 2024_1.xlsx',
};

const TIPO_POR_CODIGO: Record<string, Tipo> = {
  '79': 'PDE',
  '78': 'COTA',
  '7022': 'PDE',
  '7023': 'PDE',
  '7137': 'COTA',
  '109': 'COTA',
};

interface ParcelaImport {
  num_parcela: number;
  valor: number;
  vencimento: Date;
  data_quitacao?: Date;
  ano_pagamento?: number;
  cpf_cnpj?: string;
  status_quitacao: boolean;
  quebra?: boolean;
}

interface ProcessoImport {
  num_processo: string;
  tipo?: Tipo;
  codigo?: string;
  protocolo_ad?: string;
  data_entrada?: Date;
  status_pagamento: StatusPagamento;
  parcelas: ParcelaImport[];
}

const processosMap = new Map<string, ProcessoImport>();

function arquivo(nome: string) {
  return path.join(PLANILHAS_DIR, nome);
}

function arquivoExiste(nome: string) {
  return fs.existsSync(arquivo(nome));
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
    // Serial Excel (dias desde 1899-12-30)
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

function parseAnoPagamento(value: unknown): number | undefined {
  const text = cleanText(value);
  if (!text || text.toUpperCase() === 'S' || text.toUpperCase() === 'N') return undefined;
  const num = parseIntSafe(value);
  if (num && num > 1900 && num < 2100) return num;
  return undefined;
}

function parseTipo(codigo: unknown): Tipo | undefined {
  const text = cleanText(codigo)?.replace(/\D/g, '');
  if (!text) return undefined;
  return TIPO_POR_CODIGO[text];
}

function statusFromSheetName(name: string): StatusPagamento {
  const upper = name.toUpperCase();
  if (upper.includes('QUEBRA')) return 'QUEBRA';
  if (upper.includes('QUITADO') || upper.includes('VISTA')) return 'QUITADO';
  return 'EM_PAGAMENTO';
}

function parcelaQuitada(situacao: unknown, statusSheet: StatusPagamento): boolean {
  const text = cleanText(situacao)?.toUpperCase() ?? '';
  if (text.includes('QUEBRA')) return false;
  if (text.includes('QUITADO') || text === 'PAGO' || text.includes('PAGO')) return true;
  if (statusSheet === 'QUITADO') return true;
  return false;
}

function readSheetRows(filePath: string, sheetName: string): unknown[][] {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
}

function listSheets(filePath: string): string[] {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  return wb.SheetNames;
}

function mergeProcesso(processo: ProcessoImport) {
  const key = processo.num_processo;
  const existing = processosMap.get(key);
  if (!existing) {
    processosMap.set(key, processo);
    return;
  }

  existing.tipo = existing.tipo ?? processo.tipo;
  existing.codigo = existing.codigo ?? processo.codigo;
  existing.protocolo_ad = existing.protocolo_ad ?? processo.protocolo_ad;
  existing.data_entrada = existing.data_entrada ?? processo.data_entrada;

  const prioridade: Record<StatusPagamento, number> = {
    QUEBRA: 3,
    EM_PAGAMENTO: 2,
    QUITADO: 1,
  };
  if (prioridade[processo.status_pagamento] > prioridade[existing.status_pagamento]) {
    existing.status_pagamento = processo.status_pagamento;
  }

  const parcelasPorNumero = new Map<number, ParcelaImport>();
  for (const parcela of [...existing.parcelas, ...processo.parcelas]) {
    parcelasPorNumero.set(parcela.num_parcela, parcela);
  }
  existing.parcelas = [...parcelasPorNumero.values()].sort(
    (a, b) => a.num_parcela - b.num_parcela,
  );
}

function parseParcelSheet(
  rows: unknown[][],
  statusSheet: StatusPagamento,
  layout: 'ad_dpd' | 'ad_dpci' | 'fisico',
) {
  if (rows.length < 2) return;

  let current: ProcessoImport | null = null;
  let cpfAtual: string | undefined;

  const flush = () => {
    if (current?.num_processo && current.parcelas.length) {
      mergeProcesso(current);
    }
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => cell === null || cell === '')) continue;

    let numProcesso: string | undefined;
    let codigo: string | undefined;
    let protocolo: string | undefined;
    let dataEntrada: Date | undefined;
    let cpfCnpj: string | undefined;
    let numParcela: number | undefined;
    let vencimento: Date | undefined;
    let valor: number | undefined;
    let anoPagamento: number | undefined;
    let situacao: unknown;
    let dataQuitacao: Date | undefined;

    if (layout === 'ad_dpd') {
      dataEntrada = parseExcelDate(row[0]);
      codigo = cleanText(row[1]);
      protocolo = cleanText(row[2]);
      numProcesso = normalizeProcesso(row[3]);
      cpfCnpj = cleanText(row[4]);
      numParcela = parseIntSafe(row[5]);
      vencimento = parseExcelDate(row[6]);
      valor = parseNumber(row[7]);
      anoPagamento = parseAnoPagamento(row[8]);
      situacao = row[9];
    } else if (layout === 'ad_dpci') {
      codigo = cleanText(row[2] ?? row[1]);
      protocolo = cleanText(row[3]);
      numProcesso = normalizeProcesso(row[4]);
      cpfCnpj = cleanText(row[5]);
      vencimento = parseExcelDate(row[6]);
      valor = parseNumber(row[7]);
      anoPagamento = parseAnoPagamento(row[8]);
      situacao = row[9] ?? row[10];
      numParcela = 1;
      dataEntrada = parseExcelDate(row[0]);
    } else {
      dataEntrada = parseExcelDate(row[0]);
      codigo = cleanText(row[1]);
      numProcesso = normalizeProcesso(row[2]);
      cpfCnpj = cleanText(row[3]);
      numParcela = parseIntSafe(row[4]);
      vencimento = parseExcelDate(row[5]);
      valor = parseNumber(row[6]);
      dataQuitacao = parseExcelDate(row[7]);
      situacao = row[8] ?? row[9];
      anoPagamento = parseAnoPagamento(row[11]);
    }

    if (cpfCnpj) cpfAtual = cpfCnpj;
    if (!numParcela || !vencimento || valor === undefined) continue;

    if (numProcesso) {
      flush();
      current = {
        num_processo: numProcesso,
        tipo: parseTipo(codigo),
        codigo,
        protocolo_ad: protocolo,
        data_entrada: dataEntrada,
        status_pagamento: statusSheet,
        parcelas: [],
      };
    } else if (current && codigo) {
      current.codigo = current.codigo ?? codigo;
      current.tipo = current.tipo ?? parseTipo(codigo);
    }

    if (!current?.num_processo) continue;

    if (dataEntrada && !current.data_entrada) current.data_entrada = dataEntrada;
    if (protocolo && !current.protocolo_ad) current.protocolo_ad = protocolo;

    const quitada = parcelaQuitada(situacao, statusSheet);
    current.parcelas.push({
      num_parcela: numParcela,
      valor,
      vencimento,
      data_quitacao: dataQuitacao,
      ano_pagamento: anoPagamento,
      cpf_cnpj: cpfAtual,
      status_quitacao: quitada,
      quebra: statusSheet === 'QUEBRA' && !quitada,
    });
  }

  flush();
}

function importarProcessosFinanceiros() {
  if (!arquivoExiste(ARQUIVOS.aprovaDigital)) {
    console.log(
      `Aprova Digital: arquivo não encontrado (${ARQUIVOS.aprovaDigital}), pulando.`,
    );
  } else {
  const adPath = arquivo(ARQUIVOS.aprovaDigital);
  for (const sheet of listSheets(adPath)) {
    const upper = sheet.toUpperCase();
    if (upper.includes('FERIADOS') || upper.includes('VERIFICAR')) continue;
    const status = statusFromSheetName(sheet);
    const rows = readSheetRows(adPath, sheet);
    if (upper.includes('DPCI') || upper.includes('VISTA')) {
      parseParcelSheet(rows, status, 'ad_dpci');
    } else if (
      upper.includes('DPD') ||
      upper.includes('AIU') ||
      upper.includes('PIU') ||
      upper.includes('PAGAMENTO')
    ) {
      parseParcelSheet(rows, status, 'ad_dpd');
    }
  }
  }

  if (!arquivoExiste(ARQUIVOS.fisicosSei)) {
    console.log(
      `Físicos/SEI: arquivo não encontrado (${ARQUIVOS.fisicosSei}), pulando.`,
    );
  } else {
  const fisicoPath = arquivo(ARQUIVOS.fisicosSei);
  for (const sheet of listSheets(fisicoPath)) {
    const rows = readSheetRows(fisicoPath, sheet);
    parseParcelSheet(rows, statusFromSheetName(sheet), 'fisico');
  }
  }

  console.log(`Processos financeiros parseados: ${processosMap.size}`);
}

async function upsertProcessos() {
  let criados = 0;
  let atualizados = 0;

  for (const processo of processosMap.values()) {
    processo.parcelas = processo.parcelas.filter((p) => isValidDbDate(p.vencimento));
    if (!processo.parcelas.length) continue;

    try {
    const existente = await prisma.processo.findUnique({
      where: { num_processo: processo.num_processo },
    });

    if (existente) {
      await prisma.parcela.deleteMany({ where: { processo_id: existente.id } });
      await prisma.processo.update({
        where: { id: existente.id },
        data: {
          tipo: processo.tipo,
          codigo: processo.codigo,
          protocolo_ad: processo.protocolo_ad,
          data_entrada: processo.data_entrada,
          status_pagamento: processo.status_pagamento,
          parcelas: {
            create: processo.parcelas.map((parcela) => ({
              num_parcela: parcela.num_parcela,
              valor: parcela.valor,
              vencimento: parcela.vencimento,
              data_quitacao: parcela.data_quitacao,
              ano_pagamento: parcela.ano_pagamento,
              cpf_cnpj: parcela.cpf_cnpj,
              status_quitacao: parcela.status_quitacao,
              quebra: parcela.quebra ?? false,
            })),
          },
        },
      });
      atualizados++;
    } else {
      await prisma.processo.create({
        data: {
          num_processo: processo.num_processo,
          tipo: processo.tipo,
          codigo: processo.codigo,
          protocolo_ad: processo.protocolo_ad,
          data_entrada: processo.data_entrada,
          status_pagamento: processo.status_pagamento,
          parcelas: {
            create: processo.parcelas.map((parcela) => ({
              num_parcela: parcela.num_parcela,
              valor: parcela.valor,
              vencimento: parcela.vencimento,
              data_quitacao: parcela.data_quitacao,
              ano_pagamento: parcela.ano_pagamento,
              cpf_cnpj: parcela.cpf_cnpj,
              status_quitacao: parcela.status_quitacao,
              quebra: parcela.quebra ?? false,
            })),
          },
        },
      });
      criados++;
    }
    } catch (error) {
      console.warn(`Erro ao importar processo ${processo.num_processo}:`, error);
    }
  }

  console.log(`Processos: ${criados} criados, ${atualizados} atualizados`);
}

async function garantirProcesso(numProcesso: string, tipo?: Tipo): Promise<string> {
  const existente = await prisma.processo.findUnique({
    where: { num_processo: numProcesso },
  });
  if (existente) return existente.id;

  const criado = await prisma.processo.create({
    data: {
      num_processo: numProcesso,
      tipo,
      status_pagamento: 'EM_PAGAMENTO',
    },
  });
  return criado.id;
}

function mapIncidencia(value: unknown): IncidenciaCotaSolidariedade | undefined {
  const text = cleanText(value)?.toUpperCase();
  if (!text || text.includes('PADR')) return undefined;
  if (text === 'SIM') return 'SIM';
  if (text === 'NÃO' || text === 'NAO') return 'NAO';
  return undefined;
}

function mapSituacao(value: unknown): SituacaoMonitoramento | undefined {
  const text = cleanText(value)?.toUpperCase();
  if (!text || text.includes('PADR') || text === 'SITUAÇÃO') return undefined;
  if (text.includes('QUITADO')) return 'QUITADO';
  if (text.includes('ARRECADADO')) return 'ARRECADADO_AD';
  if (text.includes('PAGAMENTO')) return 'EM_PAGAMENTO';
  return 'SEM_INFORMACAO';
}

function mapOrigem(value: unknown): OrigemMonitoramento | undefined {
  const text = cleanText(value)?.toUpperCase();
  if (!text || text.includes('PADR') || text === 'ORIGEM') return undefined;
  if (text.includes('SISACOE')) return 'SISACOE';
  if (text === 'SEI') return 'SEI';
  if (text.includes('APROVA')) return 'APROVA_DIGITAL';
  return 'OUTRO';
}

function mapConsta(value: unknown): ConstaDocumentoMonitoramento | undefined {
  const text = cleanText(value)?.toUpperCase();
  if (!text) return undefined;
  if (text.includes('NÃO SE APLICA') || text.includes('NAO SE APLICA')) return 'NAO_SE_APLICA';
  if (text.includes('NÃO CONSTA') || text.includes('NAO CONSTA')) return 'NAO_CONSTA';
  if (text.includes('CONSTA')) return 'CONSTA';
  return undefined;
}

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  for (const col of Object.keys(row)) {
    for (const key of keys) {
      if (col.includes(key)) return row[col];
    }
  }
  return undefined;
}

async function importarMonitoramentoOutorga() {
  if (!arquivoExiste(ARQUIVOS.monitoramentoOutorga)) {
    console.log(`Monitoramento outorga: arquivo não encontrado (${ARQUIVOS.monitoramentoOutorga}), pulando.`);
    return;
  }
  const filePath = arquivo(ARQUIVOS.monitoramentoOutorga);
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets['Outorga Onerosa Lei 16.050'],
    { range: 1, defval: null },
  );

  let importados = 0;

  for (const row of rows) {
    const numProcesso = normalizeProcesso(row['CD_PRC_OO']);
    if (!numProcesso) continue;

    const processoId = await garantirProcesso(numProcesso);

    const ficha = await prisma.monitoramentoFicha.upsert({
      where: { processo_id: processoId },
      create: {
        processo_id: processoId,
        responsavel_preenchimento: cleanText(row['CD_RSP_OO']),
        proposta_oodc_id: cleanText(row['ID_OO']),
        numero_proposta: cleanText(row['NU_PPT_OO']),
        processo_modificativo: cleanText(row['PRC_MDF_OO']),
        proprietario_interessado: cleanText(row['NM_PIN_OO']),
      },
      update: {
        responsavel_preenchimento: cleanText(row['CD_RSP_OO']),
        proposta_oodc_id: cleanText(row['ID_OO']),
        numero_proposta: cleanText(row['NU_PPT_OO']),
        processo_modificativo: cleanText(row['PRC_MDF_OO']),
        proprietario_interessado: cleanText(row['NM_PIN_OO']),
      },
    });

    await prisma.monitoramentoCoordenada.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        coordenada_e: parseNumber(row['CRD_E']),
        coordenada_n: parseNumber(row['CRD_N']),
      },
      update: {
        coordenada_e: parseNumber(row['CRD_E']),
        coordenada_n: parseNumber(row['CRD_N']),
      },
    });

    await prisma.monitoramentoLocalizacaoLote.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        setor: cleanText(row['CD_SET_OO']),
        quadra: cleanText(row['CD_QDR_OO']),
        lote_cadastrado: cleanText(row['CD_LT_OO + CD_DL_OO']),
        lote_atualizado: cleanText(row['CD_CM_OO']),
        codigo_logradouro: cleanText(row['CD_LG_OO']),
      },
      update: {
        setor: cleanText(row['CD_SET_OO']),
        quadra: cleanText(row['CD_QDR_OO']),
        lote_cadastrado: cleanText(row['CD_LT_OO + CD_DL_OO']),
        lote_atualizado: cleanText(row['CD_CM_OO']),
        codigo_logradouro: cleanText(row['CD_LG_OO']),
      },
    });

    const enderecos = [
      {
        ordem: 1,
        tipo: cleanText(row['TXT_ETP_OO']),
        titulo: cleanText(row['TXT_ETT_OO']),
        nome: cleanText(row['TXT_E1_OO']),
        numero: cleanText(row['TXT_N1_OO']),
      },
      {
        ordem: 2,
        tipo: cleanText(row['TXT_ETP2_OO']),
        titulo: cleanText(row['TXT_ETT2_OO']),
        nome: cleanText(row['TXT_E2_OO']),
        numero: cleanText(row['TXT_N2_OO']),
      },
    ].filter((e) => e.tipo || e.nome || e.numero);

    await prisma.monitoramentoEndereco.deleteMany({
      where: { monitoramento_ficha_id: ficha.id },
    });
    if (enderecos.length) {
      await prisma.monitoramentoEndereco.createMany({
        data: enderecos.map((e) => ({ ...e, monitoramento_ficha_id: ficha.id })),
      });
    }

    await prisma.monitoramentoEnquadramentoUrbanistico.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        distrito: cleanText(row['SGL_DS_OO']),
        subprefeitura: cleanText(row['SGL_SB_OO']),
        macrozona: cleanText(row['TXT_MZ_OO']),
        macroarea: cleanText(row['TXT_MA_OO']),
        subsetor: cleanText(row['TXT_SST_OO']),
        zona_uso_1_18081: cleanText(row['SGL_ZN1_OO']),
        zona_uso_2_17975: cleanText(row['SGL_ZN2_OO']),
        zona_uso_3_16402: cleanText(row['SGL_ZN3_OO']),
        zona_uso_4_16050: cleanText(row['SGL_ZN4_OO']),
        zona_uso_5_13885: cleanText(row['SGL_ZN5_OO']),
        zona_uso_6_13885: cleanText(row['SGL_ZN6_OO']),
        tipologia_uso_oodc: cleanText(row['CD_TUI1_OO']),
      },
      update: {
        distrito: cleanText(row['SGL_DS_OO']),
        subprefeitura: cleanText(row['SGL_SB_OO']),
        macrozona: cleanText(row['TXT_MZ_OO']),
        macroarea: cleanText(row['TXT_MA_OO']),
        subsetor: cleanText(row['TXT_SST_OO']),
        zona_uso_1_18081: cleanText(row['SGL_ZN1_OO']),
        zona_uso_2_17975: cleanText(row['SGL_ZN2_OO']),
        zona_uso_3_16402: cleanText(row['SGL_ZN3_OO']),
        zona_uso_4_16050: cleanText(row['SGL_ZN4_OO']),
        zona_uso_5_13885: cleanText(row['SGL_ZN5_OO']),
        zona_uso_6_13885: cleanText(row['SGL_ZN6_OO']),
        tipologia_uso_oodc: cleanText(row['CD_TUI1_OO']),
      },
    });

    await prisma.monitoramentoSubcategoriaUso.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        uso_r_hmp_his: cleanText(row['SLG_SC1_OO']),
        uso_r_hmp_his_2: cleanText(row['SLG_SC2_OO']),
        uso_r_hmp_his_3: cleanText(row['SLG_SC3_OO']),
        uso_nr: cleanText(row['SLG_SC4_OO']),
        uso_nr_2: cleanText(row['SLG_SC5_OO']),
        uso_nr_3: cleanText(row['SLG_SC6_OO']),
        uso_extra:
          cleanText(row['SLG_SC7_OO']) ??
          cleanText(row['SLG_SC7_OO_1']),
      },
      update: {
        uso_r_hmp_his: cleanText(row['SLG_SC1_OO']),
        uso_r_hmp_his_2: cleanText(row['SLG_SC2_OO']),
        uso_r_hmp_his_3: cleanText(row['SLG_SC3_OO']),
        uso_nr: cleanText(row['SLG_SC4_OO']),
        uso_nr_2: cleanText(row['SLG_SC5_OO']),
        uso_nr_3: cleanText(row['SLG_SC6_OO']),
        uso_extra:
          cleanText(row['SLG_SC7_OO']) ??
          cleanText(row['SLG_SC7_OO_1']),
      },
    });

    const fpCols = Object.keys(row).filter((k) => k.startsWith('VL_FP_OO'));
    const fsCols = Object.keys(row).filter((k) => k.startsWith('VL_FS_OO'));
    const arObjCols = Object.keys(row).filter((k) => k.startsWith('AR_OBJ_OO'));
    const vlCntCols = Object.keys(row).filter((k) => k.startsWith('VL_CNT_OO'));

    await prisma.monitoramentoCalculoOutorga.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        fp_uso_r: cleanText(row[fpCols[0]]),
        fp_uso_nr: cleanText(row[fpCols[1]]),
        fs_uso_r: cleanText(row[fsCols[0]]),
        fs_uso_nr: cleanText(row[fsCols[1]]),
        area_objeto_uso_r: cleanText(row[arObjCols[0]]),
        area_objeto_uso_nr: cleanText(row[arObjCols[1]]),
        area_total_objeto: cleanText(row[arObjCols[2]]),
        area_nao_computavel: cleanText(row['AR_CNC_OO']),
        area_nao_computavel_incidente: cleanText(row['AR_CNCI_OO']),
        area_nao_computavel_final: cleanText(row['AR_CNCF_OO']),
        percentual_fachada_ativa: cleanText(row['FA_ARNC_OO']),
        area_computavel_total: parseNumber(row['AR_CPT_OO']),
        area_construida_total: parseNumber(row['AR_CNT_OO']),
        contrapartida_uso_r: cleanText(row[vlCntCols[0]]),
        contrapartida_uso_nr: cleanText(row[vlCntCols[1]]),
        contrapartida_total: cleanText(row[vlCntCols[2]]),
        coeficiente_basico: parseNumber(row['CA_BSC_OO']),
        coeficiente_utilizado: parseNumber(row['CA_UTL_OO']),
        area_terreno: parseNumber(row['AR_ LT_OO']),
        valor_m2_quadro14: parseNumber(row['VL_Q14_OO']),
        area_fruicao_publica: parseNumber(row['AR_AFP_OO']),
        area_doacao_melhoramento: parseNumber(row['AR_DMP_OO']),
        area_doacao_calcada: parseNumber(row['AR_DCCD_OO']),
        area_transferencia: parseNumber(row['AR_TRN_OO']),
        area_habitacao_social: parseNumber(row['AR_HIS_OO']),
      },
      update: {
        fp_uso_r: cleanText(row[fpCols[0]]),
        fp_uso_nr: cleanText(row[fpCols[1]]),
        fs_uso_r: cleanText(row[fsCols[0]]),
        fs_uso_nr: cleanText(row[fsCols[1]]),
        area_objeto_uso_r: cleanText(row[arObjCols[0]]),
        area_objeto_uso_nr: cleanText(row[arObjCols[1]]),
        area_total_objeto: cleanText(row[arObjCols[2]]),
        area_nao_computavel: cleanText(row['AR_CNC_OO']),
        area_nao_computavel_incidente: cleanText(row['AR_CNCI_OO']),
        area_nao_computavel_final: cleanText(row['AR_CNCF_OO']),
        percentual_fachada_ativa: cleanText(row['FA_ARNC_OO']),
        area_computavel_total: parseNumber(row['AR_CPT_OO']),
        area_construida_total: parseNumber(row['AR_CNT_OO']),
        contrapartida_uso_r: cleanText(row[vlCntCols[0]]),
        contrapartida_uso_nr: cleanText(row[vlCntCols[1]]),
        contrapartida_total: cleanText(row[vlCntCols[2]]),
        coeficiente_basico: parseNumber(row['CA_BSC_OO']),
        coeficiente_utilizado: parseNumber(row['CA_UTL_OO']),
        area_terreno: parseNumber(row['AR_ LT_OO']),
        valor_m2_quadro14: parseNumber(row['VL_Q14_OO']),
        area_fruicao_publica: parseNumber(row['AR_AFP_OO']),
        area_doacao_melhoramento: parseNumber(row['AR_DMP_OO']),
        area_doacao_calcada: parseNumber(row['AR_DCCD_OO']),
        area_transferencia: parseNumber(row['AR_TRN_OO']),
        area_habitacao_social: parseNumber(row['AR_HIS_OO']),
      },
    });

    await prisma.monitoramentoSituacao.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        incidencia_cota_solidariedade: mapIncidencia(row['ICD_CS_OO']),
        situacao: mapSituacao(row['TXT_ST_OO']),
        origem: mapOrigem(row['ORGM_OO']),
      },
      update: {
        incidencia_cota_solidariedade: mapIncidencia(row['ICD_CS_OO']),
        situacao: mapSituacao(row['TXT_ST_OO']),
        origem: mapOrigem(row['ORGM_OO']),
      },
    });

    const licencas: Prisma.MonitoramentoLicencaCreateManyInput[] = [
      {
        monitoramento_ficha_id: ficha.id,
        tipo: TipoLicencaMonitoramento.APROVACAO,
        numero: cleanText(row['NU_ALVA_OO']),
        tipo_documento: cleanText(row['TIPO_ALVA_OO']),
        data_expedicao: parseExcelDate(row['DT_ALVA_OO']),
      },
      {
        monitoramento_ficha_id: ficha.id,
        tipo: TipoLicencaMonitoramento.EXECUCAO,
        numero: cleanText(row['NU_ALVE_OO']),
        tipo_documento: cleanText(row['TIPO_ALVE_OO']),
        data_expedicao: parseExcelDate(row['DT_ALVE_OO']),
      },
      {
        monitoramento_ficha_id: ficha.id,
        tipo: TipoLicencaMonitoramento.CERTIFICADO_CONCLUSAO,
        numero: cleanText(row['NU_ALVC_OO']),
        tipo_documento: cleanText(row['TIPO_CTCC_OO']),
        data_expedicao: parseExcelDate(row['DT_CNC_OO']),
      },
    ].filter((l) => l.numero || l.tipo_documento || l.data_expedicao);

    await prisma.monitoramentoLicenca.deleteMany({
      where: { monitoramento_ficha_id: ficha.id },
    });
    if (licencas.length) {
      await prisma.monitoramentoLicenca.createMany({ data: licencas });
    }

    await prisma.monitoramentoAnotacaoDeuso.upsert({
      where: { monitoramento_ficha_id: ficha.id },
      create: {
        monitoramento_ficha_id: ficha.id,
        observacao_historico: cleanText(row['OBS_01_00']),
        data_informacao_dmus: parseExcelDate(row['DT_INFO_OO']),
        solicitacao_dsiz: cleanText(row['OBS_02_OO']),
        preenchimento_qgis: cleanText(row['OBS_03_OO']),
      },
      update: {
        observacao_historico: cleanText(row['OBS_01_00']),
        data_informacao_dmus: parseExcelDate(row['DT_INFO_OO']),
        solicitacao_dsiz: cleanText(row['OBS_02_OO']),
        preenchimento_qgis: cleanText(row['OBS_03_OO']),
      },
    });

    importados++;
  }

  console.log(`Monitoramento outorga: ${importados} fichas`);
}

async function importarMonitoramentoCota() {
  if (!arquivoExiste(ARQUIVOS.cotaSolidariedade)) {
    console.log(`Monitoramento cota: arquivo não encontrado (${ARQUIVOS.cotaSolidariedade}), pulando.`);
    return;
  }
  const filePath = arquivo(ARQUIVOS.cotaSolidariedade);
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets['COTA DE SOLIDARIEDADE'],
    { defval: null },
  );

  const extRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets['Ext. info, 14_06_2023'],
    { defval: null },
  );
  const extMap = new Map<string, Record<string, unknown>>();
  for (const ext of extRows) {
    const proc = normalizeProcesso(
      cell(ext, 'PROCESSO N', 'PROCESSO Nº', 'PROCESSO N°'),
    );
    if (proc) extMap.set(proc, ext);
  }

  let importados = 0;

  for (const row of rows) {
    const numProcesso = normalizeProcesso(
      cell(row, 'PROCESSO N', 'PROCESSO Nº', 'PROCESSO N°'),
    );
    if (!numProcesso) continue;

    const ext = extMap.get(numProcesso) ?? extMap.get(numProcesso.trim());
    const processoId = await garantirProcesso(numProcesso, 'COTA');

    const dataInformacao = parseExcelDate(cell(row, 'DATA INFORMAÇÃO DMUS', 'DATA INFORMACAO DMUS'));
    const dataInformacaoValida =
      dataInformacao && cleanText(cell(row, 'DATA INFORMAÇÃO DMUS')) !== 'n/consta'
        ? dataInformacao
        : undefined;

    await prisma.monitoramentoCotaSolidariedade.upsert({
      where: { processo_id: processoId },
      create: {
        processo_id: processoId,
        ficha_ouc: parseIntSafe(cell(row, 'OUC')),
        proposta_oodc: parseIntSafe(cell(row, 'PROPOSTA', 'PROPOSTA\nOODC')),
        data_informacao_dmus: dataInformacaoValida,
        setor: cleanText(cell(row, 'SETOR')),
        quadra: cleanText(cell(row, 'QUADRA')),
        lote: cleanText(cell(row, 'LOTE')),
        lote_atualizado_sqcond: cleanText(cell(row, 'LOTE ATUALIZADO', 'SQCOND')),
        codigo_logradouro: cleanText(cell(row, 'COD LOG')),
        endereco: cleanText(cell(row, 'ENDEREÇO', 'ENDERECO')),
        proprietario_interessado: cleanText(cell(row, 'PROPRIETÁRIO', 'PROPRIETARIO', 'INTERESSADO')),
        distrito: cleanText(cell(row, 'DISTRITO')),
        subprefeitura: cleanText(cell(row, 'SUBPREFEITURA')),
        macrozona: cleanText(cell(row, 'MACROZONA')),
        macroarea: cleanText(cell(row, 'MACROÁREA', 'MACROAREA')),
        subsetor: cleanText(cell(row, 'SUBSETOR')),
        zona_uso: cleanText(cell(row, 'ZONA DE USO')),
        subcategoria_uso: cleanText(cell(row, 'SUBCATEG')),
        coeficiente_utilizado: parseNumber(cell(row, 'C. A.', 'UTILIZADO')),
        area_terreno: parseNumber(cell(row, 'ÁREA TERRENO', 'AREA TERRENO')),
        valor_m2_quadro14: parseNumber(cell(row, 'VALOR M', 'Q 14')),
        alvara_aprovacao: cleanText(cell(row, 'ALVARÁ APROVAÇÃO', 'APROVACAO')),
        alvara_execucao: cleanText(cell(row, 'ALVARÁ EXECUÇÃO', 'EXECUCAO')),
        certificado_conclusao: cleanText(cell(row, 'CERTIFICADO DE CONCLUSÃO', 'CONCLUSAO')),
        observacao: cleanText(cell(row, 'OBSERVAÇÃO', 'OBSERVACAO')),
        origem: mapOrigem(cell(row, 'ORIGEM')),
        area_habitacao_social: cleanText(cell(row, 'HABITAÇÃO SOCIAL', 'HABITACAO SOCIAL')),
        situacao_cota: cleanText(cell(row, 'SITUAÇÃO COTA', 'SITUACAO COTA')),
        modalidade: cleanText(cell(row, 'MODALIDADE')),
        unidades: cleanText(cell(row, 'UNIDADES')),
        estimativa_deposito_fundurb: parseNumber(cell(row, 'ESTIMATIVA DMUS', 'FUNDURB')),
        valor_calculado_processo: parseNumber(
          cell(row, 'VALOR CALCULADO APRESENTADO', 'COTA DE SOLIDARIEDADE'),
        ),
        valor_pago: cleanText(cell(row, 'VALOR PAGO')),
        valor_devido: cleanText(cell(row, 'VALOR DEVIDO')),
        comprovantes_pagamento_prodam: cleanText(cell(row, 'COMPROVANTES', 'PRODAM')),
        planilha_calculo_cota: mapConsta(cell(row, 'PLANILHA DE CÁLCULO', 'PLANILHA DE CALCULO')),
        termo_compromisso_portaria: mapConsta(cell(row, 'TERMO DE COMPROMISSO', 'PORTARIA')),
        solicitacao_dsiz: cleanText(cell(row, 'SOLICITAÇÃO DSIZ', 'SOLICITACAO DSIZ')),
        preenchimento_qgis: cleanText(cell(row, 'PREENCHIMENTO TABELA', 'QGIS')),
        observacoes: cleanText(cell(row, 'OBS')),
        ficha_revisada_em: parseExcelDate(cell(row, 'FICHA REVISADA EM')),
        area_construida_computavel_total: parseNumber(
          cell(ext ?? {}, 'ÁREA CONSTRUÍDA COMPUTÁVEL', 'AREA CONSTRUIDA'),
        ),
      },
      update: {
        ficha_ouc: parseIntSafe(cell(row, 'OUC')),
        proposta_oodc: parseIntSafe(cell(row, 'PROPOSTA', 'PROPOSTA\nOODC')),
        data_informacao_dmus: dataInformacaoValida,
        setor: cleanText(cell(row, 'SETOR')),
        quadra: cleanText(cell(row, 'QUADRA')),
        lote: cleanText(cell(row, 'LOTE')),
        lote_atualizado_sqcond: cleanText(cell(row, 'LOTE ATUALIZADO', 'SQCOND')),
        codigo_logradouro: cleanText(cell(row, 'COD LOG')),
        endereco: cleanText(cell(row, 'ENDEREÇO', 'ENDERECO')),
        proprietario_interessado: cleanText(cell(row, 'PROPRIETÁRIO', 'PROPRIETARIO', 'INTERESSADO')),
        distrito: cleanText(cell(row, 'DISTRITO')),
        subprefeitura: cleanText(cell(row, 'SUBPREFEITURA')),
        macrozona: cleanText(cell(row, 'MACROZONA')),
        macroarea: cleanText(cell(row, 'MACROÁREA', 'MACROAREA')),
        subsetor: cleanText(cell(row, 'SUBSETOR')),
        zona_uso: cleanText(cell(row, 'ZONA DE USO')),
        subcategoria_uso: cleanText(cell(row, 'SUBCATEG')),
        coeficiente_utilizado: parseNumber(cell(row, 'C. A.', 'UTILIZADO')),
        area_terreno: parseNumber(cell(row, 'ÁREA TERRENO', 'AREA TERRENO')),
        valor_m2_quadro14: parseNumber(cell(row, 'VALOR M', 'Q 14')),
        alvara_aprovacao: cleanText(cell(row, 'ALVARÁ APROVAÇÃO', 'APROVACAO')),
        alvara_execucao: cleanText(cell(row, 'ALVARÁ EXECUÇÃO', 'EXECUCAO')),
        certificado_conclusao: cleanText(cell(row, 'CERTIFICADO DE CONCLUSÃO', 'CONCLUSAO')),
        observacao: cleanText(cell(row, 'OBSERVAÇÃO', 'OBSERVACAO')),
        origem: mapOrigem(cell(row, 'ORIGEM')),
        area_habitacao_social: cleanText(cell(row, 'HABITAÇÃO SOCIAL', 'HABITACAO SOCIAL')),
        situacao_cota: cleanText(cell(row, 'SITUAÇÃO COTA', 'SITUACAO COTA')),
        modalidade: cleanText(cell(row, 'MODALIDADE')),
        unidades: cleanText(cell(row, 'UNIDADES')),
        estimativa_deposito_fundurb: parseNumber(cell(row, 'ESTIMATIVA DMUS', 'FUNDURB')),
        valor_calculado_processo: parseNumber(
          cell(row, 'VALOR CALCULADO APRESENTADO', 'COTA DE SOLIDARIEDADE'),
        ),
        valor_pago: cleanText(cell(row, 'VALOR PAGO')),
        valor_devido: cleanText(cell(row, 'VALOR DEVIDO')),
        comprovantes_pagamento_prodam: cleanText(cell(row, 'COMPROVANTES', 'PRODAM')),
        planilha_calculo_cota: mapConsta(cell(row, 'PLANILHA DE CÁLCULO', 'PLANILHA DE CALCULO')),
        termo_compromisso_portaria: mapConsta(cell(row, 'TERMO DE COMPROMISSO', 'PORTARIA')),
        solicitacao_dsiz: cleanText(cell(row, 'SOLICITAÇÃO DSIZ', 'SOLICITACAO DSIZ')),
        preenchimento_qgis: cleanText(cell(row, 'PREENCHIMENTO TABELA', 'QGIS')),
        observacoes: cleanText(cell(row, 'OBS')),
        ficha_revisada_em: parseExcelDate(cell(row, 'FICHA REVISADA EM')),
        area_construida_computavel_total: parseNumber(
          cell(ext ?? {}, 'ÁREA CONSTRUÍDA COMPUTÁVEL', 'AREA CONSTRUIDA'),
        ),
      },
    });

    importados++;
  }

  console.log(`Monitoramento cota: ${importados} fichas`);
}

export async function importarPlanilhas() {
  console.log('Importando planilhas de:', PLANILHAS_DIR);

  processosMap.clear();
  importarProcessosFinanceiros();
  await upsertProcessos();
  await importarMonitoramentoOutorga();
  await importarMonitoramentoCota();

  const [processos, parcelas, fichas, cotas] = await Promise.all([
    prisma.processo.count(),
    prisma.parcela.count(),
    prisma.monitoramentoFicha.count(),
    prisma.monitoramentoCotaSolidariedade.count(),
  ]);

  console.log('\nResumo importação planilhas:');
  console.log({ processos, parcelas, fichas, cotas });
}

if (require.main === module) {
  importarPlanilhas()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
