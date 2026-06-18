/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { atualizarUsuario } from '@/lib/server/usuarios';
import { IRespostaUsuario, IUpdateUsuario, IUsuario } from '@/types/usuario';

export async function atualizar(
	id: string,
	data: IUpdateUsuario,
): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_atualizar');
		const atualizado = await atualizarUsuario(id, data);
		return { ok: true, error: null, data: atualizado as unknown as IUsuario, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar usuário',
			data: null,
			status: 400,
		};
	}
}
