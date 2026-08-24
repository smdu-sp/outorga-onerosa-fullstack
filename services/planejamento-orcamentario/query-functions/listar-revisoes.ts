/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { buscarRevisoes } from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento } from '@/types/planejamento-orcamentario';

export async function listarRevisoes(ano: number): Promise<IRespostaPlanejamento> {
	try {
		await requirePermissao('planejamento_orcamentario_editar');
		const data = await buscarRevisoes(ano);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar revisões',
			data: null,
			status: 400,
		};
	}
}
