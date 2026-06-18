/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { listaCompletaPermissoes } from '@/lib/server/permissoes';
import { IPermissao, IRespostaPermissao } from '@/types/permissao';

export async function listaCompleta(): Promise<IRespostaPermissao> {
	try {
		await requirePermissao('permissao_buscar_tudo');
		const data = await listaCompletaPermissoes();
		return { ok: true, error: null, data: data as unknown as IPermissao[], status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao listar permissões',
			data: null,
			status: 500,
		};
	}
}
