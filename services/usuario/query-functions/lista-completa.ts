/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { listaCompletaUsuarios } from '@/lib/server/usuarios';
import { IRespostaUsuario, IUsuario, IPaginadoUsuario } from '@/types/usuario';

export async function listaCompleta(): Promise<IRespostaUsuario> {
	try {
		await requirePermissao('usuario_buscar_tudo');
		const data = await listaCompletaUsuarios();
		return { ok: true, error: null, data: data as unknown as IUsuario[], status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao listar usuários',
			data: null,
			status: 500,
		};
	}
}
