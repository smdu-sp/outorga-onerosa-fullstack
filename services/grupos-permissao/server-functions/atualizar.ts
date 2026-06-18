/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { atualizarGrupoPermissao } from '@/lib/server/grupos-permissao';
import { IGrupoPermissao, IRespostaGrupoPermissao, IUpdateGrupoPermissao } from '@/types/grupo-permissao';

export async function atualizar(
	id: string,
	data: IUpdateGrupoPermissao,
): Promise<IRespostaGrupoPermissao> {
	try {
		await requirePermissao('grupo_permissao_atualizar');
		const atualizado = await atualizarGrupoPermissao(id, data);
		return { ok: true, error: null, data: atualizado as unknown as IGrupoPermissao, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar grupo',
			data: null,
			status: 400,
		};
	}
}
