/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { aplicarAcaoParcela, type AcaoParcela } from '@/lib/server/parcelas';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function acaoParcela(
	processoId: string,
	parcelaId: string,
	acao: AcaoParcela,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requireAuth();
		const data = await aplicarAcaoParcela(processoId, parcelaId, acao);
		return {
			ok: true,
			error: null,
			data: data as unknown as IProcessoDetalhe,
			status: 200,
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar parcela.',
			data: null,
			status: 400,
		};
	}
}
