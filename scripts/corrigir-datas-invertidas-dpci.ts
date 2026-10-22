/**
 * Aplica correções de datas com dia/mês invertidos (células mm-dd-yy nas planilhas base:
 * datas digitadas dd/mm com dia <= 12 foram lidas pelo Excel como mês/dia).
 *
 * Entrada: JSON gerado pela auditoria — [{ id, chave, vencimento?, data_quitacao?, motivo }]
 * (datas em ISO yyyy-mm-dd). Recalcula `antecipada` e `ano_pagamento` de cada parcela.
 *
 * Uso:
 *   npx tsx scripts/corrigir-datas-invertidas-dpci.ts <correcoes.json>                       # prévia
 *   npx tsx scripts/corrigir-datas-invertidas-dpci.ts --aplicar <correcoes.json> <backup.json> # grava
 */
import * as fs from 'node:fs';
import { prisma } from '../lib/prisma';
import { classificarAntecipacao } from '../lib/antecipacao';

interface Correcao {
  id: string;
  chave: string;
  vencimento?: string;
  data_quitacao?: string;
  motivo: string;
}

const iso = (x: Date | null) => x?.toISOString().slice(0, 10) ?? '—';
const civil = (s: string) => new Date(`${s}T00:00:00Z`);

async function main() {
  const args = process.argv.slice(2);
  const aplicar = args.includes('--aplicar');
  const [entrada, backupPath] = args.filter((a) => a.endsWith('.json'));
  if (!entrada || (aplicar && !backupPath)) throw new Error('Informe o JSON de correções (e o de backup com --aplicar).');
  const correcoes: Correcao[] = JSON.parse(fs.readFileSync(entrada, 'utf-8'));

  const atuais = await prisma.parcela.findMany({ where: { id: { in: correcoes.map((c) => c.id) } } });
  const porId = new Map(atuais.map((p) => [p.id, p]));
  const updates = [];
  for (const c of correcoes) {
    const p = porId.get(c.id);
    if (!p) throw new Error(`Parcela não encontrada: ${c.id} (${c.chave})`);
    const vencimento = c.vencimento ? civil(c.vencimento) : p.vencimento;
    const dataQuitacao = c.data_quitacao ? civil(c.data_quitacao) : p.data_quitacao;
    const antecipada = classificarAntecipacao(vencimento, dataQuitacao).antecipada;
    const anoPagamento = dataQuitacao ? dataQuitacao.getUTCFullYear() : p.ano_pagamento;
    console.log(
      `${c.chave.padEnd(30)} venc ${iso(p.vencimento)} → ${iso(vencimento)} | pag ${iso(p.data_quitacao)} → ${iso(dataQuitacao)} | antecipada ${p.antecipada} → ${antecipada}`,
    );
    updates.push({ p, data: { vencimento, data_quitacao: dataQuitacao, antecipada, ano_pagamento: anoPagamento } });
  }

  if (!aplicar) {
    console.log(`\nPRÉVIA — ${updates.length} parcelas, nada gravado. Rode com --aplicar.`);
    return;
  }
  fs.writeFileSync(backupPath, JSON.stringify(updates.map((u) => u.p), null, 2));
  await prisma.$transaction(updates.map((u) => prisma.parcela.update({ where: { id: u.p.id }, data: u.data })));
  console.log(`\nAPLICADO: ${updates.length} parcelas. Backup: ${backupPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
