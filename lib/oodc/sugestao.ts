/**
 * Sugestões automáticas para o memorial de cálculo da OODC, a partir de dados que já
 * existem no sistema (ficha de monitoramento/GeoSampa, BI, `Processo.data_entrada`) —
 * usadas pela tela `processos/[id]/calculo-oodc`. Toda sugestão é editável pelo
 * usuário; nada aqui é definitivo. Funções puras, sem I/O (a leitura do processo é
 * feita em `lib/server/oodc-memorial.ts`).
 */

import { macrozonaDeMacroarea, normalizarMacroarea, normalizarMacrozona } from '@/lib/enquadramento-catalogo';
import { MACROAREAS, MACROZONAS, PARAMETROS_OCUPACAO, ZONAS } from './tabelas';

function normalizar(texto: string): string {
	return texto
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.trim();
}

/** Acha o `id` de `ZONAS` pela sigla (parte antes do " - " do `nome`). Em siglas
 * duplicadas (ex.: "ZER-1" aparece em dois sistemas de zoneamento diferentes),
 * fica com a primeira ocorrência (menor id), que é a do Quadro 3 vigente. */
export function buscarIdZonaPorSigla(sigla?: string | null): number | null {
	const alvo = sigla?.trim();
	if (!alvo) return null;
	const alvoNormalizado = normalizar(alvo);
	const encontrada = ZONAS.find((z) => normalizar(z.nome.split(' - ')[0]!.trim()) === alvoNormalizado);
	return encontrada?.id ?? null;
}

export function buscarIdMacroareaPorTexto(texto?: string | null): number | null {
	const canonico = normalizarMacroarea(texto);
	if (!canonico) return null;
	const alvo = normalizar(canonico);
	const encontrada = MACROAREAS.find((m) => normalizar(m.nome).includes(alvo));
	return encontrada?.id ?? null;
}

export function buscarIdMacrozonaPorTexto(texto?: string | null): number | null {
	const canonico = normalizarMacrozona(texto);
	if (!canonico) return null;
	const alvo = normalizar(canonico);
	const encontrada = MACROZONAS.find((m) => normalizar(m.nome).includes(alvo));
	return encontrada?.id ?? null;
}

export interface EnquadramentoParaSugestao {
	macrozona?: string | null;
	macroarea?: string | null;
	intervencao_urbanistica?: string | null;
	zona_uso_1_18081?: string | null;
	zona_uso_2_17975?: string | null;
	zona_uso_3_16402?: string | null;
	zona_uso_4_16050?: string | null;
	zona_uso_5_13885?: string | null;
	zona_uso_6_13885?: string | null;
}

/** Sugere Macrozona e Macroárea; se só a macroárea vier preenchida, deriva a
 * macrozona a partir dela (mesma regra usada ao salvar dados do GeoSampa). */
export function sugerirMacrozonaMacroarea(enquadramento: EnquadramentoParaSugestao): {
	idMacrozona: number | null;
	idMacroarea: number | null;
} {
	const macroareaTexto = enquadramento.macroarea;
	const macrozonaTexto = enquadramento.macrozona ?? macrozonaDeMacroarea(macroareaTexto ?? undefined);
	return {
		idMacrozona: buscarIdMacrozonaPorTexto(macrozonaTexto),
		idMacroarea: buscarIdMacroareaPorTexto(macroareaTexto),
	};
}

export type OrigemLeiZoneamento = '18081' | '17975' | '16402' | '16050' | '13885';

const PRECEDENCIA_ZONA: { campo: keyof EnquadramentoParaSugestao; origem: OrigemLeiZoneamento }[] = [
	{ campo: 'zona_uso_1_18081', origem: '18081' },
	{ campo: 'zona_uso_2_17975', origem: '17975' },
	{ campo: 'zona_uso_3_16402', origem: '16402' },
	{ campo: 'zona_uso_4_16050', origem: '16050' },
	{ campo: 'zona_uso_5_13885', origem: '13885' },
];

/** Pega a zona de uso "vigente" pela precedência das colunas
 * `zona_uso_1_18081` (mais nova) .. `zona_uso_5_13885` (mais antiga) e sinaliza qual
 * lei de zoneamento a rege — é esse sinal que decide a combinação 1 (13885) da
 * Legislação em `sugerirLegislacao`. */
export function sugerirZonaEOrigemLegal(enquadramento: EnquadramentoParaSugestao): {
	idZona: number | null;
	zonaTexto: string | null;
	origemLei: OrigemLeiZoneamento | null;
} {
	for (const { campo, origem } of PRECEDENCIA_ZONA) {
		const texto = enquadramento[campo]?.trim();
		if (texto) {
			return { idZona: buscarIdZonaPorSigla(texto), zonaTexto: texto, origemLei: origem };
		}
	}
	return { idZona: null, zonaTexto: null, origemLei: null };
}

/** CA básico/máximo sugerido a partir do Quadro 3 consolidado (`PARAMETROS_OCUPACAO`).
 * Sempre conferir a `observacao` quando presente — pode depender de área do lote ou
 * de artigo específico que não dá para resolver automaticamente. */
export function sugerirCaPorZona(idZona: number | null): { caBasico: number; caMaximo: number; observacao?: string } | null {
	if (idZona == null) return null;
	const linha = PARAMETROS_OCUPACAO.find((p) => p.idZona === idZona);
	return linha ? { caBasico: linha.caBasico, caMaximo: linha.caMaximo, observacao: linha.observacao } : null;
}

/** Marco temporal explícito da Lei 17.975/2023 (Revisão Intermediária do PDE) —
 * processos protocolados a partir desta data (ou com opção expressa) usam o modelo
 * novo de planilha (penalidade de Fs por cota-parte). */
export const MARCO_LEI_17975 = '2023-07-08';

/** Data de sanção da Lei 18.081/2024. O processo legislativo se estendeu até
 * 15/04/2024 (publicação de partes na Secretaria Geral Parlamentar) — por isso a
 * sugestão que usa esta data vem sempre acompanhada de aviso para confirmar com a
 * área jurídica em casos de fronteira. */
export const MARCO_LEI_18081 = '2024-01-19';

export interface DadosParaSugestaoLegislacao {
	origemLei: OrigemLeiZoneamento | null;
	dentroPerimetroAiu: boolean;
	dataEntrada: Date | null;
}

export interface SugestaoLegislacao {
	idLegislacao: number | null;
	motivo: string;
	avisos: string[];
}

const AVISOS_SEM_FONTE = [
	'Confirme se há opção expressa do interessado pelo regime novo — se houver, mesmo processos protocolados antes do marco temporal usam a legislação mais recente (Lei 17.975/2023).',
	'Confirme se ainda não foi emitido despacho decisório — a penalidade de Fs por cota-parte (Lei 18.157/2024) só se aplica a processos ainda em análise (art. 23, §1º do Decreto 63.884/2024).',
];

/**
 * Sugere a combinação de LEGISLAÇÃO (1-7, `LEIS` em `lib/oodc/tabelas.ts`) a partir de:
 * 1. Zona regida pela Lei 13.885/2004 → combinação 1, direto (não depende de data).
 * 2. Perímetro do PIU Setor Central (Lei 17.844/2022) → família 5/6/7; senão, família 2/3/4.
 * 3. Dentro da família, corte por `Processo.data_entrada` nos marcos de 17.975/2023 e 18.081/2024.
 *
 * Sempre uma sugestão editável — nunca decide sozinha. `avisos` sinaliza as duas
 * condições que não existem em nenhuma fonte hoje (opção expressa; despacho decisório).
 */
export function sugerirLegislacao(input: DadosParaSugestaoLegislacao): SugestaoLegislacao {
	if (input.origemLei === '13885') {
		return {
			idLegislacao: 1,
			motivo: 'Zona do lote ainda regida pela Lei 13.885/2004 (zoneamento anterior à LPUOS de 2016), independente da data de protocolo.',
			avisos: AVISOS_SEM_FONTE,
		};
	}

	const familia = input.dentroPerimetroAiu ? [5, 6, 7] : [2, 3, 4];

	if (!input.dataEntrada) {
		return {
			idLegislacao: null,
			motivo: 'Sem data de protocolo do processo — não é possível sugerir a legislação automaticamente.',
			avisos: AVISOS_SEM_FONTE,
		};
	}

	const dataIso = input.dataEntrada.toISOString().slice(0, 10);
	const idx = dataIso < MARCO_LEI_17975 ? 0 : dataIso < MARCO_LEI_18081 ? 1 : 2;
	const idLegislacao = familia[idx];

	const motivo = input.dentroPerimetroAiu
		? `Lote dentro do perímetro do PIU Setor Central (Lei 17.844/2022); protocolo em ${dataIso}.`
		: `Regime geral (fora do perímetro do PIU Setor Central); protocolo em ${dataIso}.`;

	return {
		idLegislacao,
		motivo,
		avisos: [
			...AVISOS_SEM_FONTE,
			'A data usada para a Lei 18.081/2024 (19/01/2024) é a de sanção — o processo legislativo se estendeu até 15/04/2024; confirme a vigência com a área jurídica em casos de fronteira.',
		],
	};
}
