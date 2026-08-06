/**
 * Importa a planilha piloto SERVIN para o módulo Gestão de Processos de Licenciamento.
 *
 * Uso:
 *   npx tsx prisma/import-licenciamento-servin.ts
 *   npx tsx prisma/import-licenciamento-servin.ts --file "C:\caminho\arquivo.xlsx"
 *   PLANILHA_SERVIN=... npm run db:import-licenciamento-servin
 *
 * Reexecução: faz upsert por num_processo; reconstitui imóveis/interessados/incidências;
 * reimporta eventos técnicos/administrativos da planilha (substitui os da coordenadoria SERVIN).
 */
import {
	Prisma,
	PrismaClient,
	TipoSistemaLicenciamento,
	type CoordenadoriaAnalise,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { limparTexto, parseNumeroBr } from '../lib/parse-numero-br';

const prisma = new PrismaClient();
const COORD: CoordenadoriaAnalise = 'SERVIN';

const DEFAULT_FILE =
	process.env.PLANILHA_SERVIN ??
	path.join(
		process.env.USERPROFILE ?? '',
		'Downloads',
		'Controle de Processos SERVIN 2025 d_16 04 2026.xlsx',
	);

type ColMap = Record<string, number>;

/** Processos Ativos — índices 1-based (linhas 1–3 = cabeçalho). */
const COL_ATIVOS: ColMap = {
	protocolo: 2,
	processo: 3,
	sistema: 4,
	prioritario: 5,
	divisao: 6,
	assunto: 7,
	relacionado: 8,
	sqlPrincipal: 9,
	sqlComplementares: 10,
	endereco: 11,
	equipamentoPublico: 12,
	interessado: 13,
	dataAutuacao: 14,
	dataEnvioCoord: 15,
	dataDistDiretoria: 16,
	dataDistTecnico: 17,
	tecnico: 18,
	situacao: 19,
	dataDespachoDoc: 20,
	instancia: 21,
	observacao: 22,
	isencao: 23,
	isencaoValor: 24,
	quotaAmbiental: 25,
	oodc: 26,
	oodcValor: 27,
	cepac: 28,
	cepacValor: 29,
	quotaSolidariedade: 30,
	quotaSolidariedadeValor: 31,
	doacaoCalcada: 32,
	fruicaoPublica: 33,
	fachadaAtiva: 34,
	piu: 35,
	aiu: 36,
	operacaoUrbana: 37,
	outros: 38,
	certificadoIrregularidade: 39,
	certificadoDataDoc: 40,
	certificadoNumero: 41,
	certificadoObs: 42,
	areaTerreno: 44,
	areaConstrucaoInicial: 45,
	areaConstrucaoFinal: 46,
	zona: 47,
	categoriaUso: 48,
	descricaoUso: 49,
	subprefeitura: 50,
	baseLegalPde: 51,
	baseLegalLpuos: 52,
	baseLegalCoe: 53,
	legislacaoEspecifica: 54,
};

/** Processos Encerrados — layout diferente (sem coluna de envio à coordenadoria). */
const COL_ENCERRADOS: ColMap = {
	protocolo: 2,
	processo: 3,
	sistema: 4,
	prioritario: 5,
	divisao: 6,
	assunto: 7,
	relacionado: 8,
	sqlPrincipal: 9,
	sqlComplementares: 10,
	endereco: 11,
	equipamentoPublico: 12,
	interessado: 13,
	dataAutuacao: 14,
	dataDistDiretoria: 15,
	tecnico: 16,
	dataDistTecnico: 17,
	situacao: 18,
	dataDespachoDoc: 19,
	instancia: 20,
	observacao: 21,
	isencao: 22,
	isencaoValor: 23,
	quotaAmbiental: 24,
	oodc: 25,
	oodcValor: 26,
	cepac: 27,
	cepacValor: 28,
	quotaSolidariedade: 29,
	quotaSolidariedadeValor: 30,
	doacaoCalcada: 31,
	fruicaoPublica: 32,
	fachadaAtiva: 33,
	piu: 34,
	aiu: 35,
	operacaoUrbana: 36,
	outros: 37,
	certificadoIrregularidade: 38,
	certificadoDataDoc: 39,
	certificadoNumero: 40,
	certificadoObs: 41,
	areaTerreno: 43,
	areaConstrucaoInicial: 44,
	areaConstrucaoFinal: 45,
	zona: 46,
	categoriaUso: 47,
	descricaoUso: 48,
	subprefeitura: 49,
	baseLegalPde: 50,
	baseLegalLpuos: 51,
	baseLegalCoe: 52,
	legislacaoEspecifica: 53,
};

const stats = {
	processosUpsert: 0,
	processosSkip: 0,
	eventosTecnicos: 0,
	eventosAdm: 0,
	oficios: 0,
	arquivamentos: 0,
	categorias: 0,
	fisicosAtualizados: 0,
	multiplosSqls: 0,
	vinculosOutorga: 0,
	erros: [] as string[],
};

function argFile(): string {
	const idx = process.argv.indexOf('--file');
	if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
	return DEFAULT_FILE;
}

function cellValue(ws: ExcelJS.Worksheet, row: number, col: number): unknown {
	const cell = ws.getRow(row).getCell(col);
	const v = cell.value;
	if (v == null) return undefined;
	if (typeof v === 'object') {
		if (v instanceof Date) return v;
		if ('result' in v) return (v as ExcelJS.CellFormulaValue).result;
		if ('richText' in v) {
			return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join('');
		}
		if ('text' in v) return (v as ExcelJS.CellHyperlinkValue).text;
		if ('sharedString' in (v as object)) return String(v);
	}
	return v;
}

function text(ws: ExcelJS.Worksheet, row: number, col: number | undefined): string | undefined {
	if (!col) return undefined;
	return limparTexto(cellValue(ws, row, col));
}

function slugCodigo(nome: string): string {
	return nome
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
		.slice(0, 80);
}

/** Datas da planilha: Date, serial Excel, DD/MM/YYYY, DD MM YYYY, DD-MM-YYYY. */
function parseDataServin(valor: unknown): Date | null {
	if (valor == null || valor === '' || valor === '-') return null;
	if (valor instanceof Date) {
		if (Number.isNaN(valor.getTime())) return null;
		const y = valor.getFullYear();
		if (y < 1990 || y > 2100) return null;
		return new Date(Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()));
	}
	if (typeof valor === 'number' && Number.isFinite(valor)) {
		// Excel serial (aproximação)
		if (valor > 20000 && valor < 80000) {
			const epoch = new Date(Date.UTC(1899, 11, 30));
			epoch.setUTCDate(epoch.getUTCDate() + Math.floor(valor));
			const y = epoch.getUTCFullYear();
			if (y < 1990 || y > 2100) return null;
			return epoch;
		}
		return null;
	}
	const s = limparTexto(valor);
	if (!s) return null;

	const br = s.match(/^(\d{1,2})[\/\-\s.](\d{1,2})[\/\-\s.](\d{4})$/);
	if (br) {
		const d = +br[1];
		const m = +br[2];
		const y = +br[3];
		if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
		return new Date(Date.UTC(y, m - 1, d));
	}

	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) {
		const y = +iso[1];
		if (y < 1990 || y > 2100) return null;
		return new Date(Date.UTC(y, +iso[2] - 1, +iso[3]));
	}

	const parsed = new Date(s);
	if (Number.isNaN(parsed.getTime())) return null;
	const y = parsed.getFullYear();
	if (y < 1990 || y > 2100) return null;
	return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function parseBool(valor: unknown): boolean {
	const s = limparTexto(valor)?.toLowerCase();
	if (!s) return false;
	return ['sim', 's', 'yes', 'true', '1', 'x'].includes(s);
}

function parseSistema(valor: unknown): TipoSistemaLicenciamento | undefined {
	const s = limparTexto(valor)?.toUpperCase();
	if (!s) return undefined;
	if (s.includes('FISIC')) return 'FISICO';
	if (s === 'AD' || s.includes('APROVA')) return 'AD';
	if (s.includes('SEI')) return 'SEI';
	return undefined;
}

function splitSqls(raw: string | undefined): string[] {
	if (!raw) return [];
	return raw
		.split(/[,;]+|\s+-\s+/)
		.map((p) => limparTexto(p))
		.filter((p): p is string => !!p && p !== '0' && p.toLowerCase() !== 'nan');
}

function normalizarNome(nome: string): string {
	return nome
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

async function cacheLookups() {
	const [usuarios, divisoes, situacoes, assuntos, tiposEvento, categorias, outorgas] =
		await Promise.all([
			prisma.usuario.findMany({ select: { id: true, nome: true } }),
			prisma.divisaoLicenciamento.findMany({ where: { coordenadoria: COORD } }),
			prisma.situacaoLicenciamento.findMany(),
			prisma.assuntoLicenciamento.findMany({
				where: { OR: [{ coordenadoria: COORD }, { coordenadoria: null }] },
			}),
			prisma.tipoEventoLicenciamento.findMany(),
			prisma.categoriaLicenciamento.findMany({ where: { coordenadoria: COORD } }),
			prisma.processo.findMany({ select: { id: true, num_processo: true } }),
		]);

	const tecnicoPorNome = new Map<string, string>();
	for (const u of usuarios) {
		tecnicoPorNome.set(normalizarNome(u.nome), u.id);
		const primeiro = u.nome.split(/\s+/)[0];
		if (primeiro && !tecnicoPorNome.has(normalizarNome(primeiro))) {
			tecnicoPorNome.set(normalizarNome(primeiro), u.id);
		}
	}

	return {
		tecnicoPorNome,
		divisaoPorCodigo: new Map(divisoes.map((d) => [d.codigo.toUpperCase(), d.id])),
		situacaoPorCodigo: new Map(situacoes.map((s) => [s.codigo, s.id])),
		situacaoPorNome: new Map(
			situacoes.map((s) => [normalizarNome(s.nome), s.id]),
		),
		assuntoPorNome: new Map(assuntos.map((a) => [normalizarNome(a.nome), a.id])),
		tipoEventoPorChave: new Map(
			tiposEvento.map((t) => [`${t.categoria}:${t.codigo}`, t.id]),
		),
		tipoEventoPorNome: new Map(
			tiposEvento.map((t) => [`${t.categoria}:${normalizarNome(t.nome)}`, t.id]),
		),
		categoriaPorCodigo: new Map(categorias.map((c) => [c.codigo.toUpperCase(), c.id])),
		outorgaPorNumero: new Map(outorgas.map((o) => [o.num_processo, o.id])),
	};
}

type Lookups = Awaited<ReturnType<typeof cacheLookups>>;

async function ensureDivisao(codigo: string, lookups: Lookups): Promise<string> {
	const key = codigo.toUpperCase();
	const existing = lookups.divisaoPorCodigo.get(key);
	if (existing) return existing;
	const created = await prisma.divisaoLicenciamento.create({
		data: { coordenadoria: COORD, codigo: key, nome: key },
	});
	lookups.divisaoPorCodigo.set(key, created.id);
	return created.id;
}

async function ensureAssunto(nome: string, lookups: Lookups): Promise<string> {
	const key = normalizarNome(nome);
	const existing = lookups.assuntoPorNome.get(key);
	if (existing) return existing;
	const created = await prisma.assuntoLicenciamento.create({
		data: { coordenadoria: COORD, nome },
	});
	lookups.assuntoPorNome.set(key, created.id);
	return created.id;
}

async function ensureSituacao(nome: string, lookups: Lookups): Promise<string> {
	const key = normalizarNome(nome);
	const byName = lookups.situacaoPorNome.get(key);
	if (byName) return byName;
	const codigo = slugCodigo(nome);
	const byCodigo = lookups.situacaoPorCodigo.get(codigo);
	if (byCodigo) {
		lookups.situacaoPorNome.set(key, byCodigo);
		return byCodigo;
	}
	const encerra = /encerrad|arquivad/i.test(nome);
	const created = await prisma.situacaoLicenciamento.create({
		data: { codigo, nome, encerra, coordenadoria: null },
	});
	lookups.situacaoPorCodigo.set(codigo, created.id);
	lookups.situacaoPorNome.set(key, created.id);
	return created.id;
}

async function ensureTipoEvento(
	categoria: 'TECNICO' | 'ADMINISTRATIVO',
	nome: string,
	lookups: Lookups,
): Promise<string> {
	const nomeKey = `${categoria}:${normalizarNome(nome)}`;
	const byNome = lookups.tipoEventoPorNome.get(nomeKey);
	if (byNome) return byNome;
	const codigo = slugCodigo(nome);
	const codigoKey = `${categoria}:${codigo}`;
	const byCodigo = lookups.tipoEventoPorChave.get(codigoKey);
	if (byCodigo) {
		lookups.tipoEventoPorNome.set(nomeKey, byCodigo);
		return byCodigo;
	}
	const created = await prisma.tipoEventoLicenciamento.create({
		data: { categoria, codigo, nome, coordenadoria: null },
	});
	lookups.tipoEventoPorChave.set(codigoKey, created.id);
	lookups.tipoEventoPorNome.set(nomeKey, created.id);
	return created.id;
}

async function ensureCategoria(
	codigo: string,
	nome: string,
	lookups: Lookups,
): Promise<string> {
	const key = codigo.toUpperCase();
	const existing = lookups.categoriaPorCodigo.get(key);
	if (existing) return existing;
	const created = await prisma.categoriaLicenciamento.create({
		data: { coordenadoria: COORD, codigo: key, nome },
	});
	lookups.categoriaPorCodigo.set(key, created.id);
	return created.id;
}

function resolverTecnico(nome: string | undefined, lookups: Lookups): string | undefined {
	if (!nome) return undefined;
	return (
		lookups.tecnicoPorNome.get(normalizarNome(nome)) ??
		lookups.tecnicoPorNome.get(normalizarNome(nome.split(/\s+/)[0] ?? ''))
	);
}

function buildIncidencias(ws: ExcelJS.Worksheet, row: number, col: ColMap) {
	const defs: Array<{ tipo: string; flagCol?: number; valorCol?: number; extra?: boolean }> = [
		{ tipo: 'ISENCAO_TAXAS', flagCol: col.isencao, valorCol: col.isencaoValor },
		{ tipo: 'QUOTA_AMBIENTAL', flagCol: col.quotaAmbiental },
		{ tipo: 'OODC', flagCol: col.oodc, valorCol: col.oodcValor },
		{ tipo: 'CEPAC', flagCol: col.cepac, valorCol: col.cepacValor },
		{ tipo: 'QUOTA_SOLIDARIEDADE', flagCol: col.quotaSolidariedade, valorCol: col.quotaSolidariedadeValor },
		{ tipo: 'DOACAO_CALCADA', flagCol: col.doacaoCalcada },
		{ tipo: 'FRUICAO_PUBLICA', flagCol: col.fruicaoPublica },
		{ tipo: 'FACHADA_ATIVA', flagCol: col.fachadaAtiva },
		{ tipo: 'PIU', flagCol: col.piu },
		{ tipo: 'AIU', flagCol: col.aiu },
		{ tipo: 'OPERACAO_URBANA', flagCol: col.operacaoUrbana },
		{ tipo: 'OUTROS', flagCol: col.outros },
	];

	const list: Prisma.ProcessoLicenciamentoIncidenciaCreateWithoutProcessoInput[] = [];
	for (const d of defs) {
		if (!d.flagCol) continue;
		const flag = parseBool(cellValue(ws, row, d.flagCol));
		const valor = d.valorCol ? parseNumeroBr(cellValue(ws, row, d.valorCol)) : undefined;
		if (!flag && valor == null) continue;
		list.push({
			tipo: d.tipo,
			flag,
			valor: valor != null ? new Prisma.Decimal(valor) : undefined,
		});
	}

	if (col.certificadoIrregularidade) {
		const flag = parseBool(cellValue(ws, row, col.certificadoIrregularidade));
		const dataDoc = col.certificadoDataDoc
			? parseDataServin(cellValue(ws, row, col.certificadoDataDoc))
			: null;
		const numero = text(ws, row, col.certificadoNumero);
		const observacao = text(ws, row, col.certificadoObs);
		if (flag || dataDoc || numero || observacao) {
			list.push({
				tipo: 'CERTIFICADO_IRREGULARIDADE',
				flag,
				data_doc: dataDoc ?? undefined,
				numero_documento: numero,
				observacao,
			});
		}
	}

	return list;
}

async function upsertProcessoLinha(
	ws: ExcelJS.Worksheet,
	row: number,
	col: ColMap,
	statusCiclo: 'ATIVO' | 'ENCERRADO',
	lookups: Lookups,
) {
	const numProcesso = text(ws, row, col.processo);
	if (!numProcesso || numProcesso.toLowerCase() === 'exemplo') {
		stats.processosSkip++;
		return;
	}

	try {
		const assuntoNome = text(ws, row, col.assunto);
		const divisaoCodigo = text(ws, row, col.divisao);
		const situacaoNome = text(ws, row, col.situacao);
		const tecnicoNome = text(ws, row, col.tecnico);

		const divisao_id = divisaoCodigo ? await ensureDivisao(divisaoCodigo, lookups) : undefined;
		const assunto_id = assuntoNome ? await ensureAssunto(assuntoNome, lookups) : undefined;
		const situacao_id = situacaoNome ? await ensureSituacao(situacaoNome, lookups) : undefined;
		const tecnico_atual_id = resolverTecnico(tecnicoNome, lookups);

		const encerraPorSituacao =
			situacaoNome != null && /encerrad|arquivad/i.test(situacaoNome);
		const status_ciclo = statusCiclo === 'ENCERRADO' || encerraPorSituacao ? 'ENCERRADO' : 'ATIVO';

		const oodcFlag = col.oodc ? parseBool(cellValue(ws, row, col.oodc)) : false;
		const processo_outorga_id =
			oodcFlag || lookups.outorgaPorNumero.has(numProcesso)
				? lookups.outorgaPorNumero.get(numProcesso)
				: undefined;
		if (processo_outorga_id) stats.vinculosOutorga++;

		const sqlPrincipal = text(ws, row, col.sqlPrincipal);
		const sqlsComp = splitSqls(text(ws, row, col.sqlComplementares));
		const endereco = text(ws, row, col.endereco);
		const interessado = text(ws, row, col.interessado);
		const incidencias = buildIncidencias(ws, row, col);

		const imoveis: Prisma.ProcessoLicenciamentoImovelCreateWithoutProcessoInput[] = [];
		if (sqlPrincipal || endereco) {
			imoveis.push({
				tipo: 'PRINCIPAL',
				identificador: sqlPrincipal,
				logradouro: endereco,
				ordem: 0,
			});
		}
		sqlsComp.forEach((sql, i) => {
			imoveis.push({ tipo: 'COMPLEMENTAR', identificador: sql, ordem: i + 1 });
		});

		const dataCore = {
			coordenadoria: COORD,
			status_ciclo: status_ciclo as 'ATIVO' | 'ENCERRADO',
			tipo_sistema: parseSistema(cellValue(ws, row, col.sistema)),
			protocolo: text(ws, row, col.protocolo),
			prioritario: parseBool(cellValue(ws, row, col.prioritario)),
			processo_relacionado: text(ws, row, col.relacionado),
			equipamento_publico: parseBool(cellValue(ws, row, col.equipamentoPublico)),
			instancia: text(ws, row, col.instancia),
			observacao: text(ws, row, col.observacao),
			data_autuacao: parseDataServin(cellValue(ws, row, col.dataAutuacao)) ?? undefined,
			data_envio_coordenadoria: col.dataEnvioCoord
				? parseDataServin(cellValue(ws, row, col.dataEnvioCoord)) ?? undefined
				: undefined,
			data_ult_dist_diretoria: parseDataServin(cellValue(ws, row, col.dataDistDiretoria)) ?? undefined,
			data_ult_dist_tecnico: parseDataServin(cellValue(ws, row, col.dataDistTecnico)) ?? undefined,
			data_despacho_doc: parseDataServin(cellValue(ws, row, col.dataDespachoDoc)) ?? undefined,
			area_terreno_m2: (() => {
				const n = parseNumeroBr(cellValue(ws, row, col.areaTerreno));
				return n != null ? new Prisma.Decimal(n) : undefined;
			})(),
			area_construcao_inicial_m2: (() => {
				const n = parseNumeroBr(cellValue(ws, row, col.areaConstrucaoInicial));
				return n != null ? new Prisma.Decimal(n) : undefined;
			})(),
			area_construcao_final_m2: (() => {
				const n = parseNumeroBr(cellValue(ws, row, col.areaConstrucaoFinal));
				return n != null ? new Prisma.Decimal(n) : undefined;
			})(),
			zona: text(ws, row, col.zona),
			categoria_uso: text(ws, row, col.categoriaUso),
			descricao_uso: text(ws, row, col.descricaoUso),
			subprefeitura: text(ws, row, col.subprefeitura),
			base_legal_pde: text(ws, row, col.baseLegalPde),
			base_legal_lpuos: text(ws, row, col.baseLegalLpuos),
			base_legal_coe: text(ws, row, col.baseLegalCoe),
			legislacao_especifica: text(ws, row, col.legislacaoEspecifica),
			divisao_id: divisao_id ?? null,
			assunto_id: assunto_id ?? null,
			situacao_id: situacao_id ?? null,
			tecnico_atual_id: tecnico_atual_id ?? null,
			processo_outorga_id: processo_outorga_id ?? null,
		};

		const existing = await prisma.processoLicenciamento.findUnique({
			where: { num_processo: numProcesso },
			select: { id: true },
		});

		let processoId: string;
		if (existing) {
			await prisma.processoLicenciamentoImovel.deleteMany({ where: { processo_id: existing.id } });
			await prisma.processoLicenciamentoInteressado.deleteMany({
				where: { processo_id: existing.id },
			});
			await prisma.processoLicenciamentoIncidencia.deleteMany({
				where: { processo_id: existing.id },
			});
			await prisma.processoLicenciamento.update({
				where: { id: existing.id },
				data: {
					...dataCore,
					imoveis: { create: imoveis },
					interessados: interessado
						? { create: [{ nome: interessado, tipo_vinculo: 'PRINCIPAL', ordem: 0 }] }
						: undefined,
					incidencias: { create: incidencias },
				},
			});
			processoId = existing.id;
		} else {
			const created = await prisma.processoLicenciamento.create({
				data: {
					num_processo: numProcesso,
					...dataCore,
					imoveis: { create: imoveis },
					interessados: interessado
						? { create: [{ nome: interessado, tipo_vinculo: 'PRINCIPAL', ordem: 0 }] }
						: undefined,
					incidencias: { create: incidencias },
				},
			});
			processoId = created.id;
		}

		if (tecnico_atual_id && dataCore.data_ult_dist_tecnico) {
			const jaTem = await prisma.distribuicaoLicenciamento.count({
				where: { processo_id: processoId, tipo: 'TECNICO', tecnico_id: tecnico_atual_id },
			});
			if (!jaTem) {
				await prisma.distribuicaoLicenciamento.create({
					data: {
						processo_id: processoId,
						tipo: 'TECNICO',
						tecnico_id: tecnico_atual_id,
						data_inicio: dataCore.data_ult_dist_tecnico,
					},
				});
			}
		}

		stats.processosUpsert++;
	} catch (e) {
		stats.erros.push(`Processo ${numProcesso}: ${e instanceof Error ? e.message : String(e)}`);
	}
}

async function importProcessosSheet(
	wb: ExcelJS.Workbook,
	sheetName: string,
	col: ColMap,
	statusCiclo: 'ATIVO' | 'ENCERRADO',
	dataStartRow: number,
	lookups: Lookups,
) {
	const ws = wb.getWorksheet(sheetName);
	if (!ws) {
		console.warn(`Aba não encontrada: ${sheetName}`);
		return;
	}
	console.log(`→ ${sheetName}…`);
	for (let row = dataStartRow; row <= ws.rowCount; row++) {
		await upsertProcessoLinha(ws, row, col, statusCiclo, lookups);
		if (row % 100 === 0) console.log(`   linha ${row}/${ws.rowCount}`);
	}
}

async function mapaProcessosServin() {
	const rows = await prisma.processoLicenciamento.findMany({
		where: { coordenadoria: COORD },
		select: { id: true, num_processo: true },
	});
	return new Map(rows.map((r) => [r.num_processo, r.id]));
}

async function importEventos(
	wb: ExcelJS.Workbook,
	lookups: Lookups,
	processoIds: Map<string, string>,
) {
	const ws = wb.getWorksheet('Eventos');
	if (!ws) return;
	console.log('→ Eventos (técnicos)…');

	// Substitui eventos técnicos já importados dos processos SERVIN presentes na aba
	await prisma.eventoLicenciamento.deleteMany({
		where: {
			categoria: 'TECNICO',
			processo: { coordenadoria: COORD },
		},
	});

	for (let row = 2; row <= ws.rowCount; row++) {
		const num = text(ws, row, 2);
		if (!num) continue;
		const processoId = processoIds.get(num);
		if (!processoId) continue;

		const tipoNome = text(ws, row, 6);
		if (!tipoNome) continue;

		try {
			const tipo_evento_id = await ensureTipoEvento('TECNICO', tipoNome, lookups);
			const tecnico_id = resolverTecnico(text(ws, row, 5), lookups);
			await prisma.eventoLicenciamento.create({
				data: {
					processo_id: processoId,
					categoria: 'TECNICO',
					tipo_evento_id,
					tecnico_id,
					data_inicio: parseDataServin(cellValue(ws, row, 7)) ?? undefined,
					data_termino: parseDataServin(cellValue(ws, row, 8)) ?? undefined,
					descricao: text(ws, row, 9),
					observacao: text(ws, row, 11),
				},
			});
			stats.eventosTecnicos++;
		} catch (e) {
			stats.erros.push(`Evento ${num} L${row}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
}

async function importEventosAdm(
	wb: ExcelJS.Workbook,
	lookups: Lookups,
	processoIds: Map<string, string>,
) {
	const ws = wb.getWorksheet('Eventos Administrativos');
	if (!ws) return;
	console.log('→ Eventos Administrativos…');

	await prisma.eventoLicenciamento.deleteMany({
		where: {
			categoria: 'ADMINISTRATIVO',
			processo: { coordenadoria: COORD },
		},
	});

	for (let row = 4; row <= ws.rowCount; row++) {
		const idCell = text(ws, row, 1);
		if (idCell && /exemplo/i.test(idCell)) continue;
		const num = text(ws, row, 2);
		if (!num) continue;
		const processoId = processoIds.get(num);
		if (!processoId) continue;
		const tipoNome = text(ws, row, 6);
		if (!tipoNome) continue;

		try {
			const tipo_evento_id = await ensureTipoEvento('ADMINISTRATIVO', tipoNome, lookups);
			const tecnico_id = resolverTecnico(text(ws, row, 5), lookups);
			await prisma.eventoLicenciamento.create({
				data: {
					processo_id: processoId,
					categoria: 'ADMINISTRATIVO',
					tipo_evento_id,
					tecnico_id,
					data_inicio: parseDataServin(cellValue(ws, row, 7)) ?? undefined,
					data_termino: parseDataServin(cellValue(ws, row, 8)) ?? undefined,
					descricao: text(ws, row, 9),
				},
			});
			stats.eventosAdm++;
		} catch (e) {
			stats.erros.push(`EventoAdm ${num} L${row}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
}

async function importOficios(
	wb: ExcelJS.Workbook,
	lookups: Lookups,
	processoIds: Map<string, string>,
) {
	const ws = wb.getWorksheet('Ofícios');
	if (!ws) return;
	console.log('→ Ofícios…');

	const ids = [...processoIds.values()];
	if (ids.length) {
		await prisma.oficioLicenciamento.deleteMany({
			where: { processo_id: { in: ids } },
		});
	}

	for (let row = 4; row <= ws.rowCount; row++) {
		const numero = text(ws, row, 1);
		const num = text(ws, row, 2);
		if (!numero || !num) continue;
		const processoId = processoIds.get(num);
		if (!processoId) continue;

		try {
			await prisma.oficioLicenciamento.create({
				data: {
					processo_id: processoId,
					numero,
					data_email_enviado: parseDataServin(cellValue(ws, row, 3)) ?? undefined,
					data_recebimento_resposta: parseDataServin(cellValue(ws, row, 4)) ?? undefined,
					data_encerramento: parseDataServin(cellValue(ws, row, 5)) ?? undefined,
					tecnico_id: resolverTecnico(text(ws, row, 6), lookups),
					interessado_nome: text(ws, row, 7),
					observacao: text(ws, row, 8),
				},
			});
			stats.oficios++;
		} catch (e) {
			stats.erros.push(`Ofício ${numero}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
}

async function importFisicos(wb: ExcelJS.Workbook, lookups: Lookups) {
	const ws = wb.getWorksheet('Fisicos');
	if (!ws) return;
	console.log('→ Físicos…');

	for (let row = 3; row <= ws.rowCount; row++) {
		const num = text(ws, row, 2);
		if (!num) continue;
		const divisaoCodigo = text(ws, row, 4);
		const endereco = text(ws, row, 5);
		const areaTerreno = parseNumeroBr(cellValue(ws, row, 6));
		const areaTotal = parseNumeroBr(cellValue(ws, row, 7));
		const tecnicoNome = text(ws, row, 9);

		try {
			const divisao_id = divisaoCodigo ? await ensureDivisao(divisaoCodigo, lookups) : undefined;
			const tecnico_atual_id = resolverTecnico(tecnicoNome, lookups);

			const existing = await prisma.processoLicenciamento.findUnique({
				where: { num_processo: num },
				select: { id: true },
			});

			if (existing) {
				await prisma.processoLicenciamento.update({
					where: { id: existing.id },
					data: {
						tipo_sistema: 'FISICO',
						divisao_id: divisao_id ?? undefined,
						tecnico_atual_id: tecnico_atual_id ?? undefined,
						area_terreno_m2:
							areaTerreno != null ? new Prisma.Decimal(areaTerreno) : undefined,
						area_construcao_final_m2:
							areaTotal != null ? new Prisma.Decimal(areaTotal) : undefined,
					},
				});
				if (endereco) {
					const temEndereco = await prisma.processoLicenciamentoImovel.count({
						where: { processo_id: existing.id, logradouro: { not: null } },
					});
					if (!temEndereco) {
						await prisma.processoLicenciamentoImovel.create({
							data: {
								processo_id: existing.id,
								tipo: 'PRINCIPAL',
								logradouro: endereco,
								ordem: 0,
							},
						});
					}
				}
			} else {
				await prisma.processoLicenciamento.create({
					data: {
						num_processo: num,
						coordenadoria: COORD,
						status_ciclo: 'ATIVO',
						tipo_sistema: 'FISICO',
						divisao_id,
						tecnico_atual_id,
						area_terreno_m2:
							areaTerreno != null ? new Prisma.Decimal(areaTerreno) : undefined,
						area_construcao_final_m2:
							areaTotal != null ? new Prisma.Decimal(areaTotal) : undefined,
						imoveis: endereco
							? { create: [{ tipo: 'PRINCIPAL', logradouro: endereco, ordem: 0 }] }
							: undefined,
					},
				});
			}
			stats.fisicosAtualizados++;
		} catch (e) {
			stats.erros.push(`Físico ${num}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
}

async function importMultiplosSqls(wb: ExcelJS.Workbook, processoIds: Map<string, string>) {
	const ws = wb.getWorksheet('Multiplos SQLs');
	if (!ws) return;
	console.log('→ Múltiplos SQLs…');

	for (let row = 2; row <= ws.rowCount; row++) {
		const protocoloOuProcesso = text(ws, row, 1);
		const lista = text(ws, row, 2);
		if (!protocoloOuProcesso || !lista) continue;

		// Aba usa protocolo AD; tentar achar processo pelo protocolo
		const processo = await prisma.processoLicenciamento.findFirst({
			where: {
				OR: [
					{ protocolo: protocoloOuProcesso },
					{ num_processo: protocoloOuProcesso },
				],
			},
			select: { id: true },
		});
		if (!processo) continue;

		const sqls = splitSqls(lista.replace(/\s+-\s+/g, ' - '));
		for (const [i, sql] of sqls.entries()) {
			const existe = await prisma.processoLicenciamentoImovel.findFirst({
				where: { processo_id: processo.id, identificador: sql },
			});
			if (existe) continue;
			await prisma.processoLicenciamentoImovel.create({
				data: {
					processo_id: processo.id,
					tipo: 'COMPLEMENTAR',
					identificador: sql,
					ordem: 100 + i,
				},
			});
			stats.multiplosSqls++;
		}
		void processoIds;
	}
}

async function tagProcesso(
	numProcesso: string | undefined,
	categoriaId: string,
	processoIds: Map<string, string>,
) {
	if (!numProcesso) return;
	const processoId = processoIds.get(numProcesso.trim());
	if (!processoId) return;
	await prisma.processoLicenciamentoCategoria.upsert({
		where: {
			processo_id_categoria_id: {
				processo_id: processoId,
				categoria_id: categoriaId,
			},
		},
		create: { processo_id: processoId, categoria_id: categoriaId },
		update: {},
	});
	stats.categorias++;
}

async function importCategorias(
	wb: ExcelJS.Workbook,
	lookups: Lookups,
	processoIds: Map<string, string>,
) {
	console.log('→ Categorias de monitoramento…');

	const hospitais = wb.getWorksheet('Hospitais');
	if (hospitais) {
		for (let row = 3; row <= hospitais.rowCount; row++) {
			const tipo = (text(hospitais, row, 1) ?? 'HOSPITAL').toUpperCase();
			const codigo = tipo.includes('UBS')
				? 'UBS'
				: tipo.includes('UPA')
					? 'UPA'
					: 'HOSPITAL';
			const catId = await ensureCategoria(codigo, codigo, lookups);
			await tagProcesso(text(hospitais, row, 2), catId, processoIds);
		}
	}

	const ceus = wb.getWorksheet('CEUs');
	if (ceus) {
		const catId = await ensureCategoria('CEU', 'CEU', lookups);
		for (let row = 3; row <= ceus.rowCount; row++) {
			await tagProcesso(text(ceus, row, 2), catId, processoIds);
		}
	}

	const sescs = wb.getWorksheet('SESCs (inserindo dados)');
	if (sescs) {
		const catId = await ensureCategoria('SESC', 'SESC', lookups);
		for (let row = 3; row <= sescs.rowCount; row++) {
			await tagProcesso(text(sescs, row, 3), catId, processoIds);
		}
	}

	const tjsp = wb.getWorksheet('TJ-SP');
	if (tjsp) {
		const catId = await ensureCategoria('TJ-SP', 'TJ-SP', lookups);
		for (let row = 3; row <= tjsp.rowCount; row++) {
			await tagProcesso(text(tjsp, row, 3), catId, processoIds);
		}
	}
}

async function importArquivados(wb: ExcelJS.Workbook, processoIds: Map<string, string>) {
	const ws = wb.getWorksheet('Arquivados');
	if (!ws) return;
	console.log('→ Arquivados…');

	// Layout: a partir da linha 11, blocos lado a lado (cols 1-4 e 6-9…)
	const blocos = [
		{ processo: 1, volumes: 3, caixas: 4, containerHeaderRow: 10, containerCol: 1 },
		{ processo: 6, volumes: 8, caixas: 9, containerHeaderRow: 10, containerCol: 6 },
	];

	// Descobrir containers na linha 10
	const containerEsq = text(ws, 10, 1);
	const containerDir = text(ws, 10, 6);

	for (const bloco of blocos) {
		const container =
			bloco.containerCol === 1 ? containerEsq : containerDir;
		if (!container) continue;

		for (let row = 12; row <= ws.rowCount; row++) {
			const num = text(ws, row, bloco.processo);
			if (!num || num.toUpperCase() === 'PROCESSO') continue;

			let processoId = processoIds.get(num);
			if (!processoId) {
				const created = await prisma.processoLicenciamento.upsert({
					where: { num_processo: num },
					create: {
						num_processo: num,
						coordenadoria: COORD,
						status_ciclo: 'ENCERRADO',
						tipo_sistema: 'FISICO',
					},
					update: { status_ciclo: 'ENCERRADO' },
				});
				processoId = created.id;
				processoIds.set(num, processoId);
			}

			const volumes = parseNumeroBr(cellValue(ws, row, bloco.volumes));
			const caixas = parseNumeroBr(cellValue(ws, row, bloco.caixas));

			await prisma.arquivamentoLicenciamento.upsert({
				where: { processo_id: processoId },
				create: {
					processo_id: processoId,
					container: container.replace(/^CONTAINER\s+/i, '').trim(),
					quantidade_volumes: volumes != null ? Math.round(volumes) : undefined,
					quantidade_caixas: caixas != null ? Math.round(caixas) : undefined,
				},
				update: {
					container: container.replace(/^CONTAINER\s+/i, '').trim(),
					quantidade_volumes: volumes != null ? Math.round(volumes) : undefined,
					quantidade_caixas: caixas != null ? Math.round(caixas) : undefined,
				},
			});
			stats.arquivamentos++;
		}
	}

	// Outros containers na planilha (linhas abaixo com novos cabeçalhos) — varredura simples
	for (let row = 12; row <= ws.rowCount; row++) {
		const maybeContainer = text(ws, row, 1);
		if (maybeContainer && /^CONTAINER\s+/i.test(maybeContainer)) {
			const container = maybeContainer.replace(/^CONTAINER\s+/i, '').trim();
			const headerRow = row + 1;
			const dataStart = row + 2;
			// próximo container ou fim
			let dataEnd = ws.rowCount;
			for (let r = dataStart; r <= ws.rowCount; r++) {
				const n = text(ws, r, 1);
				if (n && /^CONTAINER\s+/i.test(n)) {
					dataEnd = r - 1;
					break;
				}
			}
			void headerRow;
			for (let r = dataStart; r <= dataEnd; r++) {
				const num = text(ws, r, 1);
				if (!num || num.toUpperCase() === 'PROCESSO') continue;
				if (/^TOTAL/i.test(num)) continue;
				if (/^CONTAINER/i.test(num)) continue;

				let processoId = processoIds.get(num);
				if (!processoId) {
					const created = await prisma.processoLicenciamento.upsert({
						where: { num_processo: num },
						create: {
							num_processo: num,
							coordenadoria: COORD,
							status_ciclo: 'ENCERRADO',
							tipo_sistema: 'FISICO',
						},
						update: { status_ciclo: 'ENCERRADO' },
					});
					processoId = created.id;
					processoIds.set(num, processoId);
				}
				const volumes = parseNumeroBr(cellValue(ws, r, 3));
				const caixas = parseNumeroBr(cellValue(ws, r, 4));
				await prisma.arquivamentoLicenciamento.upsert({
					where: { processo_id: processoId },
					create: {
						processo_id: processoId,
						container,
						quantidade_volumes: volumes != null ? Math.round(volumes) : undefined,
						quantidade_caixas: caixas != null ? Math.round(caixas) : undefined,
					},
					update: {
						container,
						quantidade_volumes: volumes != null ? Math.round(volumes) : undefined,
						quantidade_caixas: caixas != null ? Math.round(caixas) : undefined,
					},
				});
				stats.arquivamentos++;
			}
		}
	}
}

async function main() {
	const file = argFile();
	if (!fs.existsSync(file)) {
		throw new Error(`Arquivo não encontrado: ${file}`);
	}

	console.log('Importação SERVIN → Gestão de Licenciamento');
	console.log('Arquivo:', file);

	const lookups = await cacheLookups();
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(file);

	await importProcessosSheet(wb, 'Processos Ativos', COL_ATIVOS, 'ATIVO', 4, lookups);
	await importProcessosSheet(
		wb,
		'Processos Encerrados',
		COL_ENCERRADOS,
		'ENCERRADO',
		4,
		lookups,
	);
	await importFisicos(wb, lookups);

	const processoIds = await mapaProcessosServin();
	await importMultiplosSqls(wb, processoIds);
	await importEventos(wb, lookups, processoIds);
	await importEventosAdm(wb, lookups, processoIds);
	await importOficios(wb, lookups, processoIds);
	await importCategorias(wb, lookups, processoIds);
	await importArquivados(wb, processoIds);

	console.log('\n=== Resumo ===');
	console.log(JSON.stringify(stats, null, 2));
	if (stats.erros.length) {
		console.log('\nPrimeiros erros:');
		for (const e of stats.erros.slice(0, 20)) console.log('-', e);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
