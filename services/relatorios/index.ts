'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarRelatorio } from '@/lib/server/relatorios';
import { IRelatorio } from '@/types/relatorio';

export async function relatorio(
	ano?: number,
	mes?: number,
): Promise<{ ok: boolean; data: IRelatorio | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarRelatorio(ano, mes);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar relatório',
		};
	}
}
