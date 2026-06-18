/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { buscarTodosUsuarios } from '@/lib/server/usuarios';
import { IRespostaUsuario, IUsuario, IPaginadoUsuario } from '@/types/usuario';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_buscar_tudo');
		const data = await buscarTodosUsuarios(pagina, limite, busca);
		return { ok: true, error: null, data: data as unknown as IPaginadoUsuario, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar usuários',
			data: null,
			status: 400,
		};
	}
}
