/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { criarGrupoPermissao } from '@/lib/server/grupos-permissao';
import { ICreateGrupoPermissao, IGrupoPermissao, IRespostaGrupoPermissao } from '@/types/grupo-permissao';

export async function criar(data: ICreateGrupoPermissao): Promise<IRespostaGrupoPermissao> {
	try {
		await requirePermissao('grupo_permissao_criar');
		const novo = await criarGrupoPermissao(data);
		return { ok: true, error: null, data: novo as unknown as IGrupoPermissao, status: 201 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao criar grupo',
			data: null,
			status: 400,
		};
	}
}
