import sql from 'mssql';
import type { GeoSampaLogFn } from '@/types/geosampa';
import { parseSqlParaLocalizacao } from '@/lib/geosampa-sql.util';
import { getBiPool } from './bi-cadastro';

export interface SetorQuadraBi {
	setor: string;
	quadra: string;
}

/**
 * Busca todos os SQLs (setor+quadra, sem lote/dígito) distintos de um processo em
 * `dbo.prata_sql_incra`. Um processo pode ter dezenas de lotes (ex.: terreno
 * remembrado — o processo de teste `1020.2024/0021669-9` tem 15), mas a busca do V
 * (R$/m²) só usa setor+quadra+codlog, então o retorno já vem deduplicado por
 * setor+quadra. Só o sistema `AprovaDigital` é considerado (mesma origem dos nossos
 * processos — ver `lib/server/bi-categoria.ts`).
 */
export async function buscarSetoresQuadrasPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
): Promise<SetorQuadraBi[]> {
	try {
		const pool = await getBiPool();
		const result = await pool
			.request()
			.input('processo', sql.VarChar(50), numProcesso.trim())
			.query<{ sql_incra: string | null }>(`
				SELECT DISTINCT sql_incra
				FROM dbo.prata_sql_incra
				WHERE processo = @processo AND sistema = 'AprovaDigital' AND sql_incra IS NOT NULL
			`);

		const vistos = new Set<string>();
		const combos: SetorQuadraBi[] = [];
		for (const row of result.recordset) {
			const loc = row.sql_incra ? parseSqlParaLocalizacao(row.sql_incra) : null;
			if (!loc) continue;
			const chave = `${loc.setor}-${loc.quadra}`;
			if (vistos.has(chave)) continue;
			vistos.add(chave);
			combos.push({ setor: loc.setor, quadra: loc.quadra });
		}

		if (!combos.length) {
			log('warn', `Nenhum SQL encontrado no BI (dbo.prata_sql_incra) para ${numProcesso}`);
		} else {
			log('success', `BI retornou ${combos.length} combinação(ões) setor+quadra distinta(s) para ${numProcesso}`);
		}
		return combos;
	} catch (error) {
		console.error('[BI] Falha ao buscar SQLs por processo:', error);
		log('error', `Falha ao consultar dbo.prata_sql_incra: ${(error as Error).message}`);
		return [];
	}
}

/**
 * Busca um codlog "padrão" (o mais frequente) para o processo em
 * `dbo.prata_endereco` — usado como fallback quando o processo ainda não tem
 * `localizacao_lote` salva localmente (antes de rodar "Atualizar do GeoSampa").
 * Não há vínculo direto entre cada SQL e seu codlog nas tabelas do BI — por isso
 * este valor é aplicado como sugestão para TODOS os setor+quadra encontrados, e
 * fica editável.
 */
export async function buscarCodlogPadraoPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
): Promise<string | null> {
	try {
		const pool = await getBiPool();
		const result = await pool
			.request()
			.input('processo', sql.VarChar(50), numProcesso.trim())
			.query<{ codlog: string | null; qtd: number }>(`
				SELECT codlog, COUNT(*) AS qtd
				FROM dbo.prata_endereco
				WHERE processo = @processo AND sistema = 'AprovaDigital'
					AND codlog IS NOT NULL AND LTRIM(RTRIM(codlog)) <> ''
				GROUP BY codlog
				ORDER BY qtd DESC
			`);

		const codlog = result.recordset[0]?.codlog?.trim() || null;
		if (!codlog) {
			log('warn', `Nenhum codlog encontrado no BI (dbo.prata_endereco) para ${numProcesso}`);
		}
		return codlog;
	} catch (error) {
		console.error('[BI] Falha ao buscar codlog por processo:', error);
		log('error', `Falha ao consultar dbo.prata_endereco: ${(error as Error).message}`);
		return null;
	}
}
