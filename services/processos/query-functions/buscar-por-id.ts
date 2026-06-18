/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarDetalheProcesso } from '@/lib/server/processos';
import { IProcesso, IRespostaProcesso } from '@/types/processo';

export async function buscarPorId(id: string): Promise<IRespostaProcesso> {
	try {
		await requireAuth();
		const data = await buscarDetalheProcesso(id);
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
