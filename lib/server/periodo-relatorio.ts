/**
 * Parser e descrição de período para relatórios (ano/mês ou intervalo de/até).
 *
 * @format
 */

import { parseDataCivil, formatarDataCivil } from '@/lib/datas';
import {
	temIntervaloDatas,
	type FiltroArrecadacao,
} from '@/lib/parcelas-utils';

const MESES = [
	'Janeiro',
	'Fevereiro',
	'Março',
	'Abril',
	'Maio',
	'Junho',
	'Julho',
	'Agosto',
	'Setembro',
	'Outubro',
	'Novembro',
	'Dezembro',
];

export type SearchParamsLike = Record<string, string | string[] | undefined>;

function getParam(params: SearchParamsLike, key: string): string | undefined {
	const v = params[key];
	return typeof v === 'string' ? v : undefined;
}

export type OpcoesParsePeriodo = {
	/**
	 * Sem `ano` na query: `corrente` = ano atual; `todos` = sem filtro de ano;
	 * `omitir` = não define ano (undefined).
	 */
	anoPadrao?: 'corrente' | 'todos' | 'omitir';
	/**
	 * Sem `mes` na query: `corrente` = mês atual; `todos` = sem filtro;
	 * `omitir` = não define mês.
	 */
	mesPadrao?: 'corrente' | 'todos' | 'omitir';
};

/**
 * Lê `de`, `ate`, `ano`, `mes` dos searchParams.
 * Intervalo livre (`de`/`ate`) tem prioridade e limpa a semântica de mês quando presente.
 */
export function parseFiltroPeriodo(
	params: SearchParamsLike,
	opts: OpcoesParsePeriodo = {},
): FiltroArrecadacao {
	const { anoPadrao = 'corrente', mesPadrao = 'omitir' } = opts;
	const hoje = new Date();
	const filtro: FiltroArrecadacao = {};

	const deRaw = getParam(params, 'de');
	const ateRaw = getParam(params, 'ate');
	const de = deRaw ? parseDataCivil(deRaw) : null;
	const ate = ateRaw ? parseDataCivil(ateRaw) : null;

	if (de) filtro.dataInicio = de;
	if (ate) filtro.dataFim = ate;

	if (temIntervaloDatas(filtro)) {
		return filtro;
	}

	const anoRaw = getParam(params, 'ano');
	const mesRaw = getParam(params, 'mes');

	if (anoRaw === 'todos') {
		// sem ano
	} else if (anoRaw) {
		const ano = Number(anoRaw);
		if (!Number.isNaN(ano)) filtro.ano = ano;
	} else if (anoPadrao === 'corrente') {
		filtro.ano = hoje.getFullYear();
	} else if (anoPadrao === 'todos') {
		// undefined
	}

	if (mesRaw === 'todos') {
		// sem mês
	} else if (mesRaw != null && mesRaw !== '') {
		const mes = Number(mesRaw);
		if (!Number.isNaN(mes) && mes >= 0 && mes <= 11) filtro.mes = mes;
	} else if (mesPadrao === 'corrente') {
		filtro.mes = hoje.getMonth();
	}

	return filtro;
}

/** Rótulo legível do período para títulos de página. */
export function descreverPeriodo(filtro: FiltroArrecadacao): string {
	if (temIntervaloDatas(filtro)) {
		const de = filtro.dataInicio ? formatarDataCivil(filtro.dataInicio) : '…';
		const ate = filtro.dataFim ? formatarDataCivil(filtro.dataFim) : '…';
		return `${de} a ${ate}`;
	}
	if (filtro.ano == null && filtro.mes == null) return 'Todo o período';
	if (filtro.ano != null && filtro.mes != null) return `${MESES[filtro.mes]} de ${filtro.ano}`;
	if (filtro.ano != null) return `Ano ${filtro.ano}`;
	if (filtro.mes != null) return `${MESES[filtro.mes]} (todos os anos)`;
	return 'Todo o período';
}

/** Serializa filtro de volta para query string (sem defaults). */
export function filtroParaSearchParams(filtro: FiltroArrecadacao): URLSearchParams {
	const p = new URLSearchParams();
	if (filtro.dataInicio) {
		const d = filtro.dataInicio;
		p.set(
			'de',
			`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
		);
	}
	if (filtro.dataFim) {
		const d = filtro.dataFim;
		p.set(
			'ate',
			`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
		);
	}
	if (!temIntervaloDatas(filtro)) {
		if (filtro.ano != null) p.set('ano', String(filtro.ano));
		if (filtro.mes != null) p.set('mes', String(filtro.mes));
	}
	return p;
}
