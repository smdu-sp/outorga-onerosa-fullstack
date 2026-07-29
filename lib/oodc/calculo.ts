/**
 * Motor de cálculo da Outorga Onerosa (OODC) — porta fiel das fórmulas da aba `oodc`
 * da planilha oficial `oodc-prot-v1 1 0-desbloqueada.xlsm` (versão 1.1.0, 22/01/2026).
 *
 * As fórmulas originais (extraídas de `xl/workbook.xml`, seção `<definedNames>`, já
 * que nomes com escopo de planilha não aparecem via `exceljs`) estão citadas nos
 * comentários de cada função para permitir conferência célula a célula com o
 * arquivo `.xlsm`. Funções puras, sem I/O — a busca do V (R$/m²) é feita à parte
 * em `lib/server/oodc-valor-referencia.ts` e passada já resolvida.
 */

import {
	FP,
	FS,
	IDS_LEGISLACAO_PIU_CENTRAL,
	IDS_TIPOLOGIA_HABITACIONAL,
	IDS_TIPOLOGIA_HIS_HMP,
	IDS_ZONA_FP_FIXO_2,
	ID_ASSUNTO_PROJETO_MODIFICATIVO,
	ID_TIPOLOGIA_HABITACAO_MAIOR_70M2,
	IDS_CLASSIFICACAO_ISENTA,
} from './tabelas';
import type {
	DeducoesContrapartida,
	EntradaCalculoOodc,
	ResultadoCalculoOodc,
	ResultadoTipologia,
	TipologiaCalculo,
	ValorUnitarioEncontrado,
} from './tipos';

/**
 * Corte de vigência embutido na planilha 1.1.0 (`AP83`/`AM91`/...:
 * `IF(TODAY()<=DATE(2026,12,31), ..., "")`). É um corte transitório do Decreto
 * 64.884/2025 — revisar/atualizar quando a planilha oficial for atualizada.
 */
export const LIMITE_VIGENCIA_TABELA_V = '2026-12-31';

function paraNumero(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

/** BJ40: deriva o uso (1=R, 2=nR) a partir da tipologia. 0 = tipologia não selecionada. */
export function derivarTipologiaUso(idTipologia: number): number {
	if (!idTipologia) return 0;
	return (IDS_TIPOLOGIA_HABITACIONAL as readonly number[]).includes(idTipologia) ? 1 : 2;
}

interface ContextoCalculo {
	idLegislacao: number;
	idZona: number;
	idMacroarea: number;
	idAreaAiu?: number;
	cotaParteMaximaM2: number;
	somaTerrenoM2: number;
	idAssunto: number;
	areaResFruicaoM2: number;
	baseLegalFruiId: number;
	areaDoacaoVerdeM2: number;
	areaDoacaoMelhoramentoM2: number;
	baseLegalMelId: number;
	areaReservaPracaM2: number;
	areaDoacaoCalcadaM2: number;
	baseLegalCalId: number;
	dataReferencia: string;
}

/**
 * `fp` lookup (J42): PIU Central (área+vigência) → zona ZEM/ZEMP fixo 2 → uso×macroárea.
 */
export function calcularFp(idTipologiaUso: number, ctx: ContextoCalculo): number {
	if (!idTipologiaUso) return 0;

	if ((IDS_LEGISLACAO_PIU_CENTRAL as readonly number[]).includes(ctx.idLegislacao)) {
		const hoje = ctx.dataReferencia;
		const linha = FP.find(
			(l) =>
				l.idArea === ctx.idAreaAiu &&
				l.dataInicio !== undefined &&
				l.dataInicio <= hoje &&
				(l.dataFim === undefined || l.dataFim >= hoje),
		);
		return linha?.fp ?? 0;
	}

	if ((IDS_ZONA_FP_FIXO_2 as readonly number[]).includes(ctx.idZona)) return 2;

	const linha = FP.find((l) => l.idUso === idTipologiaUso && l.idMacroarea === ctx.idMacroarea);
	return linha?.fp ?? 0;
}

/**
 * `fs` lookup (M42): leis antigas → lookup direto; leis novas → penalidade por
 * `cp_max` (cota parte máxima de terreno por UH efetiva).
 */
export function calcularFs(idTipologia: number, ctx: ContextoCalculo): number {
	if (!idTipologia) return 0;

	const lookup = () => FS.find((l) => l.idTipologia === idTipologia)?.fs ?? 0;

	if ([1, 2, 5].includes(ctx.idLegislacao)) return lookup();

	if (ctx.cotaParteMaximaM2 > 30) {
		if (!(IDS_TIPOLOGIA_HIS_HMP as readonly number[]).includes(idTipologia)) return 3;
		return lookup();
	}

	if (ctx.cotaParteMaximaM2 > 20 && idTipologia === ID_TIPOLOGIA_HABITACAO_MAIOR_70M2) {
		const cp = ctx.cotaParteMaximaM2;
		return ((Math.ceil((cp - 20) / 0.25 + 1) - 1) * 0.25 + 20) * 0.1 - 1;
	}

	return lookup();
}

/** `ca_adi_N`: CA adicional = CA máximo − CA básico. */
export function calcularCaAdicional(caMaximo: number, caBasico: number): number {
	return caMaximo - caBasico;
}

/**
 * `beneficio_N` (AS42): rateio por `(terreno_N/soma_terreno)` dos benefícios de área
 * que a fórmula original realmente usa. `area_calcada`/`area_fruicao`/`area_des_mel`
 * (named ranges órfãos, não referenciados em nenhuma fórmula da aba `oodc`) ficam
 * de fora de propósito.
 */
export function calcularBeneficio(
	terrenoM2: number,
	caMaximo: number,
	caAdicional: number,
	ctx: ContextoCalculo,
): number {
	if (ctx.somaTerrenoM2 <= 0 || terrenoM2 <= 0) return 0;

	const parcelaFrui = ctx.areaResFruicaoM2 * (ctx.baseLegalFruiId === 1 ? caMaximo : ctx.baseLegalFruiId === 2 ? caAdicional : 0) * 0.5;
	const parcelaVerde = ctx.areaDoacaoVerdeM2 * caAdicional;
	const parcelaMel =
		ctx.areaDoacaoMelhoramentoM2 *
		(ctx.baseLegalMelId === 1 ? caMaximo : ctx.baseLegalMelId === 2 ? caAdicional : 0);
	const parcelaPraca = ctx.areaReservaPracaM2 * caMaximo * 0.5;
	const parcelaCal =
		ctx.areaDoacaoCalcadaM2 *
		(ctx.baseLegalCalId === 1 ? caMaximo : [2, 4].includes(ctx.baseLegalCalId) ? caAdicional : 0);

	return (terrenoM2 / ctx.somaTerrenoM2) * (parcelaFrui + parcelaVerde + parcelaMel + parcelaPraca + parcelaCal);
}

/**
 * `objeto_outorga_N` (AZ42): computável menos terreno/benefício/TDC, descontando
 * também a área de outorga já adquirida quando o assunto é "projeto modificativo".
 * Rótulo na planilha: "OUTORGA ADQUIRIDA (M2)"; nome interno: `computavel_isento_N`.
 */
export function calcularObjetoOutorga(
	tipologia: Pick<TipologiaCalculo, 'terrenoM2' | 'computavelM2' | 'tdcM2' | 'outorgaAdquiridaM2'>,
	beneficioM2: number,
	idAssunto: number,
): number {
	const desconto = idAssunto === ID_ASSUNTO_PROJETO_MODIFICATIVO ? tipologia.outorgaAdquiridaM2 : 0;
	const valor = tipologia.computavelM2 - (tipologia.terrenoM2 + beneficioM2 + tipologia.tdcM2 + desconto);
	return valor < 0 ? 0 : valor;
}

/** `c_1..7`: C = (terreno/computável) × V_MAX × Fp × Fs. */
export function calcularC(terrenoM2: number, computavelM2: number, vMax: number, fp: number, fs: number): number {
	if (computavelM2 <= 0) return 0;
	return (terrenoM2 / computavelM2) * vMax * fp * fs;
}

function calcularUmaTipologia(
	tipologia: TipologiaCalculo,
	vMax: number,
	ctxBase: Omit<ContextoCalculo, 'somaTerrenoM2'>,
	somaTerrenoM2: number,
): ResultadoTipologia {
	const ctx: ContextoCalculo = { ...ctxBase, somaTerrenoM2 };
	const idTipologiaUso = derivarTipologiaUso(tipologia.idTipologia);
	const fp = calcularFp(idTipologiaUso, ctx);
	const fs = calcularFs(tipologia.idTipologia, ctx);
	const caAdicional = calcularCaAdicional(tipologia.caMaximo, tipologia.caBasico);
	const beneficioM2 = calcularBeneficio(tipologia.terrenoM2, tipologia.caMaximo, caAdicional, ctx);
	const objetoOutorgaM2 = calcularObjetoOutorga(tipologia, beneficioM2, ctx.idAssunto);
	const c = calcularC(tipologia.terrenoM2, tipologia.computavelM2, vMax, fp, fs);
	const valorRs = Math.max(0, c * objetoOutorgaM2);

	return {
		chave: tipologia.chave,
		idTipologia: tipologia.idTipologia,
		idTipologiaUso,
		fp,
		fs,
		caAdicional,
		beneficioM2,
		objetoOutorgaM2,
		c,
		valorRs,
	};
}

function somaDeducoesManuais(d: DeducoesContrapartida): number {
	return (
		paraNumero(d.outorgaProjetoAnteriorRs) +
		paraNumero(d.incentivoCertificacaoRs) +
		paraNumero(d.incentivoCotaAmbientalRs) +
		paraNumero(d.outorgaProjetoModificativoRs) +
		paraNumero(d.outorgaApoioUrbanoSulRs)
	);
}

/**
 * `AH37`: quando a classificação do empreendimento é EHIS ou EZEIS, a dedução
 * cobre o bruto inteiro (líquido = 0) — isenção total.
 */
export function calcularDeducaoEhisEzeis(
	idClassificacaoEmpreendimento: number,
	valorTotalBrutoRs: number,
	deducoesManuaisRs: number,
): number {
	if (!(IDS_CLASSIFICACAO_ISENTA as readonly number[]).includes(idClassificacaoEmpreendimento)) return 0;
	return valorTotalBrutoRs - deducoesManuaisRs;
}

/** Ponto de entrada único: orquestra o memorial de cálculo completo para até 7 tipologias. */
export function calcularMemorial(
	entrada: EntradaCalculoOodc,
	vMax: number | null,
	valoresUnitariosEncontrados: ValorUnitarioEncontrado[],
): ResultadoCalculoOodc {
	const dataReferencia = entrada.dataReferencia ?? new Date().toISOString().slice(0, 10);
	const vMaxEfetivo = vMax ?? 0;

	const somaTerrenoM2 = entrada.tipologias.reduce((s, t) => s + paraNumero(t.terrenoM2), 0);

	const ctxBase: Omit<ContextoCalculo, 'somaTerrenoM2'> = {
		idLegislacao: entrada.idLegislacao,
		idZona: entrada.idZona,
		idMacroarea: entrada.idMacroarea,
		idAreaAiu: entrada.idAreaAiu,
		cotaParteMaximaM2: entrada.ocupacaoSolo.cotaParteMaximaM2,
		idAssunto: entrada.idAssunto,
		areaResFruicaoM2: entrada.qualificadores.areaResFruicaoM2,
		baseLegalFruiId: entrada.qualificadores.baseLegalFruiId,
		areaDoacaoVerdeM2: entrada.qualificadores.areaDoacaoVerdeM2,
		areaDoacaoMelhoramentoM2: entrada.qualificadores.areaDoacaoMelhoramentoM2,
		baseLegalMelId: entrada.qualificadores.baseLegalMelId,
		areaReservaPracaM2: entrada.qualificadores.areaReservaPracaM2,
		areaDoacaoCalcadaM2: entrada.qualificadores.areaDoacaoCalcadaM2,
		baseLegalCalId: entrada.qualificadores.baseLegalCalId,
		dataReferencia,
	};

	const tipologias = entrada.tipologias.map((t) => calcularUmaTipologia(t, vMaxEfetivo, ctxBase, somaTerrenoM2));

	const somaComputavelM2 = entrada.tipologias.reduce((s, t) => s + paraNumero(t.computavelM2), 0);
	const somaTdcM2 = entrada.tipologias.reduce((s, t) => s + paraNumero(t.tdcM2), 0);
	const somaOutorgaAdquiridaM2 = entrada.tipologias.reduce((s, t) => s + paraNumero(t.outorgaAdquiridaM2), 0);
	const somaBeneficioM2 = tipologias.reduce((s, t) => s + t.beneficioM2, 0);
	const somaOutorgaM2 = tipologias.reduce((s, t) => s + t.objetoOutorgaM2, 0);
	const valorTotalBrutoRs = tipologias.reduce((s, t) => s + t.valorRs, 0);

	const deducoesManuaisRs = somaDeducoesManuais(entrada.deducoes);
	const deducaoEhisEzeisRs = calcularDeducaoEhisEzeis(
		entrada.idClassificacaoEmpreendimento,
		valorTotalBrutoRs,
		deducoesManuaisRs,
	);
	const valorTotalRecolhidoRs = deducoesManuaisRs + deducaoEhisEzeisRs;
	const valorTotalLiquidoRs = valorTotalBrutoRs - valorTotalRecolhidoRs;

	return {
		vMax,
		valoresUnitariosEncontrados,
		tipologias,
		somaTerrenoM2,
		somaComputavelM2,
		somaTdcM2,
		somaOutorgaAdquiridaM2,
		somaBeneficioM2,
		somaOutorgaM2,
		valorTotalBrutoRs,
		deducaoEhisEzeisRs,
		valorTotalRecolhidoRs,
		valorTotalLiquidoRs,
		dentroDaVigencia: dataReferencia <= LIMITE_VIGENCIA_TABELA_V,
	};
}
