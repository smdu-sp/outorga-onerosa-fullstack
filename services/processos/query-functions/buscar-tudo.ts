/** @format */

'use server';

import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import { buscarTodosProcessos } from '@/lib/server/processos';
import { IRespostaProcesso } from '@/types/processo';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	tipo: string = 'TODOS',
	status: string = 'TODOS',
	vencimento: string = '',
	pendencia: string = '',
	novo: string = 'TODOS',
): Promise<IRespostaProcesso> {
	try {
		const session = await requireAuth();
		const userId = session.usuario.sub;
		const verTodos = await usuarioPermitido(userId, 'processos_ver_todos');
		const verQuitados = !verTodos && (await usuarioPermitido(userId, 'processos_ver_quitados'));
		const data = await buscarTodosProcessos(
			pagina,
			limite,
			busca,
			tipo,
			status,
			vencimento,
			pendencia,
			verTodos
				? undefined
				: verQuitados
					? { apenasQuitados: true }
					: { criadoPor: userId },
			novo,
		);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar processos',
			data: null,
			status: 500,
		};
	}
}
