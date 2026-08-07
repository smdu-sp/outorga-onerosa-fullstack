/**
 * Backfill de `MonitoramentoEnquadramentoUrbanistico.tipologia_uso_oodc`
 * a partir das categorias de uso do BI (`dbo.prata_categoria`, Aprova Digital),
 * com fallback de normalização do texto já gravado na planilha/GeoSampa.
 *
 * Domínio canônico dos relatórios: `R` | `nR` | `R/nR`.
 *
 * Alvos (sem `--force`): vazios OU valores não canônicos (`HMP/R2v/nR1`, `R2v-02`…).
 * Com `--force`: tenta BI (e normalização) em todos os enquadramentos.
 *
 * Prioridade da fonte:
 *   1) categorias do BI → classificarTipologiaUsoDeCategorias
 *   2) normalizarTipologiaUsoOodc(valor atual)
 *
 * Uso:
 *   npx tsx prisma/backfill-tipologia-uso-bi.ts
 *   npx tsx prisma/backfill-tipologia-uso-bi.ts --dry-run
 *   npx tsx prisma/backfill-tipologia-uso-bi.ts --force
 *   npx tsx prisma/backfill-tipologia-uso-bi.ts --limit 50 --delay 100
 *   npx tsx prisma/backfill-tipologia-uso-bi.ts --processo 6075.2024/0000123-0
 *   npm run db:backfill-tipologia-uso-bi
 */

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import {
	buscarCategoriasPorProcessoNoBi,
	classificarTipologiaUsoDeCategorias,
	ehTipologiaUsoCanonica,
	normalizarTipologiaUsoOodc,
} from '../lib/server/bi-categoria';

type Status =
	| 'atualizado_bi'
	| 'atualizado_local'
	| 'ja_canonico'
	| 'sem_fonte'
	| 'sem_enquadramento'
	| 'erro';

type Linha = {
	num_processo: string;
	status: Status;
	antes?: string | null;
	depois?: string;
	detalhe?: string;
};

function parseArgs() {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const force = args.includes('--force');

	const readNum = (flag: string, def?: number) => {
		const idx = args.indexOf(flag);
		if (idx === -1) return def;
		const raw = args[idx + 1];
		if (!raw || raw.startsWith('--')) return def;
		const n = Number.parseInt(raw, 10);
		return Number.isFinite(n) ? n : def;
	};

	const readStr = (flag: string) => {
		const idx = args.indexOf(flag);
		if (idx === -1) return undefined;
		const raw = args[idx + 1];
		return raw && !raw.startsWith('--') ? raw : undefined;
	};

	return {
		dryRun,
		force,
		limit: readNum('--limit'),
		delay: readNum('--delay', 100)!,
		processo: readStr('--processo'),
	};
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
	const { dryRun, force, limit, delay, processo } = parseArgs();

	console.log('=== Backfill tipologia_uso_oodc ← BI (+ normalização local) ===');
	console.log(`  dry-run=${dryRun}  force=${force}  limit=${limit ?? '∞'}  delay=${delay}ms`);
	if (processo) console.log(`  processo=${processo}`);

	// Pré-filtra no banco os não canônicos (exceto --force / --processo).
	const alvos = force || processo
		? null
		: await prisma.monitoramentoEnquadramentoUrbanistico.findMany({
				where: {
					OR: [
						{ tipologia_uso_oodc: null },
						{ tipologia_uso_oodc: '' },
						{ NOT: { tipologia_uso_oodc: { in: ['R', 'nR', 'R/nR'] } } },
					],
				},
				select: { ficha: { select: { processo_id: true } } },
			});
	const idsAlvo = alvos ? [...new Set(alvos.map((a) => a.ficha.processo_id))] : null;
	if (idsAlvo) console.log(`Alvos não canônicos: ${idsAlvo.length}`);

	const processos = await prisma.processo.findMany({
		where: processo
			? { num_processo: processo }
			: idsAlvo
				? { id: { in: idsAlvo } }
				: undefined,
		select: {
			id: true,
			num_processo: true,
			monitoramento: {
				select: {
					id: true,
					enquadramento_urbanistico: {
						select: { id: true, tipologia_uso_oodc: true },
					},
				},
			},
		},
		orderBy: { num_processo: 'asc' },
		...(limit != null ? { take: limit } : {}),
	});

	console.log(`Processos carregados: ${processos.length}`);

	const stats = {
		atualizadoBi: 0,
		atualizadoLocal: 0,
		jaCanonico: 0,
		semFonte: 0,
		semEnquadramento: 0,
		erros: 0,
	};
	const linhas: Linha[] = [];

	for (let i = 0; i < processos.length; i++) {
		const p = processos[i]!;
		const prefix = `[${i + 1}/${processos.length}] ${p.num_processo}`;
		const enq = p.monitoramento?.enquadramento_urbanistico;

		if (!enq) {
			stats.semEnquadramento++;
			linhas.push({ num_processo: p.num_processo, status: 'sem_enquadramento' });
			continue;
		}

		const antes = enq.tipologia_uso_oodc?.trim() || null;
		if (!force && ehTipologiaUsoCanonica(antes)) {
			stats.jaCanonico++;
			linhas.push({
				num_processo: p.num_processo,
				status: 'ja_canonico',
				antes,
			});
			continue;
		}

		try {
			const cats = await buscarCategoriasPorProcessoNoBi(p.num_processo);
			const doBi = classificarTipologiaUsoDeCategorias(cats);
			const doLocal = normalizarTipologiaUsoOodc(antes);

			// Une BI + texto local (ex.: planilha R2v/nR1 + BI só R → R/nR).
			const usos = new Set<'R' | 'nR'>();
			for (const src of [doBi, doLocal]) {
				if (src === 'R/nR') {
					usos.add('R');
					usos.add('nR');
				} else if (src === 'R' || src === 'nR') {
					usos.add(src);
				}
			}
			const depois =
				usos.has('R') && usos.has('nR')
					? 'R/nR'
					: usos.has('R')
						? 'R'
						: usos.has('nR')
							? 'nR'
							: null;
			const origem: 'bi' | 'local' | 'bi+local' | null = !depois
				? null
				: doBi && doLocal
					? 'bi+local'
					: doBi
						? 'bi'
						: 'local';

			if (!depois || !origem) {
				stats.semFonte++;
				linhas.push({
					num_processo: p.num_processo,
					status: 'sem_fonte',
					antes,
				});
				console.log(`${prefix} — sem fonte (antes=${antes ?? '∅'})`);
			} else if (depois === antes) {
				stats.jaCanonico++;
				linhas.push({
					num_processo: p.num_processo,
					status: 'ja_canonico',
					antes,
					depois,
				});
			} else if (dryRun) {
				if (origem === 'local') stats.atualizadoLocal++;
				else stats.atualizadoBi++;
				linhas.push({
					num_processo: p.num_processo,
					status: origem === 'local' ? 'atualizado_local' : 'atualizado_bi',
					antes,
					depois,
					detalhe: `dry-run (${origem})`,
				});
				console.log(`${prefix} — dry-run (${origem}) ${antes ?? '∅'} → ${depois}`);
			} else {
				await prisma.monitoramentoEnquadramentoUrbanistico.update({
					where: { id: enq.id },
					data: { tipologia_uso_oodc: depois },
				});
				if (origem === 'local') stats.atualizadoLocal++;
				else stats.atualizadoBi++;
				linhas.push({
					num_processo: p.num_processo,
					status: origem === 'local' ? 'atualizado_local' : 'atualizado_bi',
					antes,
					depois,
					detalhe: origem,
				});
				console.log(`${prefix} — ${origem} ${antes ?? '∅'} → ${depois}`);
			}
		} catch (e) {
			stats.erros++;
			const msg = e instanceof Error ? e.message : String(e);
			linhas.push({
				num_processo: p.num_processo,
				status: 'erro',
				antes,
				detalhe: msg,
			});
			console.error(`${prefix} — ERRO: ${msg}`);
		}

		if (delay > 0 && i < processos.length - 1) await sleep(delay);
	}

	console.log('\n=== Resumo ===');
	console.log(`Atualizados via BI:       ${stats.atualizadoBi}`);
	console.log(`Atualizados via local:    ${stats.atualizadoLocal}`);
	console.log(`Já canônicos:             ${stats.jaCanonico}`);
	console.log(`Sem fonte:                ${stats.semFonte}`);
	console.log(`Sem enquadramento:        ${stats.semEnquadramento}`);
	console.log(`Erros:                    ${stats.erros}`);

	const outDir = path.join(process.cwd(), 'tmp');
	fs.mkdirSync(outDir, { recursive: true });
	const outFile = path.join(
		outDir,
		`backfill-tipologia-uso-bi-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
	);
	fs.writeFileSync(outFile, JSON.stringify({ dryRun, force, stats, linhas }, null, 2));
	console.log(`Log: ${outFile}`);
}

main()
	.then(async () => {
		await prisma.$disconnect();
		process.exit(0);
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
