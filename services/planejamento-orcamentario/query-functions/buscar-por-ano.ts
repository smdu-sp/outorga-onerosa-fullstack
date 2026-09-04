/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import {
	buscarHistoricoBase,
	buscarPlanejamento,
	podeEditarPlanejamento,
} from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento } from '@/types/planejamento-orcamentario';

export async function buscarPorAno(ano: number): Promise<IRespostaPlanejamento> {
	try {
		const session = await requirePermissao('planejamento_orcamentario_editar');
		const [plano, editavel, historico] = await Promise.all([
			buscarPlanejamento(ano),
			podeEditarPlanejamento(ano, session.usuario.dev === true),
			buscarHistoricoBase(ano),
		]);
		return {
			ok: true,
			error: null,
			data: { ano, plano, editavel, historico },
			status: 200,
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar planejamento',
			data: null,
			status: 400,
		};
	}
}
