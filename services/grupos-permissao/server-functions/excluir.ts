/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { excluirGrupoPermissao } from '@/lib/server/grupos-permissao';
import { IRespostaGrupoPermissao } from '@/types/grupo-permissao';

export async function excluir(id: string): Promise<IRespostaGrupoPermissao> {
	try {
		await requirePermissao('grupo_permissao_excluir');
		const data = await excluirGrupoPermissao(id);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao excluir grupo',
			data: null,
			status: 400,
		};
	}
}
