/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { buscarUsuarioPorId } from '@/lib/server/usuarios';
import { IRespostaUsuario, IUsuario } from '@/types/usuario';

export async function buscarPorId(id: string): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_buscar_tudo');
		const data = await buscarUsuarioPorId(id);
		return { ok: true, error: null, data: data as unknown as IUsuario, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar usuário',
			data: null,
			status: 400,
		};
	}
}
