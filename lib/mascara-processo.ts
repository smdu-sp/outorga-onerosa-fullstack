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

/**
 * Forma persistida do número do processo: somente dígitos, sem máscara
 * (`1010201900018125`). Toda gravação e todo `where` em `num_processo` devem
 * passar por aqui; a máscara só é aplicada na exibição (`mascararNumeroProcesso`).
 */
export function normalizarNumeroProcesso(valor: string | null | undefined): string {
	return (valor ?? '').replace(/\D/g, '');
}

/**
 * Aplica a máscara de exibição a um número armazenado só com dígitos.
 * 16 dígitos → SEI (`1010.2019/0001812-5`); 12 → físico (`2018-0.125.548-9`).
 * 13–15 dígitos (legado com sequencial sem zeros à esquerda) seguem a máscara SEI
 * sem preenchimento. Qualquer outra coisa volta como veio.
 */
export function mascararNumeroProcesso(valor: string | null | undefined): string {
	const bruto = (valor ?? '').trim();
	const digitos = normalizarNumeroProcesso(bruto);
	if (digitos.length === QTD_DIGITOS.FISICO) return formatarNumeroProcesso(digitos, 'FISICO');
	if (digitos.length === QTD_DIGITOS.SEI) return formatarNumeroProcesso(digitos, 'SEI');
	if (digitos.length >= 13 && digitos.length < QTD_DIGITOS.SEI) {
		return `${digitos.slice(0, 4)}.${digitos.slice(4, 8)}/${digitos.slice(8, -1)}-${digitos.slice(-1)}`;
	}
	return bruto;
}

const PESOS_DIGITO_SEI = '23456789';

/** Confere o dígito verificador (módulo 11) de um número SEI de 16 dígitos. */
export function digitoVerificadorSeiValido(valor: string): boolean {
	const digitos = valor.replace(/\D/g, '');
	if (digitos.length !== QTD_DIGITOS.SEI) return false;

	const digitoInformado = Number(digitos[15]);
	let soma = 0;
	let j = 0;
	for (let i = 14; i >= 0; i--) {
		if (j === 8) j = 0;
		soma += Number(digitos[i]) * Number(PESOS_DIGITO_SEI[j]);
		j++;
	}

	const digitoCalculado = soma % 11;
	return (digitoCalculado === 0 || digitoCalculado === 1 ? 0 : 11 - digitoCalculado) === digitoInformado;
}

/**
 * true quando o valor tem os 16 dígitos de um SEI mas o dígito verificador não bate
 * (número digitado/cadastrado errado). Outros comprimentos (físico, legado de 13–15
 * dígitos) não são verificáveis e nunca são considerados inválidos aqui.
 */
export function seiComDigitoInvalido(valor: string | null | undefined): boolean {
	const digitos = normalizarNumeroProcesso(valor);
	return digitos.length === QTD_DIGITOS.SEI && !digitoVerificadorSeiValido(digitos);
}

export const MENSAGEM_SEI_INVALIDO =
	'O dígito verificador não confere: este número de processo SEI provavelmente está incorreto. Confira o número.';

/** Tenta reconhecer o formato de um número já digitado/colado (com ou sem separadores). */
export function detectarFormatoNumeroProcesso(valor: string): FormatoNumeroProcesso | null {
	const v = valor.trim();
	if (REGEX_COMPLETO.SEI.test(v)) return 'SEI';
	if (REGEX_COMPLETO.FISICO.test(v)) return 'FISICO';
	if (/^\d+$/.test(v)) {
		if (v.length === QTD_DIGITOS.SEI) return 'SEI';
		if (v.length === QTD_DIGITOS.FISICO) return 'FISICO';
	}
	return null;
}
