/**
 * Backfill de `Processo.origem` a partir de `dbo.prata_processo.sistema` (BI).
 *
 * Percorre todos os processos locais, localiza o mesmo número no BI (com
 * normalização de formatação) e **substitui** a origem pelo valor mapeado:
 *   AprovaDigital → APROVA_DIGITAL
 *   Portal        → PORTAL
 *   Sisacoe       → SISACOE
 *   SLCe          → SLCE
 *
 * Também atualiza `MonitoramentoSituacao.origem` quando o mapeamento cabe no
 * enum de monitoramento (SISACOE / SEI / APROVA_DIGITAL).
 *
 * Uso:
 *   npx tsx prisma/backfill-origem-sistema-bi.ts
 *   npx tsx prisma/backfill-origem-sistema-bi.ts --dry-run
 *   npx tsx prisma/backfill-origem-sistema-bi.ts --limit 50
 *   npm run db:backfill-origem-sistema-bi
 */

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import {
	buscarSistemasNoBiPorProcessos,
	mapearSistemaBiParaOrigem,
} from '../lib/server/bi-processo';

type Linha = {
	num_processo: string;
	antes: string | null;
	depois: string | null;
	sistemaBi: string | null;
	processoBi: string | null;
	status: 'atualizado' | 'igual' | 'sem_bi' | 'sem_mapeamento' | 'erro';
	detalhe?: string;
};

function parseArgs() {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const idx = args.indexOf('--limit');
	let limit: number | undefined;
	if (idx !== -1) {
		const n = Number.parseInt(args[idx + 1] ?? '', 10);
		if (Number.isFinite(n)) limit = n;
	}
	return { dryRun, limit };
}

function mapearMonitoramento(
	sistemaBi: string,
): 'SISACOE' | 'SEI' | 'APROVA_DIGITAL' | null {
	const s = sistemaBi.trim().toLowerCase();
	if (s === 'sisacoe') return 'SISACOE';
	if (s === 'aprovadigital' || s.includes('aprova')) return 'APROVA_DIGITAL';
	if (s === 'sei') return 'SEI';
	return null;
}

async function main() {
	const { dryRun, limit } = parseArgs();
	console.log('=== Backfill Processo.origem ← dbo.prata_processo.sistema ===');
	console.log(`  dry-run=${dryRun}  limit=${limit ?? '∞'}`);

	const processos = await prisma.processo.findMany({
		select: {
			id: true,
			num_processo: true,
			origem: true,
			monitoramento: {
				select: {
					id: true,
					situacao: { select: { id: true, origem: true } },
				},
			},
		},
		orderBy: { num_processo: 'asc' },
		...(limit != null ? { take: limit } : {}),
	});

	console.log(`Processos locais: ${processos.length}`);

	const mapaBi = await buscarSistemasNoBiPorProcessos(
		processos.map((p) => p.num_processo),
	);
	console.log(`Encontrados no BI: ${mapaBi.size} (por dígitos únicos)`);

	const stats = {
		atualizado: 0,
		igual: 0,
		semBi: 0,
		semMapeamento: 0,
		erros: 0,
		monitoramento: 0,
	};
	const linhas: Linha[] = [];

	for (let i = 0; i < processos.length; i++) {
		const p = processos[i]!;
		const digits = p.num_processo.replace(/\D/g, '');
		const hit = mapaBi.get(digits);
		const prefix = `[${i + 1}/${processos.length}] ${p.num_processo}`;

		if (!hit) {
			stats.semBi++;
			linhas.push({
				num_processo: p.num_processo,
				antes: p.origem,
				depois: null,
				sistemaBi: null,
				processoBi: null,
				status: 'sem_bi',
			});
			continue;
		}

		const depois = mapearSistemaBiParaOrigem(hit.sistema);
		if (!depois) {
			stats.semMapeamento++;
			linhas.push({
				num_processo: p.num_processo,
				antes: p.origem,
				depois: null,
				sistemaBi: hit.sistema,
				processoBi: hit.processoBi,
				status: 'sem_mapeamento',
				detalhe: `sistema BI não mapeado: ${hit.sistema}`,
			});
			console.log(`${prefix} — sem mapeamento (${hit.sistema})`);
			continue;
		}

		if (p.origem === depois) {
			stats.igual++;
			linhas.push({
				num_processo: p.num_processo,
				antes: p.origem,
				depois,
				sistemaBi: hit.sistema,
				processoBi: hit.processoBi,
				status: 'igual',
			});
		} else if (dryRun) {
			stats.atualizado++;
			linhas.push({
				num_processo: p.num_processo,
				antes: p.origem,
				depois,
				sistemaBi: hit.sistema,
				processoBi: hit.processoBi,
				status: 'atualizado',
				detalhe: 'dry-run',
			});
			if (stats.atualizado <= 30 || stats.atualizado % 100 === 0) {
				console.log(
					`${prefix} — dry-run ${p.origem ?? '∅'} → ${depois} (${hit.sistema})`,
				);
			}
		} else {
			try {
				await prisma.$executeRawUnsafe(
					`UPDATE processos SET origem = ? WHERE id = ?`,
					depois,
					p.id,
				);

				const monOrigem = mapearMonitoramento(hit.sistema);
				const situacaoId = p.monitoramento?.situacao?.id;
				if (
					monOrigem &&
					situacaoId &&
					p.monitoramento?.situacao?.origem !== monOrigem
				) {
					await prisma.$executeRawUnsafe(
						`UPDATE monitoramento_situacao SET origem = ? WHERE id = ?`,
						monOrigem,
						situacaoId,
					);
					stats.monitoramento++;
				}

				stats.atualizado++;
				linhas.push({
					num_processo: p.num_processo,
					antes: p.origem,
					depois,
					sistemaBi: hit.sistema,
					processoBi: hit.processoBi,
					status: 'atualizado',
				});
				if (stats.atualizado <= 30 || stats.atualizado % 100 === 0) {
					console.log(
						`${prefix} — ${p.origem ?? '∅'} → ${depois} (${hit.sistema})`,
					);
				}
			} catch (e) {
				stats.erros++;
				linhas.push({
					num_processo: p.num_processo,
					antes: p.origem,
					depois,
					sistemaBi: hit.sistema,
					processoBi: hit.processoBi,
					status: 'erro',
					detalhe: e instanceof Error ? e.message : String(e),
				});
				console.error(`${prefix} — erro`, e);
			}
		}
	}

	console.log('\n=== Resumo ===');
	console.log(`  atualizado:      ${stats.atualizado}`);
	console.log(`  já igual:        ${stats.igual}`);
	console.log(`  sem BI:          ${stats.semBi}`);
	console.log(`  sem mapeamento:  ${stats.semMapeamento}`);
	console.log(`  erros:           ${stats.erros}`);
	console.log(`  monit. origem:   ${stats.monitoramento}`);

	const outDir = path.join(process.cwd(), 'prisma', 'out');
	fs.mkdirSync(outDir, { recursive: true });
	const outFile = path.join(
		outDir,
		`backfill-origem-sistema-bi${dryRun ? '-dry' : ''}-${Date.now()}.json`,
	);
	fs.writeFileSync(outFile, JSON.stringify({ stats, linhas }, null, 2));
	console.log(`\nLog: ${outFile}`);
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
