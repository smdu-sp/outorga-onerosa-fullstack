import { normalizarSql } from '@/lib/geosampa-sql.util';
import type { GeoSampaLogFn, IGeoSampaLicenca } from '@/types/geosampa';
import sql, { type config as MssqlConfig } from 'mssql';

type TipoLicenca = IGeoSampaLicenca['tipo'];

type BiAssuntoLicenca = {
	Assunto: string | null;
	NumDocumento: string | null;
	StatusDocumento: string | null;
	DtEmissaoDocumento: Date | null;
};

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
		requestTimeout: 30_000,
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

function normalizarTexto(valor: string): string {
	return valor
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

/** Classifica o assunto do BI nos tipos de licença do monitoramento OODC. */
export function classificarAssuntoComoLicenca(assunto: string): TipoLicenca[] {
	const a = normalizarTexto(assunto);
	if (
		a.includes('demolic') ||
		a.includes('elevador') ||
		a.includes('funcionamento') ||
		a.includes('tapume') ||
		a.includes('estande') ||
		a.includes('equipamento') ||
		a.includes('radio') ||
		a.includes('movimento de terra') ||
		a.includes('muro de arrimo') ||
		a.includes('desdobro') ||
		a.includes('reconsider') ||
		a.includes('apostilamento')
	) {
		return [];
	}

	if (a.includes('certificado de conclus')) return ['CERTIFICADO_CONCLUSAO'];
	if (a.includes('aprovacao e execucao')) return ['APROVACAO', 'EXECUCAO'];
	if (a.includes('aprovacao')) return ['APROVACAO'];
	if (a.includes('execucao')) return ['EXECUCAO'];
	return [];
}

function scoreStatusDocumento(status: string | null | undefined): number {
	const s = normalizarTexto(status ?? '');
	if (!s) return 0;
	if (s.includes('emitido') || s.includes('ativo') || s.includes('deferido')) return 3;
	if (s.includes('gerado')) return 0;
	return 1;
}

function dataIso(d: Date | null | undefined): string | undefined {
	if (!d) return undefined;
	return d.toISOString().slice(0, 10);
}

/**
 * Busca alvarás/certificado no BI pelo SQL do lote (Cadastros → Assuntos).
 * O GeoSampa (lote) não traz essas licenças; a camada outorga_onerosa traz no máximo
 * um número de alvará. Preferir sempre o que já veio do GeoSampa e usar o BI só
 * para preencher lacunas.
 */
export async function buscarLicencasPorSqlNoBi(
	sqlLote: string,
	log: GeoSampaLogFn = () => {},
): Promise<IGeoSampaLicenca[]> {
	try {
		const pool = await getBiPool();
		const digits = sqlLote.replace(/\D/g, '');
		if (digits.length < 10) {
			log('warn', `SQL inválido para busca de licenças no BI: ${sqlLote}`);
			return [];
		}

		const result = await pool
			.request()
			.input('digits', sql.VarChar(20), digits)
			.query<BiAssuntoLicenca>(`
				SELECT
					a.Assunto,
					a.NumDocumento,
					a.StatusDocumento,
					a.DtEmissaoDocumento
				FROM dbo.Cadastros c
				INNER JOIN dbo.Assuntos a ON a.id_assunto = c.id_assunto
				WHERE REPLACE(REPLACE(REPLACE(c.SQL_Incra, '.', ''), '-', ''), ' ', '') = @digits
					AND a.NumDocumento IS NOT NULL
					AND LTRIM(RTRIM(a.NumDocumento)) <> ''
					AND (
						a.Assunto LIKE 'Alvará de Aprovação%'
						OR a.Assunto LIKE 'Alvará de Execução%'
						OR a.Assunto LIKE 'Certificado de Conclus%'
					)
			`);

		type Candidato = IGeoSampaLicenca & { score: number; ts: number };
		const melhorPorTipo = new Map<TipoLicenca, Candidato>();

		for (const row of result.recordset) {
			const assunto = row.Assunto?.trim();
			const numero = row.NumDocumento?.trim();
			if (!assunto || !numero) continue;

			const tipos = classificarAssuntoComoLicenca(assunto);
			if (!tipos.length) continue;

			const score = scoreStatusDocumento(row.StatusDocumento);
			const ts = row.DtEmissaoDocumento?.getTime() ?? 0;
			const data_expedicao = dataIso(row.DtEmissaoDocumento);

			for (const tipo of tipos) {
				const atual = melhorPorTipo.get(tipo);
				const candidato: Candidato = {
					tipo,
					numero,
					tipo_documento: assunto,
					data_expedicao,
					score,
					ts,
				};
				if (
					!atual ||
					candidato.score > atual.score ||
					(candidato.score === atual.score && candidato.ts > atual.ts)
				) {
					melhorPorTipo.set(tipo, candidato);
				}
			}
		}

		const licencas: IGeoSampaLicenca[] = [...melhorPorTipo.values()].map(
			({ score: _s, ts: _t, ...licenca }) => licenca,
		);

		if (!licencas.length) {
			log('warn', `Nenhuma licença (aprovação/execução/conclusão) no BI para SQL ${sqlLote}`);
		} else {
			log(
				'success',
				`BI retornou ${licencas.length} licença(s) para SQL ${sqlLote}: ${licencas
					.map((l) => l.tipo)
					.join(', ')}`,
			);
		}

		return licencas;
	} catch (error) {
		console.error('[BI] Falha ao buscar licenças por SQL:', error);
		log('error', `Falha ao consultar licenças no BI: ${(error as Error).message}`);
		return [];
	}
}

/** Mantém licenças já existentes (ex.: GeoSampa) e completa tipos faltantes com o BI. */
export function mesclarLicencasPreferindoExistentes(
	existentes: IGeoSampaLicenca[] | undefined,
	complemento: IGeoSampaLicenca[],
): IGeoSampaLicenca[] | undefined {
	const porTipo = new Map<TipoLicenca, IGeoSampaLicenca>();

	for (const licenca of existentes ?? []) {
		if (!licenca.tipo) continue;
		if (licenca.numero?.trim() || licenca.tipo_documento?.trim()) {
			porTipo.set(licenca.tipo, licenca);
		}
	}

	for (const licenca of complemento) {
		if (!porTipo.has(licenca.tipo) && (licenca.numero?.trim() || licenca.tipo_documento?.trim())) {
			porTipo.set(licenca.tipo, licenca);
		}
	}

	const mescladas = [...porTipo.values()];
	return mescladas.length ? mescladas : undefined;
}

/** Tipos de licença ainda sem número — indica que vale consultar o BI. */
export function tiposLicencaFaltantes(
	licencas: IGeoSampaLicenca[] | undefined,
): TipoLicenca[] {
	const presentes = new Set(
		(licencas ?? [])
			.filter((l) => l.numero?.trim())
			.map((l) => l.tipo),
	);
	return (['APROVACAO', 'EXECUCAO', 'CERTIFICADO_CONCLUSAO'] as TipoLicenca[]).filter(
		(t) => !presentes.has(t),
	);
}
