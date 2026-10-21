/**
 * Remove a máscara de `Processo.num_processo` (passa a ser só dígitos):
 *   1010.2019/0001812-5 -> 1010201900018125   |   2018-0.125.548-9 -> 201801255489
 *
 * A máscara é aplicada apenas na exibição (`lib/mascara-processo.ts`).
 * Como dígitos iguais colapsam em um só valor, números que diferiam só por erro
 * de pontuação (ex.: `1010-2021/...` x `1010.2021/...`) viram duplicata: esses
 * casos NÃO são alterados e são listados para revisão manual (mesclar à mão).
 *
 * Uso:
 *   npx tsx prisma/migrar-num-processo-sem-mascara.ts --dry-run
 *   npx tsx prisma/migrar-num-processo-sem-mascara.ts
 */
import { PrismaClient } from "@prisma/client";
import { normalizarNumeroProcesso } from "../lib/mascara-processo";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const processos = await prisma.processo.findMany({ select: { id: true, num_processo: true } });

  const porDigitos = new Map<string, { id: string; num_processo: string }[]>();
  for (const p of processos) {
    const d = normalizarNumeroProcesso(p.num_processo);
    porDigitos.set(d, [...(porDigitos.get(d) ?? []), p]);
  }

  let ok = 0;
  let jaNormalizados = 0;
  let semDigitos = 0;
  let conflitos = 0;
  for (const [digitos, grupo] of porDigitos) {
    if (!digitos) {
      semDigitos += grupo.length;
      grupo.forEach((p) => console.log(`SEM DÍGITOS  id ${p.id}: "${p.num_processo}"`));
      continue;
    }
    if (grupo.length > 1) {
      conflitos += grupo.length;
      console.log(`CONFLITO  ${digitos}: ${grupo.map((p) => `"${p.num_processo}" (${p.id})`).join(" | ")}`);
      continue;
    }
    const p = grupo[0];
    if (p.num_processo === digitos) {
      jaNormalizados++;
      continue;
    }
    console.log(`${dryRun ? "[dry-run] " : ""}${p.num_processo} -> ${digitos}`);
    if (!dryRun) await prisma.processo.update({ where: { id: p.id }, data: { num_processo: digitos } });
    ok++;
  }

  console.log(
    `\n${ok} ${dryRun ? "a converter" : "convertido(s)"} · ${jaNormalizados} já só dígitos · ${conflitos} em conflito · ${semDigitos} sem dígitos`,
  );
}

main().finally(() => prisma.$disconnect());
