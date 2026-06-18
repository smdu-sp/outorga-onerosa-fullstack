import { normalizarSql } from '@/lib/geosampa-sql.util';
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
		if (!config) {
			throw new Error('BI_DATABASE_URL não configurada.');
		}
		poolPromise = new sql.ConnectionPool(config).connect();
	}
	return poolPromise;
}

/** Busca o SQL do lote na view dbo.cadastro do BI pelo número do processo. */
export async function buscarSqlPorProcessoNoBi(numProcesso: string): Promise<string | null> {
	try {
		const pool = await getBiPool();
		const result = await pool
			.request()
			.input('processo', sql.VarChar(50), numProcesso.trim())
			.query<{ sql_incra: string | null }>(`
				SELECT TOP 1 sql_incra
				FROM dbo.cadastro
				WHERE processo = @processo
					AND sql_incra IS NOT NULL
					AND LTRIM(RTRIM(sql_incra)) <> ''
			`);

		const bruto = result.recordset[0]?.sql_incra;
		if (!bruto) return null;

		return normalizarSql(bruto);
	} catch (error) {
		console.error('[BI] Falha ao buscar SQL por processo:', error);
		return null;
	}
}
