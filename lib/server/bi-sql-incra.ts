import sql from 'mssql';
import type { GeoSampaLogFn } from '@/types/geosampa';
import { montarSqlDaLocalizacao, normalizarSql, parseSqlParaLocalizacao } from '@/lib/geosampa-sql.util';
import { candidatosNumProcessoBi } from './bi-processo';
import { getBiPool } from './bi-cadastro';
import { normalizarProtocoloAd } from './protocolo-ad';

export interface SetorQuadraBi {
	setor: string;
	quadra: string;
}

export type BuscarSqlsBiOpts = {
	/** Protocolo Aprova Digital — usado se não achar pelo nº SEI em `processo`. */
	protocoloAd?: string | null;
};

function dedupeSqlsNormalizados(brutos: (string | null | undefined)[]): string[] {
	const vistos = new Set<string>();
	const out: string[] = [];
	for (const bruto of brutos) {
		if (!bruto?.trim()) continue;
		const loc = parseSqlParaLocalizacao(bruto.trim());
		const norm =
			normalizarSql(bruto) ?? (loc ? montarSqlDaLocalizacao(loc) : null);
		if (!norm || vistos.has(norm)) continue;
		vistos.add(norm);
		out.push(norm);
	}
	return out;
}

/** Cláusula WHERE para match de protocolo AD (mesmo padrão de prata_categoria). */
function whereProtocoloAd(coluna: string): string {
	return `
		${coluna} IS NOT NULL
		AND (
			${coluna} = @limpo
			OR (
				@nucleo <> ''
				AND (
					${coluna} = @nucleo
					OR ${coluna} LIKE @nucleo + '-%'
					OR LTRIM(RTRIM(REPLACE(${coluna}, '#', ''))) = @nucleo
					OR LTRIM(RTRIM(REPLACE(${coluna}, '#', ''))) LIKE @nucleo + '-%'
					OR REPLACE(${coluna}, '/', '-') = @nucleo
					OR REPLACE(${coluna}, '/', '-') LIKE @nucleo + '-%'
				)
			)
			OR (
				@digits <> ''
				AND LEN(@digits) >= 5
				AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${coluna}, '#', ''), '.', ''), '/', ''), '-', ''), ' ', '')
					LIKE @digits + '%'
			)
		)
	`;
}

async function buscarSqlsPorProtocoloAdNoBi(
	protocoloAd: string,
	log: GeoSampaLogFn,
): Promise<string[]> {
	const norm = normalizarProtocoloAd(protocoloAd);
	if (!norm) return [];

	const pool = await getBiPool();
	const req = pool
		.request()
		.input('limpo', sql.VarChar(80), norm.limpo)
		.input('nucleo', sql.VarChar(20), norm.nucleo ?? '')
		.input('digits', sql.VarChar(20), norm.digitsNucleo ?? '');

	const prata = await req.query<{ sql_incra: string | null }>(`
		SELECT DISTINCT sql_incra
		FROM dbo.prata_sql_incra
		WHERE sql_incra IS NOT NULL
			AND LTRIM(RTRIM(sql_incra)) <> ''
			AND (${whereProtocoloAd('protocolo')})
	`);

	const sqlsPrata = dedupeSqlsNormalizados(prata.recordset.map((r) => r.sql_incra));
	if (sqlsPrata.length) {
		log(
			'success',
			`BI (prata_sql_incra.protocolo) retornou ${sqlsPrata.length} SQL(s) para protocolo AD ${norm.limpo}` +
				(norm.nucleo ? ` (núcleo ${norm.nucleo})` : ''),
		);
		return sqlsPrata;
	}

	const cad = await pool
		.request()
		.input('limpo', sql.VarChar(80), norm.limpo)
		.input('nucleo', sql.VarChar(20), norm.nucleo ?? '')
		.input('digits', sql.VarChar(20), norm.digitsNucleo ?? '')
		.query<{ SQL_Incra: string | null }>(`
			SELECT DISTINCT SQL_Incra
			FROM dbo.cadastros
			WHERE SQL_Incra IS NOT NULL
				AND LTRIM(RTRIM(SQL_Incra)) <> ''
				AND SQL_Incra LIKE '%.%.%-%'
				AND (${whereProtocoloAd('Protocolo')})
		`);

	const sqlsCad = dedupeSqlsNormalizados(cad.recordset.map((r) => r.SQL_Incra));
	if (sqlsCad.length) {
		log(
			'success',
			`BI (cadastros.Protocolo) retornou ${sqlsCad.length} SQL(s) para protocolo AD ${norm.limpo}`,
		);
	}
	return sqlsCad;
}

/**
 * Busca todos os SQLs distintos de um processo em `dbo.prata_sql_incra`
 * (vários lotes / terreno remembrado — registros atrelados ao nº SEI).
 *
 * Ordem: 1) coluna `processo` (SEI) → 2) coluna `protocolo` (AD), se informado
 * → 3) fallback `dbo.cadastros` pelo processo.
 */
export async function buscarSqlsPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
	opts?: BuscarSqlsBiOpts,
): Promise<string[]> {
	try {
		const pool = await getBiPool();
		const candidatos = candidatosNumProcessoBi(numProcesso);
		if (!candidatos.length && !opts?.protocoloAd?.trim()) return [];

		if (candidatos.length) {
			const reqPrata = pool.request();
			const paramsPrata: string[] = [];
			candidatos.forEach((c, idx) => {
				const name = `p${idx}`;
				reqPrata.input(name, sql.VarChar(50), c);
				paramsPrata.push(`@${name}`);
			});

			const prata = await reqPrata.query<{ sql_incra: string | null }>(`
				SELECT DISTINCT sql_incra
				FROM dbo.prata_sql_incra
				WHERE processo IN (${paramsPrata.join(',')})
					AND sql_incra IS NOT NULL
					AND LTRIM(RTRIM(sql_incra)) <> ''
			`);

			const sqlsPrata = dedupeSqlsNormalizados(prata.recordset.map((r) => r.sql_incra));
			if (sqlsPrata.length) {
				log(
					'success',
					`BI (prata_sql_incra.processo) retornou ${sqlsPrata.length} SQL(s) para ${numProcesso}`,
				);
				return sqlsPrata;
			}
		}

		// Fallback: protocolo AD na coluna `protocolo`
		if (opts?.protocoloAd?.trim()) {
			log(
				'info',
				`Nenhum SQL pelo processo SEI ${numProcesso} — tentando protocolo AD ${opts.protocoloAd.trim()}...`,
			);
			const sqlsProto = await buscarSqlsPorProtocoloAdNoBi(opts.protocoloAd, log);
			if (sqlsProto.length) return sqlsProto;
		}

		if (!candidatos.length) {
			log('warn', `Nenhum SQL encontrado no BI para ${numProcesso}`);
			return [];
		}

		const proc = numProcesso.trim();
		const digits = proc.replace(/\D/g, '');
		const cadastros = await pool
			.request()
			.input('processo', sql.VarChar(50), `%${proc}%`)
			.input('digits', sql.VarChar(30), digits)
			.query<{ SQL_Incra: string | null }>(`
				SELECT DISTINCT SQL_Incra
				FROM dbo.cadastros
				WHERE (
					Processo LIKE @processo
					OR REPLACE(REPLACE(REPLACE(REPLACE(Processo, '.', ''), '/', ''), '-', ''), ' ', '') = @digits
				)
					AND SQL_Incra IS NOT NULL
					AND LTRIM(RTRIM(SQL_Incra)) <> ''
					AND SQL_Incra LIKE '%.%.%-%'
			`);

		const sqlsCad = dedupeSqlsNormalizados(cadastros.recordset.map((r) => r.SQL_Incra));
		if (sqlsCad.length) {
			log(
				'success',
				`BI (cadastros.Processo) retornou ${sqlsCad.length} SQL(s) para ${numProcesso}`,
			);
		} else {
			log('warn', `Nenhum SQL encontrado no BI para ${numProcesso}`);
		}
		return sqlsCad;
	} catch (error) {
		console.error('[BI] Falha ao buscar SQLs por processo:', error);
		log('error', `Falha ao consultar SQLs no BI: ${(error as Error).message}`);
		return [];
	}
}

/**
 * Busca todos os SQLs (setor+quadra, sem lote/dígito) distintos de um processo.
 * Deduplicado por setor+quadra (busca do V / R$/m²).
 */
export async function buscarSetoresQuadrasPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
	opts?: BuscarSqlsBiOpts,
): Promise<SetorQuadraBi[]> {
	const sqls = await buscarSqlsPorProcessoNoBi(numProcesso, log, opts);
	const vistos = new Set<string>();
	const combos: SetorQuadraBi[] = [];
	for (const sqlNorm of sqls) {
		const loc = parseSqlParaLocalizacao(sqlNorm);
		if (!loc) continue;
		const chave = `${loc.setor}-${loc.quadra}`;
		if (vistos.has(chave)) continue;
		vistos.add(chave);
		combos.push({ setor: loc.setor, quadra: loc.quadra });
	}
	return combos;
}

/**
 * Busca um codlog "padrão" (o mais frequente) para o processo em
 * `dbo.prata_endereco` — usado como fallback quando o processo ainda não tem
 * `localizacao_lote` salva localmente (antes de rodar "Atualizar do GeoSampa").
 * Se não achar pelo SEI, tenta pela coluna `protocolo`.
 */
export async function buscarCodlogPadraoPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
	opts?: BuscarSqlsBiOpts,
): Promise<string | null> {
	try {
		const pool = await getBiPool();
		const candidatos = candidatosNumProcessoBi(numProcesso);

		if (candidatos.length) {
			const req = pool.request();
			const params: string[] = [];
			candidatos.forEach((c, idx) => {
				const name = `p${idx}`;
				req.input(name, sql.VarChar(50), c);
				params.push(`@${name}`);
			});

			const result = await req.query<{ codlog: string | null; qtd: number }>(`
				SELECT codlog, COUNT(*) AS qtd
				FROM dbo.prata_endereco
				WHERE processo IN (${params.join(',')})
					AND codlog IS NOT NULL AND LTRIM(RTRIM(codlog)) <> ''
				GROUP BY codlog
				ORDER BY qtd DESC
			`);

			const codlog = result.recordset[0]?.codlog?.trim() || null;
			if (codlog) return codlog;
		}

		if (opts?.protocoloAd?.trim()) {
			const norm = normalizarProtocoloAd(opts.protocoloAd);
			if (norm) {
				log(
					'info',
					`Nenhum codlog pelo processo SEI — tentando protocolo AD ${norm.limpo}...`,
				);
				const byProto = await pool
					.request()
					.input('limpo', sql.VarChar(80), norm.limpo)
					.input('nucleo', sql.VarChar(20), norm.nucleo ?? '')
					.input('digits', sql.VarChar(20), norm.digitsNucleo ?? '')
					.query<{ codlog: string | null; qtd: number }>(`
						SELECT codlog, COUNT(*) AS qtd
						FROM dbo.prata_endereco
						WHERE codlog IS NOT NULL AND LTRIM(RTRIM(codlog)) <> ''
							AND (${whereProtocoloAd('protocolo')})
						GROUP BY codlog
						ORDER BY qtd DESC
					`);
				const codlog = byProto.recordset[0]?.codlog?.trim() || null;
				if (codlog) return codlog;
			}
		}

		log('warn', `Nenhum codlog encontrado no BI (dbo.prata_endereco) para ${numProcesso}`);
		return null;
	} catch (error) {
		console.error('[BI] Falha ao buscar codlog por processo:', error);
		log('error', `Falha ao consultar dbo.prata_endereco: ${(error as Error).message}`);
		return null;
	}
}
