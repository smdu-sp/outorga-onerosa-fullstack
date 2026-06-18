/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { salvarSecaoMonitoramentoDeuso } from '@/lib/server/monitoramento';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function salvarSecao(
	processoId: string,
	secaoId: string,
	payload: Record<string, unknown> | Record<string, unknown>[],
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requireAuth();
		const data = await salvarSecaoMonitoramentoDeuso(processoId, secaoId, payload);
		return {
			ok: true,
			error: null,
			data: data as unknown as IProcessoDetalhe,
			status: 200,
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao salvar monitoramento.',
			data: null,
			status: 400,
		};
	}
}
