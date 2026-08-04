/**
 * Backfill BI → SQL → GeoSampa para processos sem lote_cadastrado.
 *
 * Fluxo (todos os processos):
 *   1) BI dbo.cadastros → SQL_Incra
 *   2) Se achou SQL → GeoSampa WFS pelo SQL (lote completo + zoneamento)
 *   3) Senão / SQL sem lote no WFS → camada outorga_onerosa pelo nº do processo
 *
 * Grava ficha de monitoramento + Processo.sql_incra / sql_formatado / interessado
 * (somente campos ainda vazios).
 *
 * Uso:
 *   npx tsx scripts/atualizar-processos-sem-dados.ts
 *   npx tsx scripts/atualizar-processos-sem-dados.ts --dry-run
 *   npx tsx scripts/atualizar-processos-sem-dados.ts --limit 50 --delay 1000
 *   npx tsx scripts/atualizar-processos-sem-dados.ts --processo 1020.2021/0007944-0
 *   npm run db:atualizar-processos
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseDataCivil } from '@/lib/datas';
import {
	mapGeoSampaParaMonitoramento,
	type GeoSampaMonitoramentoPayload,
} from '@/lib/enquadramento-persistencia';
import { prisma } from '@/lib/prisma';
import {
	consultarGeoSampa,
	consultarProcessoNoWfs,
	GeoSampaConsultaError,
} from '@/lib/server/geosampa';
import { buscarSqlPorProcessoNoBi } from '@/lib/server/bi-cadastro';
import {
	IncidenciaCotaSolidariedade,
	OrigemMonitoramento,
	Prisma,
	SituacaoMonitoramento,
	TipoLicencaMonitoramento,
} from '@prisma/client';

type StatusResultado =
	| 'atualizado_sql'
	| 'atualizado_outorga'
	| 'sem_sql_bi'
	| 'nao_encontrado_wfs'
	| 'erro';

type LinhaResultado = {
	num_processo: string;
	status: StatusResultado;
	sql?: string;
	detalhe?: string;
};

type Stats = {
	total: number;
	atualizadosSql: number;
	atualizadosOutorga: number;
	semSqlNoBi: number;
	naoEncontradoWfs: number;
	erros: number;
};

type ResultadoProcesso =
	| { status: 'atualizado_sql'; sql: string }
	| { status: 'atualizado_outorga' }
	| { status: 'sem_sql_bi' }
	| { status: 'nao_encontrado_wfs' };

function parseArgs() {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');

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
		limit: readNum('--limit'),
		delay: readNum('--delay', 1000)!,
		processo: readStr('--processo'),
	};
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function aplicarPayloadUpsert(
	tx: Prisma.TransactionClient,
	fichaId: string,
	payload: GeoSampaMonitoramentoPayload,
) {
	const {
		coordenada,
		localizacao_lote,
		enderecos,
		enquadramento_urbanistico,
		subcategorias_uso,
		calculo_outorga,
		situacao,
		licencas,
		anotacoes_deuso,
		...dadosFicha
	} = payload;

	if (Object.keys(dadosFicha).length > 0) {
		await tx.monitoramentoFicha.update({ where: { id: fichaId }, data: dadosFicha });
	}

	if (coordenada) {
		await tx.monitoramentoCoordenada.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...coordenada },
			update: coordenada,
		});
	}

	if (localizacao_lote) {
		await tx.monitoramentoLocalizacaoLote.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...localizacao_lote },
			update: localizacao_lote,
		});
	}

	if (enquadramento_urbanistico) {
		await tx.monitoramentoEnquadramentoUrbanistico.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...enquadramento_urbanistico },
			update: enquadramento_urbanistico,
		});
	}

	if (subcategorias_uso) {
		await tx.monitoramentoSubcategoriaUso.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...subcategorias_uso },
			update: subcategorias_uso,
		});
	}

	if (calculo_outorga) {
		await tx.monitoramentoCalculoOutorga.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...calculo_outorga },
			update: calculo_outorga,
		});
	}

	if (situacao) {
		const s = {
			incidencia_cota_solidariedade: situacao.incidencia_cota_solidariedade as
				| IncidenciaCotaSolidariedade
				| undefined,
			situacao: situacao.situacao as SituacaoMonitoramento | undefined,
			origem: situacao.origem as OrigemMonitoramento | undefined,
		};
		await tx.monitoramentoSituacao.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...s },
			update: s,
		});
	}

	if (anotacoes_deuso) {
		const d = {
			...anotacoes_deuso,
			data_informacao_dmus: anotacoes_deuso.data_informacao_dmus
				? parseDataCivil(anotacoes_deuso.data_informacao_dmus)
				: undefined,
		};
		await tx.monitoramentoAnotacaoDeuso.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...d },
			update: d,
		});
	}

	if (enderecos?.length) {
		await tx.monitoramentoEndereco.deleteMany({ where: { monitoramento_ficha_id: fichaId } });
		await tx.monitoramentoEndereco.createMany({
			data: enderecos.map((e, i) => ({
				...e,
				ordem: e.ordem || i + 1,
				monitoramento_ficha_id: fichaId,
			})),
		});
	}

	if (licencas?.length) {
		const lista = licencas
			.filter((l) => l.tipo)
			.map((l) => ({
				monitoramento_ficha_id: fichaId,
				tipo: l.tipo as TipoLicencaMonitoramento,
				numero: l.numero,
				tipo_documento: l.tipo_documento,
				data_expedicao: l.data_expedicao ? parseDataCivil(l.data_expedicao) : undefined,
			}));
		if (lista.length) {
			await tx.monitoramentoLicenca.deleteMany({ where: { monitoramento_ficha_id: fichaId } });
			await tx.monitoramentoLicenca.createMany({ data: lista });
		}
	}
}

async function salvarPayload(
	processoId: string,
	payload: GeoSampaMonitoramentoPayload,
	extras?: {
		sql_incra?: string | null;
		sql_formatado?: string | null;
		data_autuacao?: string | null;
		interessado?: string | null;
	},
) {
	await prisma.$transaction(async (tx) => {
		const atual = await tx.processo.findUnique({
			where: { id: processoId },
			select: {
				sql_incra: true,
				sql_formatado: true,
				data_autuacao: true,
				interessado: true,
			},
		});
		const data: Prisma.ProcessoUpdateInput = {};
		if (!atual?.sql_incra && extras?.sql_incra) data.sql_incra = extras.sql_incra;
		if (!atual?.sql_formatado && extras?.sql_formatado)
			data.sql_formatado = extras.sql_formatado;
		if (!atual?.data_autuacao && extras?.data_autuacao) {
			data.data_autuacao = parseDataCivil(extras.data_autuacao);
		}
		if (!atual?.interessado && extras?.interessado) data.interessado = extras.interessado;
		if (Object.keys(data).length > 0) {
			await tx.processo.update({ where: { id: processoId }, data });
		}

		let ficha = await tx.monitoramentoFicha.findUnique({
			where: { processo_id: processoId },
			select: { id: true },
		});
		if (!ficha) {
			ficha = await tx.monitoramentoFicha.create({
				data: { processo_id: processoId },
			});
		}
		await aplicarPayloadUpsert(tx, ficha.id, payload);
	});
}

async function processarProcesso(
	processoId: string,
	numProcesso: string,
	dryRun: boolean,
): Promise<ResultadoProcesso> {
	const sqlDoBi = await buscarSqlPorProcessoNoBi(numProcesso, () => {});

	if (sqlDoBi) {
		try {
			const resultado = await consultarGeoSampa(sqlDoBi, undefined, () => {});
			if (!dryRun) {
				const payload = mapGeoSampaParaMonitoramento(resultado.data, {
					modo: 'SQL',
					identificador: sqlDoBi,
				});
				await salvarPayload(processoId, payload, {
					sql_incra: resultado.data.sql_incra ?? sqlDoBi,
					sql_formatado: resultado.data.sql_formatado ?? sqlDoBi,
					data_autuacao: resultado.data.data_autuacao,
					interessado: resultado.data.proprietario_interessado,
				});
			}
			return { status: 'atualizado_sql', sql: sqlDoBi };
		} catch (e) {
			if (
				!(e instanceof GeoSampaConsultaError) ||
				(e.codigo !== 'NAO_ENCONTRADO' && e.codigo !== 'INVALIDO')
			) {
				throw e;
			}
			// cai no fallback por processo
		}
	}

	try {
		const geoData = await consultarProcessoNoWfs(numProcesso);
		if (!dryRun) {
			const payload = mapGeoSampaParaMonitoramento(geoData, {
				modo: 'PROCESSO',
				identificador: numProcesso,
			});
			await salvarPayload(processoId, payload, {
				sql_incra: geoData.sql_incra ?? sqlDoBi,
				sql_formatado: geoData.sql_formatado ?? sqlDoBi,
				data_autuacao: geoData.data_autuacao,
				interessado: geoData.proprietario_interessado,
			});
		}
		return sqlDoBi
			? { status: 'atualizado_sql', sql: sqlDoBi }
			: { status: 'atualizado_outorga' };
	} catch (e) {
		if (e instanceof GeoSampaConsultaError && e.codigo === 'NAO_ENCONTRADO') {
			return sqlDoBi ? { status: 'nao_encontrado_wfs' } : { status: 'sem_sql_bi' };
		}
		throw e;
	}
}

async function buscarProcessosSemDados(processoFiltro?: string) {
	if (processoFiltro) {
		const p = await prisma.processo.findUnique({
			where: { num_processo: processoFiltro },
			select: { id: true, num_processo: true },
		});
		if (!p) throw new Error(`Processo "${processoFiltro}" não encontrado no banco local.`);
		return [p];
	}

	return prisma.processo.findMany({
		where: {
			OR: [
				{ monitoramento: null },
				{ monitoramento: { localizacao_lote: null } },
				{ monitoramento: { localizacao_lote: { lote_cadastrado: null } } },
			],
		},
		select: { id: true, num_processo: true },
		orderBy: { num_processo: 'asc' },
	});
}

function salvarCsv(resultados: LinhaResultado[]) {
	const dir = path.join(import.meta.dirname, 'output');
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	const stamp = new Date()
		.toISOString()
		.replace('T', '_')
		.replace(/:/g, '-')
		.slice(0, 16);
	const arquivo = path.join(dir, `resultado-${stamp}.csv`);
	const header = 'num_processo;status;sql;detalhe';
	const linhas = resultados.map((r) =>
		[r.num_processo, r.status, r.sql ?? '', r.detalhe ?? ''].join(';'),
	);
	fs.writeFileSync(arquivo, [header, ...linhas].join('\n'), 'utf-8');
	return arquivo;
}

async function main() {
	const opts = parseArgs();

	console.log('=== Backfill BI → SQL → GeoSampa ===');
	if (opts.dryRun) console.log('  [modo dry-run — nenhuma alteração será gravada]');
	console.log('  1) BI cadastros → SQL');
	console.log('  2) GeoSampa WFS pelo SQL');
	console.log('  3) fallback: outorga WFS pelo processo');
	console.log(`  Delay: ${opts.delay}ms`);
	if (opts.processo) console.log(`  Processo: ${opts.processo}`);
	if (opts.limit) console.log(`  Limite: ${opts.limit}`);
	console.log('');

	const todos = await buscarProcessosSemDados(opts.processo);
	const lista = opts.limit ? todos.slice(0, opts.limit) : todos;

	console.log(`Processos pendentes: ${todos.length}`);
	if (opts.limit && todos.length > opts.limit) {
		console.log(`  (processando ${opts.limit})`);
	}
	console.log('');

	const stats: Stats = {
		total: lista.length,
		atualizadosSql: 0,
		atualizadosOutorga: 0,
		semSqlNoBi: 0,
		naoEncontradoWfs: 0,
		erros: 0,
	};
	const resultados: LinhaResultado[] = [];

	for (let i = 0; i < lista.length; i++) {
		const { id, num_processo } = lista[i];
		const pad = String(lista.length).length;
		const prefixo = `[${String(i + 1).padStart(pad)}/${lista.length}]`;
		process.stdout.write(`${prefixo} ${num_processo} ... `);

		const linha: LinhaResultado = { num_processo, status: 'erro' };

		try {
			const r = await processarProcesso(id, num_processo, opts.dryRun);
			linha.status = r.status;

			switch (r.status) {
				case 'atualizado_sql':
					stats.atualizadosSql++;
					linha.sql = r.sql;
					console.log(`OK  (SQL: ${r.sql})`);
					break;
				case 'atualizado_outorga':
					stats.atualizadosOutorga++;
					console.log('OK  (via outorga WFS)');
					break;
				case 'sem_sql_bi':
					stats.semSqlNoBi++;
					console.log('sem SQL no BI / sem outorga WFS');
					break;
				case 'nao_encontrado_wfs':
					stats.naoEncontradoWfs++;
					console.log('SQL no BI, mas não achou no GeoSampa WFS');
					break;
			}
		} catch (e) {
			stats.erros++;
			linha.detalhe = (e as Error).message;
			console.log(`ERRO: ${(e as Error).message}`);
		}

		resultados.push(linha);
		if (i < lista.length - 1) await sleep(opts.delay);
	}

	console.log('\n--- Resultado ---');
	console.log(`Total processado:                      ${stats.total}`);
	console.log(`Atualizados via SQL (completos):       ${stats.atualizadosSql}`);
	console.log(`Atualizados via outorga WFS:           ${stats.atualizadosOutorga}`);
	console.log(`Sem SQL no BI / sem outorga:           ${stats.semSqlNoBi}`);
	console.log(`SQL no BI, sem lote no WFS:            ${stats.naoEncontradoWfs}`);
	console.log(`Erros:                                  ${stats.erros}`);

	const comInt = await prisma.processo.count({ where: { interessado: { not: null } } });
	const comSql = await prisma.processo.count({ where: { sql_incra: { not: null } } });
	const comMon = await prisma.monitoramentoFicha.count();
	console.log(`\nCobertura atual: interessado=${comInt}  sql=${comSql}  fichas=${comMon}`);

	if (!opts.dryRun && resultados.length > 0) {
		const arquivo = salvarCsv(resultados);
		console.log(`\nCSV: ${arquivo}`);
	}
}

main()
	.catch((e) => {
		console.error('\nFalha no script:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
