/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { buscarTodosGrupos } from '@/lib/server/grupos-permissao';
import { IPaginadoGrupoPermissao, IRespostaGrupoPermissao } from '@/types/grupo-permissao';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
): Promise<IRespostaGrupoPermissao> {
	try {
		await requirePermissao('grupo_permissao_buscar_tudo');
		const data = await buscarTodosGrupos(pagina, limite, busca);
		return { ok: true, error: null, data: data as unknown as IPaginadoGrupoPermissao, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar grupos',
			data: null,
			status: 400,
		};
	}
}
