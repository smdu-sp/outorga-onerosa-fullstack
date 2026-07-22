/**
 * Normalização in-place dos campos monetários/área que eram armazenados como
 * texto BR ("1.234,56", "R$ ...", "-") e vão virar `Decimal` no schema.
 *
 * Fase 1 da migração String→Decimal: reescreve cada valor no formato canônico
 * `1234.56` (ponto decimal, sem separador de milhar) ou `NULL`, para o
 * `MODIFY COLUMN ... DECIMAL` do MySQL castar sem erro. NÃO altera o tipo da
 * coluna — isso é feito depois via `prisma migrate` (fase 2).
 *
 * Também reporta min/max de cada campo, para dimensionar a precisão do Decimal
 * com base nos dados reais antes de editar o schema.
 *
 * Uso: npx tsx prisma/normalizar-valores-monetarios.ts [--dry]
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { paraTextoDecimal, parseNumeroBr } from '../lib/parse-numero-br';

const DRY = process.argv.includes('--dry');

const CAMPOS_CALCULO = [
	'fp_uso_r',
	'fp_uso_nr',
	'fs_uso_r',
	'fs_uso_nr',
	'area_objeto_uso_r',
	'area_objeto_uso_nr',
	'area_total_objeto',
	'percentual_fachada_ativa',
	'contrapartida_uso_r',
	'contrapartida_uso_nr',
	'contrapartida_total',
] as const;

const CAMPOS_COTA = ['valor_pago', 'valor_devido'] as const;

type Stat = { nulos: number; numeros: number; alterados: number; min: number; max: number };

function novaStat(): Stat {
	return { nulos: 0, numeros: 0, alterados: 0, min: Infinity, max: -Infinity };
}

function registrar(stat: Stat, original: string | null, canonico: string | null) {
	if (canonico === null) stat.nulos++;
	else {
		stat.numeros++;
		const n = Number(canonico);
		if (n < stat.min) stat.min = n;
		if (n > stat.max) stat.max = n;
	}
	if ((original ?? null) !== canonico) stat.alterados++;
}

async function chunked<T>(itens: T[], tamanho: number, fn: (lote: T[]) => Promise<void>) {
	for (let i = 0; i < itens.length; i += tamanho) {
		await fn(itens.slice(i, i + tamanho));
	}
}

async function normalizarTabela(
	nome: string,
	rows: Array<Record<string, unknown> & { id: string }>,
	campos: readonly string[],
	update: (id: string, data: Record<string, string | null>) => Prisma.PrismaPromise<unknown>,
) {
	const stats = new Map<string, Stat>(campos.map((c) => [c, novaStat()]));
	const updates: Array<{ id: string; data: Record<string, string | null> }> = [];

	for (const row of rows) {
		const data: Record<string, string | null> = {};
		let mudou = false;
		for (const campo of campos) {
			const original = (row[campo] ?? null) as string | null;
			const canonico = paraTextoDecimal(original);
			registrar(stats.get(campo)!, original, canonico);
			if ((original ?? null) !== canonico) {
				data[campo] = canonico;
				mudou = true;
			}
		}
		if (mudou) updates.push({ id: row.id, data });
	}

	console.log(`\n===== ${nome} (${rows.length} linhas) =====`);
	for (const [campo, s] of stats) {
		const faixa = s.numeros ? `min=${s.min} max=${s.max}` : '—';
		console.log(
			`  ${campo.padEnd(26)} num=${s.numeros} nulo=${s.nulos} alterados=${s.alterados} | ${faixa}`,
		);
	}

	if (DRY) {
		console.log(`  [dry-run] ${updates.length} linhas seriam atualizadas.`);
		return;
	}

	await chunked(updates, 50, async (lote) => {
		await prisma.$transaction(lote.map((u) => update(u.id, u.data)));
	});
	console.log(`  ${updates.length} linhas atualizadas.`);
}

async function main() {
	// Validação leve: garante que nenhum valor "numérico" seria perdido por não
	// casar com o parser (ex.: formato inesperado que vira null indevidamente).
	const suspeitos: string[] = [];

	const calc = await prisma.monitoramentoCalculoOutorga.findMany({
		select: {
			id: true,
			fp_uso_r: true,
			fp_uso_nr: true,
			fs_uso_r: true,
			fs_uso_nr: true,
			area_objeto_uso_r: true,
			area_objeto_uso_nr: true,
			area_total_objeto: true,
			percentual_fachada_ativa: true,
			contrapartida_uso_r: true,
			contrapartida_uso_nr: true,
			contrapartida_total: true,
		},
	});
	const cota = await prisma.monitoramentoCotaSolidariedade.findMany({
		select: { id: true, valor_pago: true, valor_devido: true },
	});

	for (const row of [...calc, ...cota]) {
		for (const [campo, valor] of Object.entries(row)) {
			if (campo === 'id' || valor == null) continue;
			const texto = String(valor).trim();
			if (texto && texto !== '-' && parseNumeroBr(texto) === undefined) {
				suspeitos.push(`${campo}="${texto}"`);
			}
		}
	}

	await normalizarTabela('monitoramento_calculo_outorga', calc, CAMPOS_CALCULO, (id, data) =>
		prisma.monitoramentoCalculoOutorga.update({
			where: { id },
			data: data as Prisma.MonitoramentoCalculoOutorgaUncheckedUpdateInput,
		}),
	);
	await normalizarTabela('monitoramento_cota_solidariedade', cota, CAMPOS_COTA, (id, data) =>
		prisma.monitoramentoCotaSolidariedade.update({
			where: { id },
			data: data as Prisma.MonitoramentoCotaSolidariedadeUncheckedUpdateInput,
		}),
	);

	if (suspeitos.length) {
		console.log(`\n⚠️  ${suspeitos.length} valores não-numéricos viraram NULL (revisar):`);
		console.log('  ' + [...new Set(suspeitos)].slice(0, 40).join('\n  '));
	} else {
		console.log('\n✓ Nenhum valor numérico perdido na conversão.');
	}
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error('ERRO:', e);
		process.exit(1);
	});
