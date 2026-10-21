/** @format */

'use server';

import { requireDevAcao } from '@/lib/auth/session';
import { excluirProcesso } from '@/lib/server/processos';
import { IRespostaProcesso } from '@/types/processo';

export async function excluir(id: string): Promise<IRespostaProcesso> {
	try {
		await requireDevAcao();
		const data = await excluirProcesso(id);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao excluir processo.',
			data: null,
			status: 400,
		};
	}
}
