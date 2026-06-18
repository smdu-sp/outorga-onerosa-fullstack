/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { requirePermissao } from '@/lib/auth/session';
import { atualizarPermissao } from '@/lib/server/permissoes';
import { IPermissao, IRespostaPermissao, IUpdatePermissao } from '@/types/permissao';

export async function atualizar(
	id: string,
	data: IUpdatePermissao,
): Promise<IRespostaPermissao> {
	try {
		await requirePermissao('permissao_atualizar');
		const atualizado = await atualizarPermissao(id, data);
		revalidateTag('permissao');
		return { ok: true, error: null, data: atualizado as unknown as IPermissao, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar permissão',
			data: null,
			status: 400,
		};
	}
}
