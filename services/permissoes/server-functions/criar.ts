/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { requirePermissao } from '@/lib/auth/session';
import { criarPermissao } from '@/lib/server/permissoes';
import { ICreatePermissao, IPermissao, IRespostaPermissao } from '@/types/permissao';

export async function criar(data: ICreatePermissao): Promise<IRespostaPermissao> {
	try {
		await requirePermissao('permissao_criar');
		const novo = await criarPermissao(data);
		revalidateTag('permissao');
		return { ok: true, error: null, data: novo as unknown as IPermissao, status: 201 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao criar permissão',
			data: null,
			status: 400,
		};
	}
}
