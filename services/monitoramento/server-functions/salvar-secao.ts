/** @format */

'use server';

import { garantirAcessoProcesso, requirePermissao } from '@/lib/auth/session';
import { salvarCotaSolidariedade, salvarSecaoMonitoramentoDeuso } from '@/lib/server/monitoramento';
import { buscarDetalheProcesso } from '@/lib/server/processos';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function salvarSecao(
	processoId: string,
	secaoId: string,
	payload: Record<string, unknown> | Record<string, unknown>[],
): Promise<IRespostaProcessoDetalhe> {
	try {
		const session = await requirePermissao('monitoramento_editar');
		const processo = await buscarDetalheProcesso(processoId);
		await garantirAcessoProcesso(session.usuario.sub, {
			criado_por: processo.criado_por as string | null,
			status_pagamento: processo.status_pagamento as string | null,
		});
		const data =
			secaoId === 'cota'
				? await salvarCotaSolidariedade(processoId, payload as Record<string, unknown>)
				: await salvarSecaoMonitoramentoDeuso(processoId, secaoId, payload);
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
