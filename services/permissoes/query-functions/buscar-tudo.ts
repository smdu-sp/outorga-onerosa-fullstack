/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { buscarTodasPermissoes } from '@/lib/server/permissoes';
import { IPaginadoPermissoes, IRespostaPermissao } from '@/types/permissao';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
): Promise<IRespostaPermissao> {
	try {
		await requirePermissao('permissao_buscar_tudo');
		const data = await buscarTodasPermissoes(pagina, limite, busca);
		return { ok: true, error: null, data: data as unknown as IPaginadoPermissoes, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao buscar permissões',
			data: null,
			status: 400,
		};
	}
}
