import { montarSqlDaLocalizacao, normalizarSql, parseSqlParaLocalizacao } from '@/lib/geosampa-sql.util';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buscarSqlsPorProcessoNoBi } from '@/lib/server/bi-sql-incra';
import { buscarLoteBasicoPorSql } from '@/lib/server/geosampa';
import type { GeoSampaLogFn, IGeoSampaResult } from '@/types/geosampa';

export type SqlCampos = {
	setor: string | null;
	quadra: string | null;
	lote_cadastrado: string | null;
	lote_atualizado: string | null;
	codigo_logradouro?: string | null;
};

export type SqlLoteDados = {
	sql: string;
	setor: string | null;
	quadra: string | null;
	lote_cadastrado: string | null;
	lote_atualizado: string | null;
	codigo_logradouro: string | null;
	coordenada_e: number | null;
	coordenada_n: number | null;
	enderecos: {
		ordem: number;
		tipo?: string | null;
		titulo?: string | null;
		nome?: string | null;
		numero?: string | null;
	}[];
};

const MAX_SQLS_ENRIQUECER = 30;

export function sqlFormatadoDeCampos(campos: {
	setor?: string | null;
	quadra?: string | null;
	lote_cadastrado?: string | null;
}): string | null {
	return montarSqlDaLocalizacao(campos);
}

export function camposDeSqlFormatado(sqlNorm: string): SqlCampos | null {
	const norm = normalizarSql(sqlNorm);
	if (!norm) return null;
	const loc = parseSqlParaLocalizacao(norm);
	if (!loc) return null;
	return {
		setor: loc.setor,
		quadra: loc.quadra,
		lote_cadastrado: loc.lote_cadastrado,
		lote_atualizado: loc.lote_cadastrado,
	};
}

/** Junta SQLs priorizando a ordem dada (ex.: SQL usado no GeoSampa primeiro). */
export function mesclarListasSql(...listas: (string | null | undefined)[][]): string[] {
	const vistos = new Set<string>();
	const out: string[] = [];
	for (const lista of listas) {
		for (const bruto of lista) {
			if (!bruto?.trim()) continue;
			const norm = normalizarSql(bruto);
			if (!norm || vistos.has(norm)) continue;
			vistos.add(norm);
			out.push(norm);
		}
	}
	return out;
}

function numCoord(valor: string | number | null | undefined): number | null {
	if (valor == null || valor === '') return null;
	const n = typeof valor === 'number' ? valor : Number(valor);
	return Number.isFinite(n) ? n : null;
}

/** Monta registro de SQL a partir do resultado do GeoSampa (ou só do número SQL). */
export function geoResultadoParaSqlLote(
	sqlNorm: string,
	geo: IGeoSampaResult | null | undefined,
	codlogFallback?: string | null,
): SqlLoteDados {
	const base = camposDeSqlFormatado(sqlNorm);
	const loc = geo?.localizacao_lote;
	return {
		sql: sqlNorm,
		setor: loc?.setor?.trim() || base?.setor || null,
		quadra: loc?.quadra?.trim() || base?.quadra || null,
		lote_cadastrado: loc?.lote_cadastrado?.trim() || base?.lote_cadastrado || null,
		lote_atualizado:
			loc?.lote_atualizado?.trim() ||
			loc?.lote_cadastrado?.trim() ||
			base?.lote_atualizado ||
			null,
		codigo_logradouro:
			loc?.codigo_logradouro?.trim() ||
			codlogFallback?.trim() ||
			null,
		coordenada_e: numCoord(geo?.coordenada?.coordenada_e),
		coordenada_n: numCoord(geo?.coordenada?.coordenada_n),
		enderecos: (geo?.enderecos ?? []).map((e, i) => ({
			ordem: e.ordem || i + 1,
			tipo: e.tipo ?? null,
			titulo: e.titulo ?? null,
			nome: e.nome ?? null,
			numero: e.numero ?? null,
		})),
	};
}

/**
 * Para cada SQL, consulta o lote no GeoSampa (WFS básico) e monta os dados a gravar.
 * `geoPrimario` evita reconsultar o SQL já usado na ficha de monitoramento.
 */
export async function enriquecerSqlsComLotesGeoSampa(
	sqls: string[],
	opts?: {
		sqlPrimario?: string | null;
		geoPrimario?: IGeoSampaResult | null;
		codlogFallback?: string | null;
		log?: GeoSampaLogFn;
	},
): Promise<SqlLoteDados[]> {
	const log = opts?.log ?? (() => {});
	const lista = mesclarListasSql(sqls).slice(0, MAX_SQLS_ENRIQUECER);
	const sqlPrimario = opts?.sqlPrimario ? normalizarSql(opts.sqlPrimario) : null;
	const lotes: SqlLoteDados[] = [];

	for (const sqlNorm of lista) {
		if (sqlPrimario && sqlNorm === sqlPrimario && opts?.geoPrimario) {
			lotes.push(
				geoResultadoParaSqlLote(sqlNorm, opts.geoPrimario, opts.codlogFallback),
			);
			continue;
		}

		log('info', `Consultando lote no GeoSampa para SQL ${sqlNorm}...`);
		const geo = await buscarLoteBasicoPorSql(sqlNorm, log);
		if (geo) {
			log('success', `Lote obtido para ${sqlNorm}`);
		} else {
			log('warn', `Sem lote no GeoSampa para ${sqlNorm} — gravando só o SQL`);
		}
		lotes.push(geoResultadoParaSqlLote(sqlNorm, geo, opts?.codlogFallback));
	}

	return lotes;
}

/**
 * Substitui os registros em `sqls` (+ endereços) pelos lotes enriquecidos.
 */
export async function substituirSqlsEnriquecidosDoProcesso(
	processoId: string,
	lotes: SqlLoteDados[],
	opts?: { tx?: Prisma.TransactionClient },
): Promise<string[]> {
	const db = opts?.tx ?? prisma;

	await db.sql.deleteMany({ where: { processo_id: processoId } });

	const sqls: string[] = [];
	for (const lote of lotes) {
		const criado = await db.sql.create({
			data: {
				processo_id: processoId,
				setor: lote.setor,
				quadra: lote.quadra,
				lote_cadastrado: lote.lote_cadastrado,
				lote_atualizado: lote.lote_atualizado,
				codigo_logradouro: lote.codigo_logradouro,
				coordenada_e: lote.coordenada_e,
				coordenada_n: lote.coordenada_n,
				enderecos:
					lote.enderecos.length > 0
						? {
								create: lote.enderecos.map((e) => ({
									ordem: e.ordem,
									tipo: e.tipo,
									titulo: e.titulo,
									nome: e.nome,
									numero: e.numero,
								})),
							}
						: undefined,
			},
		});
		void criado;
		sqls.push(lote.sql);
	}
	return sqls;
}

/**
 * Substitui os registros em `sqls` do processo pelos SQLs informados
 * (setor/quadra/lote derivados do formato 000.000.0000-0) — sem GeoSampa.
 */
export async function substituirSqlsDoProcesso(
	processoId: string,
	sqls: string[],
	opts?: {
		codlog?: string | null;
		tx?: Prisma.TransactionClient;
	},
): Promise<string[]> {
	const lista = mesclarListasSql(sqls);
	const lotes = lista.map((sqlNorm) =>
		geoResultadoParaSqlLote(sqlNorm, null, opts?.codlog),
	);
	return substituirSqlsEnriquecidosDoProcesso(processoId, lotes, { tx: opts?.tx });
}

/**
 * Consulta o BI, enriquece cada SQL no GeoSampa e grava em `sqls`.
 * Retorna a lista de SQLs gravados (primeiro = principal).
 */
export async function sincronizarSqlsDoProcessoComBi(
	processoId: string,
	numProcesso: string,
	opts?: {
		sqlsExtras?: (string | null | undefined)[];
		sqlPrimario?: string | null;
		geoPrimario?: IGeoSampaResult | null;
		codlog?: string | null;
		protocoloAd?: string | null;
		tx?: Prisma.TransactionClient;
		log?: GeoSampaLogFn;
		/** Se false, só grava SQL sem consultar GeoSampa (default: true). */
		enriquecerGeoSampa?: boolean;
	},
): Promise<string[]> {
	const sqlsBi = await buscarSqlsPorProcessoNoBi(numProcesso, opts?.log, {
		protocoloAd: opts?.protocoloAd,
	});
	const lista = mesclarListasSql(opts?.sqlsExtras ?? [], sqlsBi);
	if (!lista.length) return [];

	const enriquecer = opts?.enriquecerGeoSampa !== false;
	const lotes = enriquecer
		? await enriquecerSqlsComLotesGeoSampa(lista, {
				sqlPrimario: opts?.sqlPrimario,
				geoPrimario: opts?.geoPrimario,
				codlogFallback: opts?.codlog,
				log: opts?.log,
			})
		: lista.map((s) => geoResultadoParaSqlLote(s, null, opts?.codlog));

	return substituirSqlsEnriquecidosDoProcesso(processoId, lotes, { tx: opts?.tx });
}
