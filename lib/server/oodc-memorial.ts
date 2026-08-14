/**
 * Acesso a dados da tela `processos/[id]/calculo-oodc`: monta um rascunho do
 * memorial de cálculo pré-preenchido a partir do que já existe no sistema (ficha de
 * monitoramento/GeoSampa, BI, `Processo.data_entrada`), e persiste o resultado
 * confirmado pelo usuário em `OodcMemorialCalculo` (+ endereços e tipologias).
 */

import { prisma } from '@/lib/prisma';
import {
	sugerirCaPorZona,
	sugerirLegislacao,
	sugerirMacrozonaMacroarea,
	sugerirZonaEOrigemLegal,
	type EnquadramentoParaSugestao,
	type SugestaoLegislacao,
} from '@/lib/oodc/sugestao';
import type {
	EnderecoValorUnitario,
	EntradaCalculoOodc,
	ResultadoCalculoOodc,
	TipologiaCalculo,
	ValorUnitarioEncontrado,
} from '@/lib/oodc/tipos';
import { buscarAssuntosPorProcessoNoBi, mapearAssuntoBiParaIdOodc } from '@/lib/server/bi-cadastro';
import {
	buscarCategoriasPorProcessoNoBi,
	descricaoCategoriaBi,
	sugerirIdClassificacaoEmpreendimento,
	sugerirIdTipologiaDeCategoria,
} from '@/lib/server/bi-categoria';
import { buscarCodlogPadraoPorProcessoNoBi, buscarSetoresQuadrasPorProcessoNoBi } from '@/lib/server/bi-sql-incra';
import { buscarValorReferencia } from '@/lib/server/oodc-valor-referencia';

export class OodcMemorialError extends Error {}

export interface CandidatoAssunto {
	assunto: string;
	idSugerido: number | null;
}

export interface RascunhoCalculoOodc {
	entrada: EntradaCalculoOodc;
	legislacaoSugestao: SugestaoLegislacao;
	caSugerido: { caBasico: number; caMaximo: number; observacao?: string } | null;
	assuntoCandidatos: CandidatoAssunto[];
	vMax: number | null;
	valoresEncontrados: ValorUnitarioEncontrado[];
	/** `chave` da tipologia (mesma de `entrada.tipologias`) → texto explicativo da
	 * categoria do BI (Aprova Digital) que originou o Computável (m²) sugerido. */
	tipologiasOrigemBi: Record<string, string>;
}

function enderecoVazio(): EnderecoValorUnitario {
	return { setor: '', quadra: '', codlog: '' };
}

/** Busca o processo + ficha de monitoramento e monta um rascunho de
 * `EntradaCalculoOodc` com tudo que já dá para localizar automaticamente
 * (assunto no BI, macrozona/macroárea/zona no enquadramento urbanístico, legislação
 * sugerida, endereço #1 + V/V_MÁXIMO). O resto fica zerado para o usuário preencher. */
export async function montarRascunhoCalculo(processoId: string): Promise<RascunhoCalculoOodc> {
	const processo = await prisma.processo.findUnique({
		where: { id: processoId },
		include: {
			monitoramento: {
				include: { localizacao_lote: true, enquadramento_urbanistico: true },
			},
		},
	});
	if (!processo) throw new OodcMemorialError('Processo não encontrado.');

	const enquadramento: EnquadramentoParaSugestao = processo.monitoramento?.enquadramento_urbanistico ?? {};
	const localizacao = processo.monitoramento?.localizacao_lote;

	const { idMacrozona, idMacroarea } = sugerirMacrozonaMacroarea(enquadramento);
	const { idZona, origemLei } = sugerirZonaEOrigemLegal(enquadramento);
	const dentroPerimetroAiu = enquadramento.intervencao_urbanistica === 'AIUSC';
	const legislacaoSugestao = sugerirLegislacao({
		origemLei,
		dentroPerimetroAiu,
		dataEntrada: processo.data_entrada,
	});
	const caSugerido = sugerirCaPorZona(idZona);

	let assuntoCandidatos: CandidatoAssunto[] = [];
	try {
		const encontrados = await buscarAssuntosPorProcessoNoBi(processo.num_processo);
		assuntoCandidatos = encontrados.map((e) => ({
			assunto: e.assunto,
			idSugerido: mapearAssuntoBiParaIdOodc(e.assunto),
		}));
	} catch {
		// BI indisponível ou processo sem registro — usuário escolhe o assunto manualmente.
		assuntoCandidatos = [];
	}
	const idAssunto = assuntoCandidatos.find((c) => c.idSugerido != null)?.idSugerido ?? 0;

	const categoriasBi = await buscarCategoriasPorProcessoNoBi(processo.num_processo);
	const tipologiasOrigemBi: Record<string, string> = {};
	const tipologiasIniciais: TipologiaCalculo[] = categoriasBi.map((cat, idx) => {
		const chave = `bi-${idx}`;
		tipologiasOrigemBi[chave] = descricaoCategoriaBi(cat);
		return {
			chave,
			idTipologia: sugerirIdTipologiaDeCategoria(cat.codsubcategoria) ?? 0,
			caBasico: caSugerido?.caBasico ?? 0,
			caMaximo: caSugerido?.caMaximo ?? 0,
			terrenoM2: 0,
			computavelM2: cat.areaComputavelM2,
			tdcM2: 0,
			outorgaAdquiridaM2: 0,
		};
	});
	const idClassificacaoEmpreendimentoSugerido = sugerirIdClassificacaoEmpreendimento(categoriasBi);

	const enderecoInicial: EnderecoValorUnitario =
		localizacao?.setor && localizacao?.quadra && localizacao?.codigo_logradouro
			? {
					setor: localizacao.setor,
					quadra: localizacao.quadra,
					codlog: localizacao.codigo_logradouro,
				}
			: enderecoVazio();

	// Um processo pode ter vários lotes (terreno remembrado) — o BI (dbo.prata_sql_incra)
	// traz todos os SQLs distintos; deduplicamos por setor+quadra (é o que a busca do V
	// usa). O endereço local (localizacao_lote, já conferido pelo GeoSampa) sempre vem
	// primeiro; os demais entram com o mesmo codlog como sugestão — sem vínculo direto
	// SQL→codlog nas tabelas do BI, então fica editável.
	const setoresQuadrasBi = await buscarSetoresQuadrasPorProcessoNoBi(
		processo.num_processo,
		() => {},
		{ protocoloAd: processo.protocolo_ad },
	);
	const codlogFallback =
		enderecoInicial.codlog ||
		(await buscarCodlogPadraoPorProcessoNoBi(processo.num_processo, () => {}, {
			protocoloAd: processo.protocolo_ad,
		})) ||
		'';

	const enderecos: EnderecoValorUnitario[] = [];
	const vistos = new Set<string>();
	if (enderecoInicial.setor && enderecoInicial.quadra) {
		enderecos.push(enderecoInicial);
		vistos.add(`${enderecoInicial.setor}-${enderecoInicial.quadra}`);
	}
	for (const combo of setoresQuadrasBi) {
		if (enderecos.length >= 10) break;
		const chave = `${combo.setor}-${combo.quadra}`;
		if (vistos.has(chave)) continue;
		vistos.add(chave);
		enderecos.push({ setor: combo.setor, quadra: combo.quadra, codlog: codlogFallback });
	}
	if (!enderecos.length) enderecos.push(enderecoVazio());

	let vMax: number | null = null;
	let valoresEncontrados: ValorUnitarioEncontrado[] = [];
	if (enderecos.some((e) => e.setor && e.quadra && e.codlog)) {
		// Mantém a MESMA ordem/tamanho de `enderecos` para os índices baterem com
		// `entrada.enderecos` na UI (`valoresEncontrados[idx]`).
		const resposta = await buscarValorReferencia(enderecos);
		vMax = resposta.vMax;
		valoresEncontrados = resposta.valores;
	}

	const entrada: EntradaCalculoOodc = {
		idAssunto,
		idLegislacao: legislacaoSugestao.idLegislacao ?? 0,
		idMacrozona: idMacrozona ?? 0,
		idMacroarea: idMacroarea ?? 0,
		idZona: idZona ?? 0,
		enderecos,
		qualificadores: {
			areaDoacaoCalcadaM2: 0,
			baseLegalCalId: 0,
			areaReservaCalcadaM2: 0,
			areaResFruicaoM2: 0,
			baseLegalFruiId: 0,
			areaReservaPracaM2: 0,
			areaDesapropriacaoMelhoramentoM2: 0,
			baseLegalDesMelId: 0,
			areaDoacaoMelhoramentoM2: 0,
			baseLegalMelId: 0,
			areaDoacaoVerdeM2: 0,
		},
		ocupacaoSolo: { cotaParteMaximaM2: 0 },
		deducoes: {
			outorgaProjetoAnteriorRs: 0,
			incentivoCertificacaoRs: 0,
			incentivoCotaAmbientalRs: 0,
			outorgaProjetoModificativoRs: 0,
			outorgaApoioUrbanoSulRs: 0,
		},
		idClassificacaoEmpreendimento: idClassificacaoEmpreendimentoSugerido ?? 0,
		tipologias: tipologiasIniciais,
	};

	return { entrada, legislacaoSugestao, caSugerido, assuntoCandidatos, vMax, valoresEncontrados, tipologiasOrigemBi };
}

export interface FlagsMemorialCalculo {
	legislacaoOrigem: 'SUGERIDA' | 'MANUAL';
	legislacaoObservacao?: string;
	opcaoExpressaRegimeNovo: boolean;
	despachoDecisorioEmitido: boolean;
}

/** Persiste o memorial de cálculo confirmado pelo usuário (cabeçalho + endereços +
 * tipologias) numa transaction. Cada chamada cria uma NOVA versão — não sobrescreve
 * a anterior — para manter histórico. */
export async function salvarMemorialCalculo(
	processoId: string,
	entrada: EntradaCalculoOodc,
	resultado: ResultadoCalculoOodc,
	flags: FlagsMemorialCalculo,
	userId?: string,
): Promise<{ id: string }> {
	const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { id: true } });
	if (!processo) throw new OodcMemorialError('Processo não encontrado.');

	const dataReferencia = entrada.dataReferencia ?? new Date().toISOString().slice(0, 10);

	const memorial = await prisma.oodcMemorialCalculo.create({
		data: {
			processo_id: processoId,
			id_assunto: entrada.idAssunto,
			id_legislacao: entrada.idLegislacao,
			legislacao_origem: flags.legislacaoOrigem,
			legislacao_observacao: flags.legislacaoObservacao,
			id_macrozona: entrada.idMacrozona,
			id_macroarea: entrada.idMacroarea,
			id_zona: entrada.idZona,
			id_area_aiu: entrada.idAreaAiu ?? null,

			area_res_fruicao_m2: entrada.qualificadores.areaResFruicaoM2,
			base_legal_frui_id: entrada.qualificadores.baseLegalFruiId,
			area_doacao_verde_m2: entrada.qualificadores.areaDoacaoVerdeM2,
			area_doacao_melhoramento_m2: entrada.qualificadores.areaDoacaoMelhoramentoM2,
			base_legal_mel_id: entrada.qualificadores.baseLegalMelId,
			area_reserva_praca_m2: entrada.qualificadores.areaReservaPracaM2,
			area_doacao_calcada_m2: entrada.qualificadores.areaDoacaoCalcadaM2,
			base_legal_cal_id: entrada.qualificadores.baseLegalCalId,
			area_reserva_calcada_m2: entrada.qualificadores.areaReservaCalcadaM2,
			area_desapropriacao_melhoramento_m2: entrada.qualificadores.areaDesapropriacaoMelhoramentoM2,
			base_legal_des_mel_id: entrada.qualificadores.baseLegalDesMelId,

			cota_parte_maxima_m2: entrada.ocupacaoSolo.cotaParteMaximaM2,

			outorga_projeto_anterior_rs: entrada.deducoes.outorgaProjetoAnteriorRs,
			incentivo_certificacao_rs: entrada.deducoes.incentivoCertificacaoRs,
			incentivo_cota_ambiental_rs: entrada.deducoes.incentivoCotaAmbientalRs,
			outorga_projeto_modificativo_rs: entrada.deducoes.outorgaProjetoModificativoRs,
			outorga_apoio_urbano_sul_rs: entrada.deducoes.outorgaApoioUrbanoSulRs,

			id_classificacao_empreendimento: entrada.idClassificacaoEmpreendimento,

			opcao_expressa_regime_novo: flags.opcaoExpressaRegimeNovo,
			despacho_decisorio_emitido: flags.despachoDecisorioEmitido,

			data_referencia: dataReferencia,

			v_max: resultado.vMax,
			soma_terreno_m2: resultado.somaTerrenoM2,
			soma_computavel_m2: resultado.somaComputavelM2,
			soma_tdc_m2: resultado.somaTdcM2,
			soma_outorga_adquirida_m2: resultado.somaOutorgaAdquiridaM2,
			soma_beneficio_m2: resultado.somaBeneficioM2,
			soma_outorga_m2: resultado.somaOutorgaM2,
			valor_total_bruto_rs: resultado.valorTotalBrutoRs,
			deducao_ehis_ezeis_rs: resultado.deducaoEhisEzeisRs,
			valor_total_recolhido_rs: resultado.valorTotalRecolhidoRs,
			valor_total_liquido_rs: resultado.valorTotalLiquidoRs,
			dentro_da_vigencia: resultado.dentroDaVigencia,

			criado_por: userId,

			enderecos: {
				create: entrada.enderecos
					.filter((e) => e.setor.trim() && e.quadra.trim() && e.codlog.trim())
					.map((e, idx) => {
						const encontrado = resultado.valoresUnitariosEncontrados[idx];
						return {
							ordem: idx + 1,
							setor: e.setor,
							quadra: e.quadra,
							codlog: e.codlog,
							valor_encontrado: encontrado?.valor ?? null,
							data_vigencia: encontrado?.dataVigencia ?? null,
						};
					}),
			},
			tipologias: {
				create: entrada.tipologias.map((t, idx) => {
					const calculada = resultado.tipologias[idx];
					return {
						ordem: idx + 1,
						id_tipologia: t.idTipologia,
						ca_basico: t.caBasico,
						ca_maximo: t.caMaximo,
						terreno_m2: t.terrenoM2,
						computavel_m2: t.computavelM2,
						tdc_m2: t.tdcM2,
						outorga_adquirida_m2: t.outorgaAdquiridaM2,
						fp: calculada?.fp ?? 0,
						fs: calculada?.fs ?? 0,
						ca_adicional: calculada?.caAdicional ?? 0,
						beneficio_m2: calculada?.beneficioM2 ?? 0,
						objeto_outorga_m2: calculada?.objetoOutorgaM2 ?? 0,
						c_rs_m2: calculada?.c ?? 0,
						valor_rs: calculada?.valorRs ?? 0,
					};
				}),
			},
		},
		select: { id: true },
	});

	return memorial;
}

/** Histórico de memoriais salvos para o processo, mais recente primeiro. */
export async function listarMemoriaisDoProcesso(processoId: string) {
	return prisma.oodcMemorialCalculo.findMany({
		where: { processo_id: processoId },
		orderBy: { criado_em: 'desc' },
		include: { enderecos: true, tipologias: true, usuario: { select: { nome: true } } },
	});
}

export interface MemorialResumoDto {
	id: string;
	criadoEm: string;
	criadoPorNome: string | null;
	idLegislacao: number;
	legislacaoOrigem: string;
	dataReferencia: string;
	valorTotalBrutoRs: number;
	valorTotalLiquidoRs: number;
}

/** Converte um memorial (com `Decimal` do Prisma) num DTO simples, serializável
 * para Client Components — usado pelo resumo do histórico na tela de cálculo. */
export function serializarMemorialResumo(
	memorial: Awaited<ReturnType<typeof listarMemoriaisDoProcesso>>[number],
): MemorialResumoDto {
	return {
		id: memorial.id,
		criadoEm: memorial.criado_em.toISOString(),
		criadoPorNome: memorial.usuario?.nome ?? null,
		idLegislacao: memorial.id_legislacao,
		legislacaoOrigem: memorial.legislacao_origem,
		dataReferencia: memorial.data_referencia.toISOString().slice(0, 10),
		valorTotalBrutoRs: Number(memorial.valor_total_bruto_rs),
		valorTotalLiquidoRs: Number(memorial.valor_total_liquido_rs),
	};
}
