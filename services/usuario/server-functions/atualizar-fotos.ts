/** @format */

'use server';

import { requireDevAcao } from '@/lib/auth/session';
import { atualizarFotosTodosUsuarios } from '@/lib/server/usuarios';
import { IRespostaUsuario } from '@/types/usuario';

export async function atualizarFotos(): Promise<IRespostaUsuario> {
	try {
		await requireDevAcao();
		const resultado = await atualizarFotosTodosUsuarios();
		return { ok: true, error: null, data: resultado, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar fotos',
			data: null,
			status: 400,
		};
	}
}
