/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { validaUsuario as validaUsuarioDb } from '@/lib/server/usuarios';
import { IRespostaUsuario, IUsuario } from '@/types/usuario';

export async function validaUsuario(): Promise<IRespostaUsuario> {
	try {
		const session = await requireAuth();
		const data = await validaUsuarioDb(session.usuario.sub);
		return { ok: true, error: null, data: data as unknown as IUsuario, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Não foi possível validar o usuário',
			data: null,
			status: 500,
		};
	}
}
