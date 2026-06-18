import { Prisma } from '@prisma/client';

export const CAMPOS_DECIMAL = new Set([
	'coordenada_e',
	'coordenada_n',
	'coeficiente_basico',
	'coeficiente_utilizado',
	'area_terreno',
	'valor_m2_quadro14',
	'area_fruicao_publica',
	'area_doacao_melhoramento',
	'area_doacao_calcada',
	'area_transferencia',
	'area_computavel_total',
	'area_construida_total',
	'area_construida_computavel_total',
	'estimativa_deposito_fundurb',
	'valor_calculado_processo',
]);

/** Decimal apenas em monitoramento_calculo_outorga (na cota é String). */
export const CAMPOS_DECIMAL_CALCULO = new Set([...CAMPOS_DECIMAL, 'area_habitacao_social']);

const CAMPOS_DATA = new Set([
	'criado_em',
	'alterado_em',
	'data_entrada',
	'data_informacao_dmus',
	'ficha_revisada_em',
	'vencimento',
	'data_quitacao',
	'data_expedicao',
]);

export function serializarRegistro<T extends Record<string, unknown>>(registro: T): T {
	const out: Record<string, unknown> = {};
	for (const [chave, valor] of Object.entries(registro)) {
		out[chave] = serializarValor(valor);
	}
	return out as T;
}

export function deserializarRegistro<T extends Record<string, unknown>>(
	registro: T,
	camposDecimal: Set<string> = CAMPOS_DECIMAL,
): T {
	const out: Record<string, unknown> = {};
	for (const [chave, valor] of Object.entries(registro)) {
		out[chave] = deserializarValor(chave, valor, camposDecimal);
	}
	return out as T;
}

function serializarValor(valor: unknown): unknown {
	if (valor === null || valor === undefined) return valor;
	if (valor instanceof Prisma.Decimal) return valor.toString();
	if (valor instanceof Date) return valor.toISOString();
	if (Array.isArray(valor)) return valor.map(serializarValor);
	if (typeof valor === 'object') {
		return serializarRegistro(valor as Record<string, unknown>);
	}
	return valor;
}

function deserializarValor(
	chave: string,
	valor: unknown,
	camposDecimal: Set<string>,
): unknown {
	if (valor === null || valor === undefined) return valor;
	if (camposDecimal.has(chave)) {
		const text = String(valor).trim();
		if (text === '' || text === '-') return null;
		if (typeof valor === 'string' || typeof valor === 'number') {
			return new Prisma.Decimal(String(valor).replace(',', '.'));
		}
	}
	if (CAMPOS_DATA.has(chave) && typeof valor === 'string') {
		return new Date(valor);
	}
	if (Array.isArray(valor)) return valor.map((item) => deserializarValor(chave, item, camposDecimal));
	if (typeof valor === 'object' && !Array.isArray(valor)) {
		return deserializarRegistro(valor as Record<string, unknown>, camposDecimal);
	}
	return valor;
}
