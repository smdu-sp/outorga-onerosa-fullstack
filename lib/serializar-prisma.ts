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
	'valor_pago',
	'valor_devido',
]);

/**
 * Campos Decimal exclusivos de monitoramento_calculo_outorga: `area_habitacao_social`
 * (na cota é String) e os campos de fator/área/contrapartida migrados de String→Decimal.
 */
export const CAMPOS_DECIMAL_CALCULO = new Set([
	...CAMPOS_DECIMAL,
	'area_habitacao_social',
	'fp_uso_r',
	'fp_uso_nr',
	'fs_uso_r',
	'fs_uso_nr',
	'area_objeto_uso_r',
	'area_objeto_uso_nr',
	'area_total_objeto',
	'percentual_fachada_ativa',
	'contrapartida_uso_r',
	'contrapartida_uso_nr',
	'contrapartida_total',
]);

/** Campos Decimal de `oodc_valores_referencia` / `cota_valores_referencia`. */
export const CAMPOS_DECIMAL_VALOR_REFERENCIA = new Set(['valor']);

/** Campos Decimal de `oodc_memorial_calculo` + `oodc_memorial_tipologias` (entrada e resultado). */
export const CAMPOS_DECIMAL_OODC_MEMORIAL = new Set([
	'area_res_fruicao_m2',
	'area_doacao_verde_m2',
	'area_doacao_melhoramento_m2',
	'area_reserva_praca_m2',
	'area_doacao_calcada_m2',
	'area_reserva_calcada_m2',
	'area_desapropriacao_melhoramento_m2',
	'cota_parte_maxima_m2',
	'outorga_projeto_anterior_rs',
	'incentivo_certificacao_rs',
	'incentivo_cota_ambiental_rs',
	'outorga_projeto_modificativo_rs',
	'outorga_apoio_urbano_sul_rs',
	'v_max',
	'soma_terreno_m2',
	'soma_computavel_m2',
	'soma_tdc_m2',
	'soma_outorga_adquirida_m2',
	'soma_beneficio_m2',
	'soma_outorga_m2',
	'valor_total_bruto_rs',
	'deducao_ehis_ezeis_rs',
	'valor_total_recolhido_rs',
	'valor_total_liquido_rs',
	'ca_basico',
	'ca_maximo',
	'terreno_m2',
	'computavel_m2',
	'tdc_m2',
	'outorga_adquirida_m2',
	'fp',
	'fs',
	'ca_adicional',
	'beneficio_m2',
	'objeto_outorga_m2',
	'c_rs_m2',
	'valor_rs',
	'valor_encontrado',
]);

/** Campos Decimal de `cota_memorial_calculo`. */
export const CAMPOS_DECIMAL_COTA_MEMORIAL = new Set([
	'area_terreno_escritura_m2',
	'area_terreno_real_m2',
	'terreno_usado_m2',
	'v_max',
	'valor_total_rs',
	'valor_cinquenta_pct_rs',
	'valor_encontrado',
]);

const CAMPOS_DATA = new Set([
	'criado_em',
	'alterado_em',
	'data_entrada',
	'data_informacao_dmus',
	'ficha_revisada_em',
	'vencimento',
	'data_quitacao',
	'data_expedicao',
	'data_inicio_vigencia',
	'data_vigencia',
	'data_referencia',
]);

/** Converte Decimal/Date do Prisma em tipos serializáveis (Server → Client). */
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
			try {
				return new Prisma.Decimal(String(valor).replace(',', '.'));
			} catch {
				console.warn(`[serializar-prisma] Valor decimal inválido em "${chave}": ${JSON.stringify(valor)} — gravando null.`);
				return null;
			}
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
