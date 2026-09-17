import sql from 'mssql';
import type { GeoSampaLogFn } from '@/types/geosampa';
import { getBiPool } from './bi-cadastro';
import { normalizarProtocoloAd } from './protocolo-ad';

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

function mapearLinhasCategoria(
	recordset: {
		codcategoria: string | null;
		codsubcategoria: string | null;
		txtsubcategoria: string | null;
		areaComputavel: string | null;
		areaNaoComputavel: string | null;
	}[],
): CategoriaBiEncontrada[] {
	return recordset
		.map((r) => ({
			codcategoria: r.codcategoria?.trim() || null,
			codsubcategoria: r.codsubcategoria?.trim() || null,
			txtsubcategoria: r.txtsubcategoria?.trim() || null,
			areaComputavelM2: parseNumeroBi(r.areaComputavel),
			areaNaoComputavelM2: parseNumeroBi(r.areaNaoComputavel),
		}))
		.filter((r) => r.areaComputavelM2 > 0);
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
 *
 * Match do processo: igualdade exata OU só dígitos (tolera formatação 1020.2021/… vs BI).
 */
export async function buscarCategoriasPorProcessoNoBi(
	numProcesso: string,
	log: GeoSampaLogFn = () => {},
): Promise<CategoriaBiEncontrada[]> {
	try {
		const pool = await getBiPool();
		const proc = numProcesso.trim();
		const digits = proc.replace(/\D/g, '');
		const result = await pool
			.request()
			.input('processo', sql.VarChar(50), proc)
			.input('digits', sql.VarChar(30), digits)
			.query<{
				codcategoria: string | null;
				codsubcategoria: string | null;
				txtsubcategoria: string | null;
				areaComputavel: string | null;
				areaNaoComputavel: string | null;
			}>(`
				SELECT codcategoria, codsubcategoria, txtsubcategoria, areaComputavel, areaNaoComputavel
				FROM dbo.prata_categoria
				WHERE sistema = 'AprovaDigital'
					AND (
						processo = @processo
						OR REPLACE(REPLACE(REPLACE(REPLACE(processo, '.', ''), '/', ''), '-', ''), ' ', '') = @digits
					)
			`);

		const linhas = mapearLinhasCategoria(result.recordset);

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

/**
 * Busca categorias no BI pela coluna `protocolo` (Aprova Digital).
 * Tolera `#33287-23`, `33287-23-SP-ALV`, `AD: 44005-24-SP-MOD`, `49080/2020`.
 */
export async function buscarCategoriasPorProtocoloAdNoBi(
	protocoloAd: string,
	log: GeoSampaLogFn = () => {},
): Promise<CategoriaBiEncontrada[]> {
	const norm = normalizarProtocoloAd(protocoloAd);
	if (!norm) {
		log('warn', 'Protocolo AD vazio — não consulta BI');
		return [];
	}

	try {
		const pool = await getBiPool();
		const req = pool
			.request()
			.input('limpo', sql.VarChar(80), norm.limpo)
			.input('nucleo', sql.VarChar(20), norm.nucleo ?? '')
			.input('digits', sql.VarChar(20), norm.digitsNucleo ?? '');

		const result = await req.query<{
			codcategoria: string | null;
			codsubcategoria: string | null;
			txtsubcategoria: string | null;
			areaComputavel: string | null;
			areaNaoComputavel: string | null;
			protocolo: string | null;
		}>(`
			SELECT codcategoria, codsubcategoria, txtsubcategoria, areaComputavel, areaNaoComputavel, protocolo
			FROM dbo.prata_categoria
			WHERE sistema = 'AprovaDigital'
				AND protocolo IS NOT NULL
				AND (
					protocolo = @limpo
					OR (
						@nucleo <> ''
						AND (
							protocolo = @nucleo
							OR protocolo LIKE @nucleo + '-%'
							OR LTRIM(RTRIM(REPLACE(protocolo, '#', ''))) = @nucleo
							OR LTRIM(RTRIM(REPLACE(protocolo, '#', ''))) LIKE @nucleo + '-%'
						)
					)
					OR (
						@digits <> ''
						AND LEN(@digits) >= 5
						AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(protocolo, '#', ''), '.', ''), '/', ''), '-', ''), ' ', '')
							LIKE @digits + '%'
					)
				)
		`);

		const linhas = mapearLinhasCategoria(result.recordset);
		const protoHit = result.recordset[0]?.protocolo?.trim();

		if (!linhas.length) {
			log(
				'warn',
				`Nenhuma categoria no BI para protocolo AD ${norm.limpo}` +
					(norm.nucleo ? ` (núcleo ${norm.nucleo})` : ''),
			);
		} else {
			log(
				'success',
				`BI protocolo ${protoHit ?? norm.limpo}: ${linhas.length} categoria(s)`,
			);
		}
		return linhas;
	} catch (error) {
		console.error('[BI] Falha ao buscar categorias por protocolo AD:', error);
		log('error', `Falha ao consultar protocolo no BI: ${(error as Error).message}`);
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
 * `codcategoria`/`codsubcategoria` do BI (e tokens do GeoSampa tipo `HIS/R2v`) têm
 * milhares de variantes sujas. Mapeia para `TIPOLOGIAS` (`lib/oodc/tabelas.ts`):
 * - HIS → 1
 * - R2v / RV2 / R2h / R1 / R2 → 8 (habitação > 70 m²; sem área da UH não dá pra
 *   distinguir 4–7)
 * - NR* → 24 (outras atividades)
 * HMP existe mas não dá pra saber a faixa (2 = até 50 m² / 3 = 51–70 m²) — fica
 * `null` (usuário escolhe). EHIS é classificação do empreendimento, não tipologia.
 */
export function sugerirIdTipologiaDeCategoria(
	codsubcategoria: string | null,
	codcategoria?: string | null,
): number | null {
	const s = normalizarTexto(`${codcategoria ?? ''} ${codsubcategoria ?? ''}`);
	if (!s) return null;
	if (/\bEHIS\b/.test(s)) return null;
	if (/\bHIS\b/.test(s)) return 1;
	if (/\bHMP\b/.test(s) || /H\.M\.P/.test(s)) return null;
	if (/\bR2V\b|\bRV2\b|\bR2H\b|\bR2-V\b|\bR2-H\b/.test(s)) return 8;
	if (/\bR1\b|\bR2\b/.test(s)) return 8;
	if (/\bNR\d|\bNR1|\bNR2|\bNR3|^NR\b/.test(s)) return 24;
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

/**
 * Agrega categorias do BI no código `tipologia_uso_oodc` (R / nR / R/nR).
 * Residencial + Não Residencial no mesmo processo → Uso Misto (`R/nR`).
 */
export function classificarTipologiaUsoDeCategorias(
	linhas: Pick<CategoriaBiEncontrada, 'codcategoria' | 'codsubcategoria'>[],
): 'R' | 'nR' | 'R/nR' | null {
	const usos = new Set<'R' | 'nR'>();
	for (const l of linhas) {
		const u = classificarUsoCategoria(l.codcategoria, l.codsubcategoria);
		if (u) usos.add(u);
	}
	if (usos.size === 0) return null;
	if (usos.has('R') && usos.has('nR')) return 'R/nR';
	return [...usos][0]!;
}

/** True se o valor já está no domínio canônico R / nR / R/nR. */
export function ehTipologiaUsoCanonica(valor: string | null | undefined): boolean {
	const t = valor?.trim();
	return t === 'R' || t === 'nR' || t === 'R/nR';
}

/**
 * Normaliza texto sujo da planilha/GeoSampa (`HMP/R2v/nR1`, `R2v-02`, `NR1`…)
 * para o domínio canônico usado nos relatórios.
 */
export function normalizarTipologiaUsoOodc(
	raw: string | null | undefined,
): 'R' | 'nR' | 'R/nR' | null {
	if (!raw?.trim()) return null;
	const t = raw.trim();
	if (ehTipologiaUsoCanonica(t)) return t as 'R' | 'nR' | 'R/nR';

	const texto = normalizarTexto(t);
	const temR =
		/\bHIS\b|\bHMP\b|H\.M\.P|\bEHIS\b|\bEHMP\b|\bEZEIS\b|\bR\d|\bR2|\bR1\b|^R(\/|$)/.test(
			texto,
		) || /(^|\/|\s)R(\d|2V|2H|\/|$)/.test(texto);
	const temNr =
		/\bNR\b|\bNR\d|NAO\s*RESIDENCIAL/.test(texto) ||
		/(^|\/|\s)NR/.test(texto);

	// Heurística em string concatenada tipo "R2v/nR1"
	const partes = texto.split(/[\/,;|+]+/).map((p) => p.trim()).filter(Boolean);
	let r = temR;
	let nr = temNr;
	for (const p of partes) {
		const u = classificarUsoCategoria(p, p);
		if (u === 'R') r = true;
		if (u === 'nR') nr = true;
	}

	if (r && nr) return 'R/nR';
	if (r) return 'R';
	if (nr) return 'nR';
	// Fallback: se parece só residencial genérico
	if (/^R\b/.test(texto) || texto === 'RESIDENCIAL') return 'R';
	return null;
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
