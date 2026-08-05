/** @format */

'use server';

import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import { painelOperacional } from '@/lib/server/processos';
import { IRespostaProcesso } from '@/types/processo';

export async function dashboard(): Promise<IRespostaProcesso> {
	try {
		const session = await requireAuth();
		const userId = session.usuario.sub;
		const verTodos = await usuarioPermitido(userId, 'processos_ver_todos');
		const verQuitados = !verTodos && (await usuarioPermitido(userId, 'processos_ver_quitados'));
		const data = await painelOperacional(
			verTodos
				? undefined
				: verQuitados
					? { apenasQuitados: true }
					: { criadoPor: userId },
		);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao carregar painel',
			data: null,
			status: 500,
		};
	}
}
