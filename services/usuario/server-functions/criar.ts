/** @format */

'use server';

import { requireDevAcao, requirePermissao } from '@/lib/auth/session';
import { criarUsuario } from '@/lib/server/usuarios';
import { ICreateUsuario, IRespostaUsuario, IUsuario } from '@/types/usuario';

export async function criar(data: ICreateUsuario): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_criar');
		// `dev` dá bypass total de permissões — só um dev pode conceder isso já
		// na criação, mesmo que quem chamou tenha 'usuario_criar'.
		if (data.dev !== undefined) await requireDevAcao();
		const novo = await criarUsuario(data);
		return { ok: true, error: null, data: novo as unknown as IUsuario, status: 201 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao criar usuário',
			data: null,
			status: 400,
		};
	}
}
