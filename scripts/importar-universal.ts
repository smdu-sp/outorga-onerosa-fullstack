import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { lerPlanilhaUniversal } from '../lib/importador-universal';
import { reconciliarParcelas } from '../lib/server/importador-universal';

async function main() {
  const args = process.argv.slice(2);
  const aplicar = args.includes('--aplicar');
  const arquivos = args.filter(a => !a.startsWith('--'));
  if (!arquivos.length) throw new Error('Informe caminhos de arquivos .xlsx ou .xlsm. Use --aplicar para reconciliar o banco.');
  const hoje = new Date(`${new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())}T00:00:00Z`);
  const leituras = arquivos.map(f => lerPlanilhaUniversal(XLSX.readFile(f),path.basename(f),hoje));
  const output = path.resolve('scripts/output', `importacao-universal-${Date.now()}`);
  fs.mkdirSync(output,{recursive:true});
  const salvar = (nome: string, valor: unknown) => fs.writeFileSync(path.join(output,nome),JSON.stringify(valor,null,2));
  salvar('planilhas.json',leituras);
  const db = new PrismaClient();
  try {
    const linhas = leituras.flatMap(l => l.linhas);
    const previa = await reconciliarParcelas(db,linhas);
    salvar('auditoria.json',previa);
    const auditoria = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(auditoria,XLSX.utils.json_to_sheet(linhas.map(l => ({
      processo:l.num_processo, obrigacao:l.obrigacao, parcela:l.num_parcela, valor:l.valor,
      vencimento:l.vencimento.toISOString().slice(0,10), pagamento:l.data_quitacao?.toISOString().slice(0,10) ?? '',
      ano_pagamento:l.ano_pagamento, quitada:l.status_quitacao, quebra:l.quebra, pagamento_confiavel:l.pagamentoConfiavel,fonte:l.fonte,
    }))), 'Parcelas');
    XLSX.utils.book_append_sheet(auditoria,XLSX.utils.json_to_sheet([...leituras.flatMap(l => l.pendencias),...previa.pendencias]),'Pendencias');
    XLSX.utils.book_append_sheet(auditoria,XLSX.utils.json_to_sheet(previa.processosAusentes.map(processo => ({processo}))),'Processos ausentes');
    XLSX.writeFile(auditoria,path.join(output,'auditoria-parcelas.xlsx'));
    if (aplicar) {
      // Snapshot completo dos processos afetados antes da primeira alteração.
      const numeros = [...new Set(linhas.map(l => l.num_processo))];
      salvar('backup.json',await db.processo.findMany({where:{num_processo:{in:numeros}},include:{parcelas:true}}));
      salvar('aplicacao.json',await reconciliarParcelas(db,linhas,true));
      salvar('verificacao.json',await reconciliarParcelas(db,linhas));
    }
    console.log(JSON.stringify({output, processosAusentes:previa.processosAusentes.length, parcelasNovas:previa.parcelasNovas,valoresCorrigidos:previa.valoresCorrigidos,pendencias:previa.pendencias.length + leituras.reduce((s,l) => s+l.pendencias.length,0),aplicar}));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Falha na importação'); process.exitCode = 1; });
