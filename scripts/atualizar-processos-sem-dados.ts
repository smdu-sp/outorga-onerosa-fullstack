/**
 * Para cada processo sem lote_cadastrado preenchido, busca dados no GeoSampa:
 *
 *   Processo DIGITAL  (ex: 0000.1994/0107093-8)
 *     → BI (dbo.cadastros → sql_incra) → GeoSampa WFS pelo SQL (dados completos)
 *
 *   Processo FÍSICO   (ex: 2010-0.345.761-0)
 *     → Pula o BI (o número está cadastrado lá com outra máscara)
 *     → GeoSampa camada outorga_onerosa pelo cd_processo (dados parciais: setor+quadra)
 *
 * Processos com lote_cadastrado já preenchido são ignorados (dados completos).
 * Ao terminar, salva CSV em scripts/output/ com todos os resultados para filtragem.
 *
 * Uso:
 *   npx tsx scripts/atualizar-processos-sem-dados.ts
 *   npx tsx scripts/atualizar-processos-sem-dados.ts --dry-run
 *   npx tsx scripts/atualizar-processos-sem-dados.ts --limit 50 --delay 2000
 *   npx tsx scripts/atualizar-processos-sem-dados.ts --processo 2024.1234/0012345-6
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

/** Formato digital padrão: 0000.1994/0107093-8 */
const RE_DIGITAL = /^\d{4}\.\d{4}\/\d{7}-\d$/;

function isDigital(numProcesso: string) {
	return RE_DIGITAL.test(numProcesso.trim());
}

type StatusResultado =
	| 'atualizado_sql'
	| 'atualizado_outorga'
	| 'sem_sql_bi'
	| 'nao_encontrado_wfs'
	| 'erro';

type LinhaResultado = {
	num_processo: string;
	tipo: 'Digital' | 'Físico';
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
		delay: readNum('--delay', 1500)!,
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
			incidencia_cota_solidariedade: situacao.incidencia_cota_solidariedade as IncidenciaCotaSolidariedade | undefined,
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
) {
	await prisma.$transaction(async (tx) => {
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

type ResultadoProcesso =
	| { status: 'atualizado_sql'; sql: string }
	| { status: 'atualizado_outorga' }
	| { status: 'sem_sql_bi' }
	| { status: 'nao_encontrado_wfs' }
	| { status: 'erro'; mensagem: string };

async function processarDigital(
	processoId: string,
	numProcesso: string,
	dryRun: boolean,
): Promise<ResultadoProcesso> {
	// Etapa 1: pegar SQL no BI
	const sqlDoBi = await buscarSqlPorProcessoNoBi(numProcesso, () => {});
	if (!sqlDoBi) return { status: 'sem_sql_bi' };

	// Etapa 2: consultar GeoSampa pelo SQL (dados completos: lote, zoneamento etc.)
	let resultado: Awaited<ReturnType<typeof consultarGeoSampa>>;
	try {
		resultado = await consultarGeoSampa(sqlDoBi, undefined, () => {});
	} catch (e) {
		if (e instanceof GeoSampaConsultaError && e.codigo === 'NAO_ENCONTRADO') {
			return { status: 'nao_encontrado_wfs' };
		}
		throw e;
	}

	if (!dryRun) {
		const payload = mapGeoSampaParaMonitoramento(resultado.data, {
			modo: 'SQL',
			identificador: sqlDoBi,
		});
		await salvarPayload(processoId, payload);
	}

	return { status: 'atualizado_sql', sql: sqlDoBi };
}

async function processarFisico(
	processoId: string,
	numProcesso: string,
	dryRun: boolean,
): Promise<ResultadoProcesso> {
	// Pula o BI — processo físico está cadastrado lá com outra máscara
	// Tenta direto na camada outorga_onerosa do WFS pelo cd_processo
	let geoData: Awaited<ReturnType<typeof consultarProcessoNoWfs>>;
	try {
		geoData = await consultarProcessoNoWfs(numProcesso);
	} catch (e) {
		if (e instanceof GeoSampaConsultaError && e.codigo === 'NAO_ENCONTRADO') {
			return { status: 'nao_encontrado_wfs' };
		}
		throw e;
	}

	if (!dryRun) {
		const payload = mapGeoSampaParaMonitoramento(geoData, {
			modo: 'PROCESSO',
			identificador: numProcesso,
		});
		await salvarPayload(processoId, payload);
	}

	return { status: 'atualizado_outorga' };
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

	// Considera "completo" apenas quando lote_cadastrado está preenchido.
	// Processos com só setor+quadra (vindos da outorga WFS) são reprocessados.
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

	const agora = new Date();
	const stamp = agora
		.toISOString()
		.replace('T', '_')
		.replace(/:/g, '-')
		.slice(0, 16);
	const arquivo = path.join(dir, `resultado-${stamp}.csv`);

	const header = 'num_processo;tipo;status;sql;detalhe';
	const linhas = resultados.map((r) =>
		[r.num_processo, r.tipo, r.status, r.sql ?? '', r.detalhe ?? ''].join(';'),
	);

	fs.writeFileSync(arquivo, [header, ...linhas].join('\n'), 'utf-8');
	return arquivo;
}

async function main() {
	const opts = parseArgs();

	console.log('=== Atualizar processos sem dados do GeoSampa ===');
	if (opts.dryRun) console.log('  [modo dry-run — nenhuma alteração será gravada]');
	console.log('  Digital: BI (sql_incra) → WFS pelo SQL');
	console.log('  Físico:  WFS camada outorga_onerosa pelo cd_processo');
	console.log(`  Delay entre requisições: ${opts.delay}ms`);
	if (opts.processo) console.log(`  Processo específico: ${opts.processo}`);
	if (opts.limit) console.log(`  Limite: ${opts.limit}`);
	console.log('');

	const todos = await buscarProcessosSemDados(opts.processo);
	const lista = opts.limit ? todos.slice(0, opts.limit) : todos;

	const nDigitais = lista.filter((p) => isDigital(p.num_processo)).length;
	const nFisicos = lista.length - nDigitais;

	console.log(`Processos sem localizacao_lote: ${todos.length}`);
	if (opts.limit && todos.length > opts.limit) {
		console.log(`  (processando apenas os primeiros ${opts.limit})`);
	}
	console.log(`  Digitais: ${nDigitais}   Físicos: ${nFisicos}`);
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
		const digital = isDigital(num_processo);
		const tipo = digital ? 'D' : 'F';

		process.stdout.write(`${prefixo} [${tipo}] ${num_processo} ... `);

		let linha: LinhaResultado = {
			num_processo,
			tipo: digital ? 'Digital' : 'Físico',
			status: 'erro',
		};

		try {
			const r = digital
				? await processarDigital(id, num_processo, opts.dryRun)
				: await processarFisico(id, num_processo, opts.dryRun);

			linha.status = r.status;

			switch (r.status) {
				case 'atualizado_sql':
					stats.atualizadosSql++;
					linha.sql = r.sql;
					console.log(`OK  (SQL: ${r.sql})`);
					break;
				case 'atualizado_outorga':
					stats.atualizadosOutorga++;
					console.log('OK  (via outorga WFS — dados parciais: setor+quadra)');
					break;
				case 'sem_sql_bi':
					stats.semSqlNoBi++;
					console.log('sem SQL no BI (sql_incra vazio)');
					break;
				case 'nao_encontrado_wfs':
					stats.naoEncontradoWfs++;
					console.log('não encontrado no GeoSampa WFS');
					break;
			}
		} catch (e) {
			stats.erros++;
			linha.detalhe = (e as Error).message;
			console.log(`ERRO: ${(e as Error).message}`);
		}

		resultados.push(linha);

		if (i < lista.length - 1) {
			await sleep(opts.delay);
		}
	}

	console.log('\n--- Resultado ---');
	console.log(`Total processado:                      ${stats.total}`);
	console.log(`Atualizados via SQL (dados completos):  ${stats.atualizadosSql}`);
	console.log(`Atualizados via outorga WFS (parcial):  ${stats.atualizadosOutorga}`);
	console.log(`Sem SQL no BI (sql_incra vazio):        ${stats.semSqlNoBi}`);
	console.log(`Não encontrados no WFS:                ${stats.naoEncontradoWfs}`);
	console.log(`Erros:                                  ${stats.erros}`);

	if (!opts.dryRun && resultados.length > 0) {
		const arquivo = salvarCsv(resultados);
		console.log(`\nCSV salvo em: ${arquivo}`);
		console.log('Filtros úteis no CSV (coluna "status"):');
		console.log('  sem_sql_bi        → digitais sem sql_incra no BI');
		console.log('  nao_encontrado_wfs → não existe na camada do GeoSampa');
		console.log('  erro              → falha inesperada (ver coluna "detalhe")');
	}
}

main()
	.catch((e) => {
		console.error('\nFalha no script:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
