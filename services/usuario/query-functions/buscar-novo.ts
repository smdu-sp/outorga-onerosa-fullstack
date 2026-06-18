/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { buscarNovoUsuario } from '@/lib/server/usuarios';
import { INovoUsuario, IRespostaUsuario } from '@/types/usuario';

export async function buscarNovo(login: string): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_criar');
		const data = await buscarNovoUsuario(login);
		return { ok: true, error: null, data: data as unknown as INovoUsuario, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar usuário no AD',
			data: null,
			status: 400,
		};
	}
}
