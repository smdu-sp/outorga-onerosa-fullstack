/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { autorizarUsuario } from '@/lib/server/usuarios';
import { IRespostaUsuario } from '@/types/usuario';

export async function autorizar(id: string): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_autorizar');
		const data = await autorizarUsuario(id);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao autorizar usuário',
			data: null,
			status: 400,
		};
	}
}
