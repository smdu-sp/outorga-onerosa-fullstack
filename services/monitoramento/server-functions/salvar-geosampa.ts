/** @format */

'use server';

import type { IGeoSampaResult } from '@/types/geosampa';
import { requireAuth } from '@/lib/auth/session';
import { salvarDadosGeoSampaNoProcesso } from '@/lib/server/monitoramento';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function salvarDadosGeoSampa(
	processoId: string,
	modo: 'SQL' | 'PROCESSO',
	identificador: string,
	geosampa: IGeoSampaResult,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requireAuth();
		const data = await salvarDadosGeoSampaNoProcesso(
			processoId,
			modo,
			identificador,
			geosampa,
		);
		return {
			ok: true,
			error: null,
			data: data as unknown as IProcessoDetalhe,
			status: 200,
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao salvar dados do GeoSampa.',
			data: null,
			status: 400,
		};
	}
}
