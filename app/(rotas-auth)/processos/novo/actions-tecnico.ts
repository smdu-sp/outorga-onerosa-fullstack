'use server';

import { requirePermissao } from '@/lib/auth/session';
import { consultarCalculoOutorga, CalculoOutorgaError } from '@/lib/server/calculo-outorga';
import { salvarDadosGeoSampaNoProcesso } from '@/lib/server/monitoramento';
import { criarProcesso } from '@/lib/server/processos';
import type { IGeoSampaResult } from '@/types/geosampa';
import type { IProcessoDetalhe } from '@/types/processo-detalhe';

export async function consultarCalculo(
	numProcesso: string,
): Promise<{ ok: boolean; data?: IGeoSampaResult; error?: string }> {
	try {
		await requirePermissao('processos_criar');
		const data = await consultarCalculoOutorga(numProcesso);
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

export async function confirmarProcessoTecnico(
	numProcesso: string,
	calculo: IGeoSampaResult,
): Promise<{ ok: boolean; data?: IProcessoDetalhe; error?: string }> {
	try {
		const session = await requirePermissao('processos_criar');
		const processo = await criarProcesso(
			{
				num_processo: numProcesso,
				data_entrada: new Date(),
				origem: 'PORTAL',
				valor_total: 0,
			},
			session.usuario.sub,
		);
		const detalhe = await salvarDadosGeoSampaNoProcesso(processo.id, 'PROCESSO', numProcesso, calculo);
		return { ok: true, data: detalhe as unknown as IProcessoDetalhe };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao confirmar o processo.',
		};
	}
}
