/**
 * Cria a parcela de ENTRADA (50%) da Cota de Solidariedade nos processos cujo plano
 * de Cota tem só parcelas iguais — a planilha de controle antiga registrou só o
 * saldo parcelado (ver memória "cota-entrada-50" / tela /dev-cota-solidariedade).
 *
 * Regras (decididas com a DEUSO/usuário em 22/10/2026):
 *   - valor      = soma das parcelas do saldo (o saldo é os outros 50%)
 *   - nº         = maior nº de parcela COTA do processo + 1 (convenção das planilhas 2025/26)
 *   - vencimento = 90 dias antes do 1º vencimento do saldo
 *   - quitada    = se ALGUMA parcela do saldo está quitada (a entrada é paga antes do
 *                  saldo), sem data de pagamento; senão fica pendente
 *
 * Idempotente: processos que já têm entrada não entram (padrão deixa de ser "iguais").
 * O import de planilhas apaga e recria as parcelas — rodar de novo depois de reimportar.
 *
 *   npx tsx prisma/backfill-entrada-cota.ts            # dry-run
 *   npx tsx prisma/backfill-entrada-cota.ts --apply    # grava + backup p/ rollback
 *   npx tsx prisma/backfill-entrada-cota.ts --rollback prisma/backups/<arquivo>.json
 *
 * @format
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { recalcularStatusPagamento } from '@/lib/parcelas-utils';
import { processosCota } from '@/lib/server/cota-parcelas';
import { atualizarValorTotalParcelas } from '@/lib/server/processos';

const DIAS_ANTES_DO_SALDO = 90;
const MS_DIA = 86_400_000;

async function recalcularProcesso(processoId: string) {
	const parcelas = await prisma.parcela.findMany({ where: { processo_id: processoId } });
	await prisma.processo.update({
		where: { id: processoId },
		data: { status_pagamento: recalcularStatusPagamento(parcelas) },
	});
	await atualizarValorTotalParcelas(processoId);
}

async function rollback(arquivo: string) {
	const { parcelas } = JSON.parse(fs.readFileSync(arquivo, 'utf-8')) as {
		parcelas: { id: string; processoId: string }[];
	};
	const { count } = await prisma.parcela.deleteMany({ where: { id: { in: parcelas.map((p) => p.id) } } });
	for (const id of new Set(parcelas.map((p) => p.processoId))) await recalcularProcesso(id);
	console.log(`Rollback: ${count} parcela(s) de entrada removida(s).`);
}

async function main() {
	const args = process.argv.slice(2);
	const iRollback = args.indexOf('--rollback');
	if (iRollback >= 0) return rollback(args[iRollback + 1]);
	const aplicar = args.includes('--apply');

	const { processos } = await processosCota({ padrao: 'IGUAIS' });
	const planos = await Promise.all(
		processos.map(async (p) => {
			const saldo = await prisma.parcela.findMany({
				where: { processo_id: p.processoId, obrigacao: 'COTA' },
				orderBy: { vencimento: 'asc' },
			});
			const valor = Math.round(saldo.reduce((s, x) => s + x.valor, 0) * 100) / 100;
			const quitada = saldo.some((x) => x.status_quitacao);
			return {
				processoId: p.processoId,
				numProcesso: p.numProcesso,
				num_parcela: Math.max(...saldo.map((x) => x.num_parcela)) + 1,
				valor,
				vencimento: new Date(saldo[0].vencimento.getTime() - DIAS_ANTES_DO_SALDO * MS_DIA),
				quitada,
			};
		}),
	);

	const quitadas = planos.filter((p) => p.quitada);
	const soma = (xs: typeof planos) => xs.reduce((s, p) => s + p.valor, 0);
	const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	console.log(`${planos.length} processo(s) só com parcelas iguais de Cota.`);
	console.log(`  entradas quitadas (alguma parcela do saldo paga): ${quitadas.length} · ${brl(soma(quitadas))}`);
	console.log(`  entradas pendentes:                  ${planos.length - quitadas.length} · ${brl(soma(planos) - soma(quitadas))}`);
	for (const p of planos.slice(0, 5))
		console.log(
			`  ex.: ${p.numProcesso} parc ${p.num_parcela} ${brl(p.valor)} venc ${p.vencimento.toISOString().slice(0, 10)} ${p.quitada ? 'quitada' : 'pendente'}`,
		);

	if (!aplicar) {
		console.log('\nDry-run — nada gravado. Use --apply para gravar.');
		return;
	}

	const criadas: { id: string; processoId: string; numProcesso: string }[] = [];
	for (const p of planos) {
		const nova = await prisma.parcela.create({
			data: {
				processo_id: p.processoId,
				obrigacao: 'COTA',
				num_parcela: p.num_parcela,
				valor: p.valor,
				vencimento: p.vencimento,
				status_quitacao: p.quitada,
			},
			select: { id: true },
		});
		criadas.push({ id: nova.id, processoId: p.processoId, numProcesso: p.numProcesso });
		await recalcularProcesso(p.processoId);
	}

	const dir = path.join(__dirname, 'backups');
	fs.mkdirSync(dir, { recursive: true });
	const arquivo = path.join(dir, `entrada-cota-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
	fs.writeFileSync(arquivo, JSON.stringify({ criadoEm: new Date().toISOString(), parcelas: criadas }, null, 2));
	console.log(`\n${criadas.length} entrada(s) criada(s). Rollback: --rollback ${path.relative(process.cwd(), arquivo)}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
