/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { desativarUsuario } from '@/lib/server/usuarios';
import { IRespostaUsuario } from '@/types/usuario';

export async function desativar(id: string): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_desativar');
		const data = await desativarUsuario(id);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao desativar usuário',
			data: null,
			status: 400,
		};
	}
}
