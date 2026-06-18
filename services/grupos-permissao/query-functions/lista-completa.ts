/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { listaCompletaGrupos } from '@/lib/server/grupos-permissao';
import { IGrupoPermissao, IRespostaGrupoPermissao } from '@/types/grupo-permissao';

export async function listaCompleta(): Promise<IRespostaGrupoPermissao> {
	try {
		await requirePermissao('grupo_permissao_buscar_tudo');
		const data = await listaCompletaGrupos();
		return { ok: true, error: null, data: data as unknown as IGrupoPermissao[], status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao listar grupos',
			data: null,
			status: 500,
		};
	}
}
