/** @format */

/**
 * Máscaras do número do processo. Dois formatos convivem no sistema (ver
 * projeto/contexto-dominio.md): processos digitais tramitam pelo SEI, mas o
 * legado (`OrigemProcesso.FISICO`) usa a numeração de protocolo físico.
 */
export type FormatoNumeroProcesso = 'SEI' | 'FISICO';

const MASCARAS: Record<FormatoNumeroProcesso, string> = {
	SEI: '0000.0000/0000000-0',
	FISICO: '0000-0.000.000-0',
};

const QTD_DIGITOS: Record<FormatoNumeroProcesso, number> = {
	SEI: 16,
	FISICO: 12,
};

export const PLACEHOLDER_NUMERO_PROCESSO: Record<FormatoNumeroProcesso, string> = MASCARAS;

const REGEX_COMPLETO: Record<FormatoNumeroProcesso, RegExp> = {
	SEI: /^\d{4}\.\d{4}\/\d{7}-\d$/,
	FISICO: /^\d{4}-\d\.\d{3}\.\d{3}-\d$/,
};

/** Formata como o usuário digita, inserindo os separadores da máscara conforme os dígitos entram. */
export function formatarNumeroProcesso(valor: string, formato: FormatoNumeroProcesso): string {
	const digitos = valor.replace(/\D/g, '').slice(0, QTD_DIGITOS[formato]);
	const mascara = MASCARAS[formato];
	let saida = '';
	let i = 0;
	for (const ch of mascara) {
		if (i >= digitos.length) break;
		if (ch === '0') {
			saida += digitos[i];
			i++;
		} else {
			saida += ch;
		}
	}
	return saida;
}

/** true quando o valor já preenche todos os dígitos da máscara escolhida. */
export function numeroProcessoCompleto(valor: string, formato: FormatoNumeroProcesso): boolean {
	return valor.replace(/\D/g, '').length === QTD_DIGITOS[formato];
}

/** Valida o formato final (com separadores) de um número de processo. */
export function numeroProcessoValido(valor: string, formato: FormatoNumeroProcesso): boolean {
	return REGEX_COMPLETO[formato].test(valor.trim());
}

/** Tenta reconhecer o formato de um número já digitado/colado (com ou sem separadores). */
export function detectarFormatoNumeroProcesso(valor: string): FormatoNumeroProcesso | null {
	const v = valor.trim();
	if (REGEX_COMPLETO.SEI.test(v)) return 'SEI';
	if (REGEX_COMPLETO.FISICO.test(v)) return 'FISICO';
	return null;
}
