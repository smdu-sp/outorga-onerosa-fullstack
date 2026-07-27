/** @format */

'use server';

import { garantirAcessoProcesso, requireAuth } from '@/lib/auth/session';
import { buscarDetalheProcesso } from '@/lib/server/processos';
import { IProcesso, IRespostaProcesso } from '@/types/processo';

export async function buscarPorId(id: string): Promise<IRespostaProcesso> {
	try {
		const session = await requireAuth();
		const data = await buscarDetalheProcesso(id);
		await garantirAcessoProcesso(session.usuario.sub, {
			criado_por: data.criado_por as string | null,
			status_pagamento: data.status_pagamento as string | null,
		});
		return { ok: true, error: null, data: data as unknown as IProcesso, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar processo',
			data: null,
			status: 500,
		};
	}
}
