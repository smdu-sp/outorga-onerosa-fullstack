/**
 * Corrige parcelas com data_quitacao no futuro (hoje = 2026-08-04).
 *
 * Casos:
 * 1) Quitada com data futura e vencimento já passado → pagamento = vencimento
 * 2) Quitada com data futura e vencimento futuro → não está paga (aba Quitado
 *    repetia parcelas a vencer; ou data de pagto inválida)
 * 3) Processo físico 2019-0.046.615-1: datas Excel corrompidas (venc~1900,
 *    quit=2676; "valor" é serial de data) → reconstrói vencimento, limpa quitação absurda
 *
 * Também alinha a aba Parcelas de `OUTORGA APROVA DIGITAL - estruturada.xlsx`.
 */
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "path";

const prisma = new PrismaClient();
const HOJE = new Date(Date.UTC(2026, 7, 4)); // 04/08/2026
const ESTRUTURADA = path.resolve(
  "public/planilhas/OUTORGA APROVA DIGITAL - estruturada.xlsx",
);

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function excelSerialToDate(serial: number): Date | null {
  if (serial < 30000 || serial > 60000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  const y = d.getUTCFullYear();
  if (y < 1990 || y > 2100) return null;
  return d;
}

async function corrigirBanco() {
  const futuras = await prisma.parcela.findMany({
    where: { data_quitacao: { gt: HOJE } },
    include: { processo: { select: { num_processo: true, origem: true } } },
  });

  console.log(`Parcelas com data_quitacao > ${ymd(HOJE)}: ${futuras.length}`);

  let paraVencimento = 0;
  let desmarcadas = 0;
  let fisicoCorrigido = 0;

  for (const p of futuras) {
    const quit = p.data_quitacao!;
    const venc = p.vencimento;
    const proc = p.processo.num_processo;

    // Caso especial: datas absurdas no físico
    if (
      proc === "2019-0.046.615-1" ||
      quit.getUTCFullYear() >= 2100 ||
      venc.getUTCFullYear() < 1990
    ) {
      const recon = excelSerialToDate(p.valor);
      if (recon) {
        const quitada = recon.getTime() <= HOJE.getTime();
        await prisma.parcela.update({
          where: { id: p.id },
          data: {
            vencimento: recon,
            data_quitacao: quitada ? recon : null,
            ano_pagamento: quitada ? recon.getUTCFullYear() : null,
            status_quitacao: quitada,
            antecipada: false,
            dias_antecipacao: null,
          },
        });
        fisicoCorrigido++;
        console.log(
          `  FISICO ${proc} p${p.num_parcela}: venc/quit → ${ymd(recon)} (serial valor=${p.valor})`,
        );
      } else {
        await prisma.parcela.update({
          where: { id: p.id },
          data: {
            data_quitacao: null,
            ano_pagamento: null,
            status_quitacao: false,
            antecipada: false,
            dias_antecipacao: null,
          },
        });
        desmarcadas++;
        console.log(`  FISICO ${proc} p${p.num_parcela}: limpou quitação absurda`);
      }
      continue;
    }

    if (venc.getTime() <= HOJE.getTime()) {
      await prisma.parcela.update({
        where: { id: p.id },
        data: {
          data_quitacao: venc,
          ano_pagamento: venc.getUTCFullYear(),
        },
      });
      paraVencimento++;
      console.log(
        `  ${proc} p${p.num_parcela}: pag ${ymd(quit)} → venc ${ymd(venc)}`,
      );
    } else {
      await prisma.parcela.update({
        where: { id: p.id },
        data: {
          data_quitacao: null,
          ano_pagamento: null,
          status_quitacao: false,
          antecipada: false,
          dias_antecipacao: null,
        },
      });
      desmarcadas++;
      console.log(
        `  ${proc} p${p.num_parcela}: desmarcada (venc futuro ${ymd(venc)}, pag era ${ymd(quit)})`,
      );
    }
  }

  // Recalcular status_pagamento do processo quando todas parcelas mudaram
  const procsAfetados = [...new Set(futuras.map((f) => f.processo_id))];
  for (const processoId of procsAfetados) {
    const parcelas = await prisma.parcela.findMany({
      where: { processo_id: processoId },
      select: { status_quitacao: true, quebra: true },
    });
    const algumaQuebra = parcelas.some((x) => x.quebra);
    const todasPagas =
      parcelas.length > 0 &&
      parcelas.every((x) => x.status_quitacao || x.quebra);
    const status = algumaQuebra
      ? ("QUEBRA" as const)
      : todasPagas
        ? ("QUITADO" as const)
        : ("EM_PAGAMENTO" as const);
    await prisma.processo.update({
      where: { id: processoId },
      data: { status_pagamento: status },
    });
  }

  console.log("\n--- Banco ---");
  console.log(`Pagamento → vencimento: ${paraVencimento}`);
  console.log(`Desmarcadas (a vencer): ${desmarcadas}`);
  console.log(`Físico reconstruído:    ${fisicoCorrigido}`);

  const restam = await prisma.parcela.count({
    where: { data_quitacao: { gt: HOJE } },
  });
  console.log(`Restam com pagto futuro: ${restam}`);
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return ymd(v);
  if (typeof v === "object" && v !== null && "result" in v)
    return cellStr((v as { result: unknown }).result);
  return String(v).trim();
}

function parseCellDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (typeof v === "number" && v > 30000 && v < 60000) {
    return excelSerialToDate(v);
  }
  const s = cellStr(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
  return null;
}

async function corrigirPlanilha() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ESTRUTURADA);
  const ws = wb.getWorksheet("Parcelas");
  if (!ws) {
    console.log("Aba Parcelas não encontrada na estruturada.");
    return;
  }

  const header = ws.getRow(1);
  const headers: string[] = [];
  header.eachCell((c, col) => {
    headers[col] = cellStr(c.value).toLowerCase();
  });
  const colPag = headers.findIndex((h) => h?.includes("pagamento"));
  const colVenc = headers.findIndex((h) => h?.includes("vencimento"));
  const colSit = headers.findIndex((h) => h?.includes("situa"));
  if (colPag < 0 || colVenc < 0) {
    console.log("Colunas pagamento/vencimento não encontradas.");
    return;
  }

  let alteradas = 0;
  ws.eachRow((row, rn) => {
    if (rn === 1) return;
    const pag = parseCellDate(row.getCell(colPag).value);
    if (!pag || pag.getTime() <= HOJE.getTime()) return;
    const venc = parseCellDate(row.getCell(colVenc).value);

    if (venc && venc.getTime() <= HOJE.getTime()) {
      row.getCell(colPag).value = venc;
      alteradas++;
    } else {
      row.getCell(colPag).value = null;
      if (colSit > 0) {
        const sit = cellStr(row.getCell(colSit).value).toUpperCase();
        if (sit.includes("QUIT") || sit.includes("PAGO")) {
          row.getCell(colSit).value = "A VENCER";
        }
      }
      alteradas++;
    }
  });

  await wb.xlsx.writeFile(ESTRUTURADA);
  console.log(`\n--- Planilha estruturada ---`);
  console.log(`Linhas alteradas: ${alteradas}`);
  console.log(`Arquivo: ${ESTRUTURADA}`);
}

async function main() {
  await corrigirBanco();
  await corrigirPlanilha();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
