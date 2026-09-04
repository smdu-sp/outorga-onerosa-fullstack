/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarComparativoPlanejadoExecutado } from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento } from '@/types/planejamento-orcamentario';

/** Aberta a qualquer usuário autenticado — tela de relatório, não de gestão. */
export async function buscarComparativo(ano: number): Promise<IRespostaPlanejamento> {
	try {
		await requireAuth();
		const data = await buscarComparativoPlanejadoExecutado(ano);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar comparativo',
			data: null,
			status: 400,
		};
	}
}
