'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarEstatisticasProcessos } from '@/lib/server/processos';
import { IEstatisticasProcessos } from '@/types/processo';

export async function buscarEstatisticas(): Promise<{
	ok: boolean;
	data: IEstatisticasProcessos | null;
}> {
	try {
		await requireAuth();
		const data = await buscarEstatisticasProcessos();
		return { ok: true, data };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, data: null };
	}
}
