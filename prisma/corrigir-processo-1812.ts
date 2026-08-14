/**
 * Consolida processos fantasma criados por auto-incremento do DV no Excel.
 *
 * Caso: 1010.2019/0001812-5 .. -14 deveriam ser um único processo
 * 1010.2019/0001812-5 (10 parcelas). O Excel arrastou a célula e incrementou
 * o dígito verificador linha a linha.
 *
 * Uso:
 *   npx tsx prisma/corrigir-processo-1812.ts
 *   npx tsx prisma/corrigir-processo-1812.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const CORRETO = "1010.2019/0001812-5";
const FANTASMAS = [
  "1010.2019/0001812-6",
  "1010.2019/0001812-7",
  "1010.2019/0001812-8",
  "1010.2019/0001812-9",
  "1010.2019/0001812-10",
  "1010.2019/0001812-11",
  "1010.2019/0001812-12",
  "1010.2019/0001812-13",
  "1010.2019/0001812-14",
];

async function main() {
  const correto = await prisma.processo.findUnique({
    where: { num_processo: CORRETO },
    include: { parcelas: true },
  });
  if (!correto) {
    throw new Error(`Processo correto não encontrado: ${CORRETO}`);
  }

  const fantasmas = await prisma.processo.findMany({
    where: { num_processo: { in: FANTASMAS } },
    include: { parcelas: true },
  });

  const parcelaIds = fantasmas.flatMap((p) => p.parcelas.map((x) => x.id));
  const totalApos =
    Number(correto.valor_total_parcelas ?? 0) +
    fantasmas.reduce(
      (acc, p) =>
        acc +
        p.parcelas.reduce((s, x) => s + Number(x.valor ?? 0), 0),
      0,
    );

  console.log(`Processo correto: ${CORRETO} (${correto.id})`);
  console.log(`  parcelas atuais: ${correto.parcelas.length}`);
  console.log(`Fantasmas: ${fantasmas.length}`);
  for (const f of fantasmas) {
    console.log(
      `  ${f.num_processo}: ${f.parcelas.length} parcela(s) [${f.parcelas.map((x) => x.num_parcela).join(",")}]`,
    );
  }
  console.log(`Parcelas a mover: ${parcelaIds.length}`);
  console.log(`valor_total_parcelas após: ${totalApos.toFixed(2)}`);

  if (dryRun) {
    console.log("\n(dry-run) Nenhuma alteração aplicada.");
    return;
  }

  if (parcelaIds.length === 0 && fantasmas.length === 0) {
    console.log("\nNada a corrigir.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (parcelaIds.length > 0) {
      await tx.parcela.updateMany({
        where: { id: { in: parcelaIds } },
        data: { processo_id: correto.id },
      });
    }

    if (fantasmas.length > 0) {
      await tx.processo.deleteMany({
        where: { id: { in: fantasmas.map((f) => f.id) } },
      });
    }

    await tx.processo.update({
      where: { id: correto.id },
      data: { valor_total_parcelas: totalApos },
    });
  });

  const final = await prisma.processo.findUnique({
    where: { id: correto.id },
    include: { parcelas: { orderBy: { num_parcela: "asc" } } },
  });

  console.log("\nConsolidação ok:");
  console.log(`  ${final?.num_processo}: ${final?.parcelas.length} parcelas`);
  console.log(
    `  nums: [${final?.parcelas.map((p) => p.num_parcela).join(", ")}]`,
  );
  console.log(`  valor_total_parcelas: ${final?.valor_total_parcelas?.toString()}`);
}

main()
  .catch((error) => {
    console.error("Falha ao corrigir processo 1812:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
