'use server';

import { requirePermissao } from '@/lib/auth/session';
import { consultarCalculoOutorga, CalculoOutorgaError } from '@/lib/server/calculo-outorga';
import { salvarCotaSolidariedade, salvarDadosGeoSampaNoProcesso } from '@/lib/server/monitoramento';
import { salvarMultaProcesso } from '@/lib/server/multas';
import { buscarDetalheProcesso, criarProcesso } from '@/lib/server/processos';
import type { IGeoSampaResult } from '@/types/geosampa';
import type { IProcessoDetalhe } from '@/types/processo-detalhe';

export type TipoNovoProcesso = 'OUTORGA' | 'COTA' | 'OUTORGA_COTA' | 'AIU';

export async function consultarCalculo(
	numProcesso: string,
	areaComputavel: number,
	areaTerreno: number,
): Promise<{ ok: boolean; data?: IGeoSampaResult; error?: string }> {
	try {
		await requirePermissao('processos_criar');
		const data = await consultarCalculoOutorga(numProcesso, areaComputavel, areaTerreno);
		return { ok: true, data };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		if (error instanceof CalculoOutorgaError) return { ok: false, error: error.message };
		return {
			ok: false,
			error: 'Não foi possível consultar a API de cálculo. Tente novamente.',
		};
	}
}

/**
 * Confirma a criação do processo. `tipo` decide o que é gravado:
 * - OUTORGA: só o cálculo da Antares (`calculo` obrigatório).
 * - AIU: mesmo fluxo da Outorga, grava `Processo.tipo = AIU`.
 * - COTA: só o valor de Cota digitado manualmente (`valorCota` obrigatório) —
 *   não passa pela Antares.
 * - OUTORGA_COTA: os dois — obrigação predominante PDE do processo (ver
 *   contexto-dominio.md: "tem Cota?" não é o `Processo.tipo`, é derivado).
 */
export async function confirmarProcessoTecnico(
	numProcesso: string,
	tipo: TipoNovoProcesso,
	calculo?: IGeoSampaResult,
	valorCota?: number,
	valorMulta?: number,
): Promise<{ ok: boolean; data?: IProcessoDetalhe; error?: string }> {
	try {
		const session = await requirePermissao('processos_criar');

		const precisaCalculo = tipo === 'OUTORGA' || tipo === 'OUTORGA_COTA' || tipo === 'AIU';
		const precisaCota = tipo === 'COTA' || tipo === 'OUTORGA_COTA';

		if (precisaCalculo && !calculo) {
			return { ok: false, error: 'Cálculo da outorga ausente.' };
		}
		if (precisaCota && !(valorCota != null && valorCota > 0)) {
			return { ok: false, error: 'Informe o valor da Cota de Solidariedade.' };
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

		if (precisaCalculo && calculo) {
			await salvarDadosGeoSampaNoProcesso(processo.id, 'PROCESSO', numProcesso, calculo);
		}
		if (precisaCota && valorCota != null) {
			await salvarCotaSolidariedade(processo.id, { valor_calculado_processo: valorCota });
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
