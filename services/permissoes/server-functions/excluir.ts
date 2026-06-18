/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { requirePermissao } from '@/lib/auth/session';
import { excluirPermissao } from '@/lib/server/permissoes';
import { IRespostaPermissao } from '@/types/permissao';

export async function excluir(id: string): Promise<IRespostaPermissao> {
	try {
		await requirePermissao('permissao_excluir');
		const data = await excluirPermissao(id);
		revalidateTag('permissao');
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao excluir permissão',
			data: null,
			status: 400,
		};
	}
}
