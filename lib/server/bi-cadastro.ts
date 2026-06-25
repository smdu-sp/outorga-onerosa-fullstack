import { normalizarSql } from '@/lib/geosampa-sql.util';
import type { GeoSampaLogFn } from '@/types/geosampa';
import sql, { type config as MssqlConfig } from 'mssql';

type BiConfig = Pick<MssqlConfig, 'server' | 'port' | 'user' | 'password' | 'database'> & {
	connectionTimeout?: number;
	requestTimeout?: number;
	options: MssqlConfig['options'];
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

function parseBiDatabaseUrl(): BiConfig | null {
	const url = process.env.BI_DATABASE_URL?.trim();
	if (!url) return null;

	const match = url.match(
		/^sqlserver:\/\/([^:]+):(\d+);user=([^;]+);database=([^;]+);password=([^;]+);encrypt=(\w+)/,
	);
	if (!match) return null;

	const [, server, port, user, database, password, encrypt] = match;
	return {
		server,
		port: Number(port),
		user,
		password,
		database,
		connectionTimeout: 15_000,
		requestTimeout: 15_000,
		options: {
			encrypt: encrypt === 'true',
			trustServerCertificate: true,
		},
	};
}

async function getBiPool(): Promise<sql.ConnectionPool> {
	if (!poolPromise) {
		const config = parseBiDatabaseUrl();
		console.log('[BI] config parsed:', JSON.stringify({ ...config, password: config?.password ? `(${config.password.length} chars)` : null }));
		if (!config) {
			throw new Error('BI_DATABASE_URL não configurada.');
		}
		poolPromise = new sql.ConnectionPool(config).connect();
	}
	return poolPromise;
}

/**
 * Busca um sqlFilho em dbo.SQLsFiliacao pelo sqlPai.
 * Usado como fallback quando o SQL não é encontrado no GeoSampa.
 */
export async function buscarSqlFilhoPorSqlPaiNoBi(
	sqlPai: string,
	log: GeoSampaLogFn = () => {},
): Promise<string | null> {
	try {
		const pool = await getBiPool();
		const digits = sqlPai.replace(/\D/g, '');

		const result = await pool
			.request()
			.input('digits', sql.VarChar(20), digits)
			.query<{ sqlFilho: string | null }>(`
				SELECT TOP 1 sqlFilho
				FROM dbo.SQLsFiliacao
				WHERE REPLACE(REPLACE(REPLACE(sqlPai, '.', ''), '-', ''), ' ', '') = @digits
					AND sqlFilho IS NOT NULL
					AND LTRIM(RTRIM(sqlFilho)) <> ''
			`);

		const bruto = result.recordset[0]?.sqlFilho;
		if (!bruto) {
			log('warn', `Nenhum sqlFilho encontrado em dbo.SQLsFiliacao para sqlPai: ${sqlPai}`);
			return null;
		}

		return normalizarSql(bruto);
	} catch (error) {
		console.error('[BI] Falha ao buscar sqlFilho por sqlPai:', error);
		log('error', `Falha ao consultar dbo.SQLsFiliacao: ${(error as Error).message}`);
		return null;
	}
}

/** Busca o SQL do lote na view dbo.cadastro do BI pelo número do processo. */
export async function buscarSqlPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
): Promise<string | null> {
	try {
		const pool = await getBiPool();

		// Primeiro verifica se o processo existe, independente do sql_incra
		const existeResult = await pool
			.request()
			.input('processo', sql.VarChar(50), `%${numProcesso.trim()}%`)
			.query<{ total: number }>(`
				SELECT COUNT(*) AS total
				FROM dbo.cadastros
				WHERE processo LIKE @processo
			`);

		const total = existeResult.recordset[0]?.total ?? 0;
		if (total === 0) {
			log('warn', `Processo não encontrado na tabela dbo.cadastros do BI: ${numProcesso}`);
			return null;
		}

		// Processo existe — agora busca o sql_incra preenchido
		const result = await pool
			.request()
			.input('processo', sql.VarChar(50), `%${numProcesso.trim()}%`)
			.query<{ sql_incra: string | null }>(`
				SELECT TOP 1 sql_incra
				FROM dbo.cadastros
				WHERE processo LIKE @processo
					AND sql_incra IS NOT NULL
					AND LTRIM(RTRIM(sql_incra)) <> ''
			`);

		const bruto = result.recordset[0]?.sql_incra;
		if (!bruto) {
			log('warn', `Processo encontrado no BI mas sem SQL do lote (sql_incra) preenchido: ${numProcesso}`);
			return null;
		}

		return normalizarSql(bruto);
	} catch (error) {
		console.error('[BI] Falha ao buscar SQL por processo:', error);
		log('error', `Falha ao consultar o banco BI: ${(error as Error).message}`);
		return null;
	}
}
