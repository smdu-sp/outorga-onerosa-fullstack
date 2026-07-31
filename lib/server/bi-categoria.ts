import sql from 'mssql';
import type { GeoSampaLogFn } from '@/types/geosampa';
import { getBiPool } from './bi-cadastro';

export interface CategoriaBiEncontrada {
	codcategoria: string | null;
	codsubcategoria: string | null;
	txtsubcategoria: string | null;
	areaComputavelM2: number;
	areaNaoComputavelM2: number;
}

function parseNumeroBi(valor: string | null): number {
	if (!valor) return 0;
	const n = Number(valor.trim());
	return Number.isFinite(n) ? n : 0;
}

/**
 * Busca as categorias de uso (Aprova Digital) de um processo em `dbo.prata_categoria`
 * — cada linha é uma TIPOLOGIA distinta dentro do mesmo pedido. Checado empiricamente
 * (30/07/2026): nenhum processo tem mais de um `codigoPedido` nessa tabela, então não
 * há risco de misturar reenvios/versões diferentes — todas as linhas de um processo
 * pertencem ao mesmo pedido.
 *
 * Só o sistema `AprovaDigital` preenche `areaComputavel` (os demais — Sisacoe, Portal,
 * SLCe — nunca trazem essa coluna), por isso o filtro `sistema = 'AprovaDigital'`.
 * Linhas sem área computável (> 0) são descartadas — representam o bucket "não
 * categorizado" do pedido, não uma tipologia utilizável no cálculo.
 */
export async function buscarCategoriasPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
): Promise<CategoriaBiEncontrada[]> {
	try {
		const pool = await getBiPool();
		const result = await pool
			.request()
			.input('processo', sql.VarChar(50), numProcesso.trim())
			.query<{
				codcategoria: string | null;
				codsubcategoria: string | null;
				txtsubcategoria: string | null;
				areaComputavel: string | null;
				areaNaoComputavel: string | null;
			}>(`
				SELECT codcategoria, codsubcategoria, txtsubcategoria, areaComputavel, areaNaoComputavel
				FROM dbo.prata_categoria
				WHERE processo = @processo AND sistema = 'AprovaDigital'
			`);

		const linhas = result.recordset
			.map((r) => ({
				codcategoria: r.codcategoria?.trim() || null,
				codsubcategoria: r.codsubcategoria?.trim() || null,
				txtsubcategoria: r.txtsubcategoria?.trim() || null,
				areaComputavelM2: parseNumeroBi(r.areaComputavel),
				areaNaoComputavelM2: parseNumeroBi(r.areaNaoComputavel),
			}))
			.filter((r) => r.areaComputavelM2 > 0);

		if (!linhas.length) {
			log('warn', `Nenhuma categoria com área computável no BI (Aprova Digital) para ${numProcesso}`);
		} else {
			log('success', `BI (Aprova Digital) retornou ${linhas.length} categoria(s)/tipologia(s) para ${numProcesso}`);
		}
		return linhas;
	} catch (error) {
		console.error('[BI] Falha ao buscar categorias por processo:', error);
		log('error', `Falha ao consultar dbo.prata_categoria: ${(error as Error).message}`);
		return [];
	}
}

function normalizarTexto(valor: string): string {
	return valor
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.trim();
}

/**
 * `codcategoria`/`codsubcategoria` do BI têm milhares de variantes sujas (espaços,
 * pontuação, texto embutido tipo "NR1-ESCRITORIOS EM GERAL"). HIS mapeia direto para a
 * tipologia 1 (`lib/oodc/tabelas.ts`, `TIPOLOGIAS`); HMP existe mas não dá pra saber a
 * faixa de área (2 = até 50m² / 3 = 51-70m²) sem a área da unidade — fica `null`
 * (usuário escolhe manualmente).
 */
export function sugerirIdTipologiaDeCategoria(codsubcategoria: string | null): number | null {
	const s = normalizarTexto(codsubcategoria ?? '');
	if (/\bHIS\b/.test(s) && !/\bEHIS\b/.test(s)) return 1;
	return null;
}

/**
 * 'R' quando a categoria/subcategoria indica uso residencial (inclui HIS/HMP, que não
 * começam com "R" no BI); 'nR' para tudo mais (NR*, C*, S*, E*, IND* — comércio,
 * serviço, institucional, indústria); `null` quando não há informação de categoria.
 */
export function classificarUsoCategoria(
	codcategoria: string | null,
	codsubcategoria: string | null,
): 'R' | 'nR' | null {
	const texto = normalizarTexto(`${codcategoria ?? ''} ${codsubcategoria ?? ''}`);
	if (!texto) return null;
	if (/\bHIS\b|\bHMP\b|H\.M\.P|\bEHIS\b|\bEHMP\b|\bEZEIS\b/.test(texto)) return 'R';
	if (/^NR/.test(texto)) return 'nR';
	if (/^R(\d|\s|$)/.test(texto)) return 'R';
	return 'nR';
}

/** EHIS/EHMP/EZEIS no BI indicam a CLASSIFICAÇÃO DO EMPREENDIMENTO (não a tipologia) —
 * ver `lib/oodc/tabelas.ts`, `CLASSIFICACAO_EMPREENDIMENTO`. */
export function sugerirIdClassificacaoEmpreendimento(
	linhas: Pick<CategoriaBiEncontrada, 'codcategoria' | 'codsubcategoria'>[],
): number | null {
	const texto = normalizarTexto(linhas.map((l) => `${l.codcategoria ?? ''} ${l.codsubcategoria ?? ''}`).join(' '));
	if (/\bEHIS\b/.test(texto)) return 1;
	if (/\bEHMP\b/.test(texto)) return 2;
	if (/\bEZEIS\b/.test(texto)) return 3;
	return null;
}

/** Descrição curta para mostrar como dica na UI ao lado da tipologia sugerida. */
export function descricaoCategoriaBi(linha: CategoriaBiEncontrada): string {
	const partes = [linha.codcategoria, linha.codsubcategoria].filter(Boolean);
	const cabecalho = partes.join(' / ') || 'categoria não informada';
	return linha.txtsubcategoria ? `${cabecalho} — ${linha.txtsubcategoria}` : cabecalho;
}
