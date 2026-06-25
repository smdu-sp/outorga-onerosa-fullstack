/**
 * Remove todos os processos e dados relacionados (sqls, parcelas, monitoramento DEUSO, cota).
 * Usuários e permissões são preservados.
 *
 * Uso:
 *   npx tsx prisma/limpar-processos.ts
 *   npx tsx prisma/limpar-processos.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';
import * as readline from 'node:readline';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function pergunta(msg: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(msg, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  const [processos, sqls, parcelas, fichas, cotas] = await Promise.all([
    prisma.processo.count(),
    prisma.sql.count(),
    prisma.parcela.count(),
    prisma.monitoramentoFicha.count(),
    prisma.monitoramentoCotaSolidariedade.count(),
  ]);

  console.log('Registros atuais:');
  console.log(`  Processos:                 ${processos}`);
  console.log(`  SQLs:                      ${sqls}`);
  console.log(`  Parcelas:                  ${parcelas}`);
  console.log(`  Fichas monitoramento:      ${fichas}`);
  console.log(`  Fichas cota solidariedade: ${cotas}`);

  if (processos === 0) {
    console.log('\nNada a apagar.');
    return;
  }

  if (dryRun) {
    console.log('\n(dry-run) Nenhum dado foi apagado.');
    return;
  }

  const resposta = await pergunta(`\nApagar ${processos} processo(s) e todos os dados relacionados? (s/N) `);
  if (resposta.trim().toLowerCase() !== 's') {
    console.log('Operação cancelada.');
    return;
  }

  const resultado = await prisma.processo.deleteMany();
  console.log(`\n${resultado.count} processo(s) apagado(s) com dependências em cascata.`);
}

main()
  .catch((error) => {
    console.error('Falha ao limpar processos:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
