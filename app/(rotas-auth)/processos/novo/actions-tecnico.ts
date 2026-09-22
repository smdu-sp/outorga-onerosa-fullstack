'use server';

import { requirePermissao } from '@/lib/auth/session';
import type { EnderecoValorUnitario, EntradaCalculoOodc, ResultadoCalculoOodc, ValorUnitarioEncontrado } from '@/lib/oodc/tipos';
import type {
	EnderecoValorUnitarioCota,
	EntradaCalculoCota,
	ResultadoCalculoCota,
	ValorUnitarioEncontradoCota,
} from '@/lib/cota/tipos';
import { buscarValorReferencia } from '@/lib/server/oodc-valor-referencia';
import { buscarValorReferenciaCota } from '@/lib/server/cota-valor-referencia';
import { salvarMemorialCalculo, montarRascunhoPorNumeroProcesso, OodcMemorialError, type RascunhoCalculoOodc } from '@/lib/server/oodc-memorial';
import { salvarMemorialCalculoCota } from '@/lib/server/cota-memorial';
import { montarPdfCalculoOutorga, nomeArquivoPdfCalculo } from '@/lib/server/pdf-calculo-outorga';
import type { DadosPdfCalculo } from '@/types/pdf-calculo-outorga';
import { salvarCotaSolidariedade, salvarResumoCalculoOodcNoProcesso } from '@/lib/server/monitoramento';
import { salvarMultaProcesso } from '@/lib/server/multas';
import { buscarDetalheProcesso, criarProcesso } from '@/lib/server/processos';
import type { IProcessoDetalhe } from '@/types/processo-detalhe';

export type TipoNovoProcesso = 'OUTORGA' | 'COTA' | 'OUTORGA_COTA' | 'AIU';

export interface RascunhoNovoProcesso {
	oodc: RascunhoCalculoOodc;
	cota: {
		enderecos: EnderecoValorUnitarioCota[];
		valoresEncontrados: ValorUnitarioEncontradoCota[];
		vMax: number | null;
	};
}

/**
 * Busca BI + GeoSampa pelo número do processo (mesmo mecanismo de
 * "Cálculo OODC (teste)" — `montarRascunhoPorNumeroProcesso`) e monta o rascunho
 * inicial dos dois memoriais (OODC e Cota) para pré-preencher os painéis de
 * `/processos/novo`. Os endereços (setor/quadra/codlog) resolvidos para a OODC são
 * reaproveitados para a Cota — vêm da mesma fonte (BI dbo.prata_sql_incra/GeoSampa);
 * só o valor de referência (Vm²) é buscado de novo, na tabela própria da Cota.
 */
export async function buscarDadosProcessoNovoAction(
	numProcesso: string,
): Promise<{ ok: boolean; rascunho?: RascunhoNovoProcesso; error?: string }> {
	try {
		await requirePermissao('processos_criar');
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	try {
		const oodc = await montarRascunhoPorNumeroProcesso(numProcesso);
		const enderecosCota: EnderecoValorUnitarioCota[] = oodc.entrada.enderecos.map((e) => ({ ...e }));
		const temEndereco = enderecosCota.some((e) => e.setor.trim() && e.quadra.trim() && e.codlog.trim());
		const { valores, vMax } = temEndereco
			? await buscarValorReferenciaCota(enderecosCota)
			: { valores: [], vMax: null };
		return { ok: true, rascunho: { oodc, cota: { enderecos: enderecosCota, valoresEncontrados: valores, vMax } } };
	} catch (error) {
		if (error instanceof OodcMemorialError) return { ok: false, error: error.message };
		return { ok: false, error: (error as Error).message };
	}
}

/** Busca o V_MÁXIMO (R$/m²) da OODC para até 10 endereços — sem processo ainda
 * criado, por isso o gate é a permissão de criar processo, não `garantirAcessoProcesso`. */
export async function buscarValorReferenciaOodcAction(
	enderecos: EnderecoValorUnitario[],
): Promise<{ ok: boolean; valores?: ValorUnitarioEncontrado[]; vMax?: number | null; error?: string }> {
	try {
		await requirePermissao('processos_criar');
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	try {
		const { valores, vMax } = await buscarValorReferencia(enderecos);
		return { ok: true, valores, vMax };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}

/** Busca o Vm² (R$/m²) da Cota de Solidariedade para até 6 endereços. */
export async function buscarValorReferenciaCotaAction(
	enderecos: EnderecoValorUnitarioCota[],
): Promise<{ ok: boolean; valores?: ValorUnitarioEncontradoCota[]; vMax?: number | null; error?: string }> {
	try {
		await requirePermissao('processos_criar');
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	try {
		const { valores, vMax } = await buscarValorReferenciaCota(enderecos);
		return { ok: true, valores, vMax };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}

/**
 * Confirma a criação do processo. `tipo` decide o que é gravado:
 * - OUTORGA/AIU: memorial da OODC (`entradaOodc`/`resultadoOodc` obrigatórios) —
 *   calculado pelo motor `lib/oodc/calculo.ts` (mesmo da tela oficial
 *   `/processos/[id]/calculo-oodc`), não mais pela API externa Antares.
 * - COTA: memorial da Cota de Solidariedade (`entradaCota`/`resultadoCota`
 *   obrigatórios) — calculado por `lib/cota/calculo.ts`.
 * - OUTORGA_COTA: os dois — obrigação predominante PDE do processo (ver
 *   contexto-dominio.md: "tem Cota?" não é o `Processo.tipo`, é derivado).
 */
export async function confirmarProcessoTecnico(
	numProcesso: string,
	tipo: TipoNovoProcesso,
	entradaOodc?: EntradaCalculoOodc,
	resultadoOodc?: ResultadoCalculoOodc,
	entradaCota?: EntradaCalculoCota,
	resultadoCota?: ResultadoCalculoCota,
	valorMulta?: number,
): Promise<{ ok: boolean; data?: IProcessoDetalhe; error?: string }> {
	try {
		const session = await requirePermissao('processos_criar');

		const precisaCalculo = tipo === 'OUTORGA' || tipo === 'OUTORGA_COTA' || tipo === 'AIU';
		const precisaCota = tipo === 'COTA' || tipo === 'OUTORGA_COTA';

		if (precisaCalculo && !(entradaOodc && resultadoOodc)) {
			return { ok: false, error: 'Cálculo da outorga ausente.' };
		}
		if (precisaCota && !(entradaCota && resultadoCota)) {
			return { ok: false, error: 'Cálculo da Cota de Solidariedade ausente.' };
		}
		if (valorMulta != null && !(valorMulta > 0)) {
			return { ok: false, error: 'Informe um valor de multa válido.' };
		}

		const tipoBanco = tipo === 'COTA' ? 'COTA' : tipo === 'AIU' ? 'AIU' : 'PDE';

		const processo = await criarProcesso(
			{
				num_processo: numProcesso,
				data_entrada: new Date(),
				origem: 'PORTAL',
				valor_total: 0,
				tipo: tipoBanco,
			},
			session.usuario.sub,
		);

		if (precisaCalculo && entradaOodc && resultadoOodc) {
			await salvarMemorialCalculo(
				processo.id,
				entradaOodc,
				resultadoOodc,
				{ legislacaoOrigem: 'MANUAL', opcaoExpressaRegimeNovo: false, despachoDecisorioEmitido: false },
				session.usuario.sub,
			);
			const somaTerrenoM2 = resultadoOodc.somaTerrenoM2;
			const somaComputavelM2 = resultadoOodc.somaComputavelM2;
			const umaTipologia = resultadoOodc.tipologias.length === 1 ? resultadoOodc.tipologias[0] : undefined;
			await salvarResumoCalculoOodcNoProcesso(processo.id, {
				areaTerreno: somaTerrenoM2,
				areaComputavel: somaComputavelM2,
				valorM2: resultadoOodc.vMax,
				contrapartidaTotal: resultadoOodc.valorTotalLiquidoRs,
				fpUsoR: umaTipologia?.fp,
				fsUsoR: umaTipologia?.fs,
			});
		}
		if (precisaCota && entradaCota && resultadoCota) {
			await salvarMemorialCalculoCota(processo.id, entradaCota, resultadoCota, session.usuario.sub);
			await salvarCotaSolidariedade(processo.id, { valor_calculado_processo: resultadoCota.valorTotalRs });
		}
		if (valorMulta != null && valorMulta > 0) {
			await salvarMultaProcesso(processo.id, { valor: valorMulta });
		}

		const detalhe = await buscarDetalheProcesso(processo.id);
		return { ok: true, data: detalhe as unknown as IProcessoDetalhe };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao confirmar o processo.',
		};
	}
}

/** Gera o memorial de cálculo em PDF para o técnico anexar ao processo SEI. */
export async function gerarPdfMemorialCalculo(
	dados: DadosPdfCalculo,
): Promise<{ ok: boolean; base64?: string; filename?: string; error?: string }> {
	try {
		const session = await requirePermissao('processos_criar');
		if (!dados?.numProcesso?.trim()) {
			return { ok: false, error: 'Número do processo ausente.' };
		}

		const pdf = await montarPdfCalculoOutorga({
			...dados,
			geradoPor: dados.geradoPor || session.usuario.nome,
		});

		return {
			ok: true,
			base64: Buffer.from(pdf).toString('base64'),
			filename: nomeArquivoPdfCalculo(dados.numProcesso),
		};
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Não foi possível gerar o PDF do cálculo.',
		};
	}
}
