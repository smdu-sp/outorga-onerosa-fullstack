import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.processo.count();
  const semMon = await prisma.processo.count({ where: { monitoramento: null } });
  const semLote = await prisma.processo.count({
    where: {
      OR: [
        { monitoramento: null },
        { monitoramento: { localizacao_lote: null } },
        { monitoramento: { localizacao_lote: { lote_cadastrado: null } } },
      ],
    },
  });
  const semSql = await prisma.processo.count({ where: { sql_incra: null } });
  const semInt = await prisma.processo.count({ where: { interessado: null } });
  console.log({ total, semMon, semLote, semSql, semInt });
}
main().finally(() => prisma.$disconnect());
