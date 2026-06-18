/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarDetalheProcesso } from '@/lib/server/processos';
import { redirect } from 'next/navigation';
import { IRespostaProcessoDetalhe, IProcessoDetalhe } from '@/types/processo-detalhe';

export async function buscarDetalhe(id: string): Promise<IRespostaProcessoDetalhe> {
	try {
		await requireAuth();
		const data = await buscarDetalheProcesso(id);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Erro ao buscar detalhes.';
		if (message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: message, data: null, status: 404 };
	}
}
