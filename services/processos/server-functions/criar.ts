/** @format */

'use server';

import { requireAuth, requirePermissao } from '@/lib/auth/session';
import { criarProcesso } from '@/lib/server/processos';
import { redirect } from 'next/navigation';
import { IRespostaProcesso, ICreateProcesso } from '@/types/processo';

export async function criar(data: ICreateProcesso): Promise<IRespostaProcesso> {
	try {
		await requirePermissao('processos_criar');
		const novoProcesso = await criarProcesso(data);
		return { ok: true, error: null, data: novoProcesso, status: 201 };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Erro ao criar processo.';
		if (message.includes('login')) redirect('/login');
		return { ok: false, error: message, data: null, status: 400 };
	}
}
