/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { listarAnosComPlanejamento } from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento } from '@/types/planejamento-orcamentario';

/** Aberta a qualquer usuário autenticado — alimenta o seletor de ano do relatório. */
export async function listarAnos(): Promise<IRespostaPlanejamento> {
	try {
		await requireAuth();
		const data = await listarAnosComPlanejamento();
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao listar anos',
			data: null,
			status: 400,
		};
	}
}
