/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { dashboardProcessos } from '@/lib/server/processos';
import { IRespostaProcesso } from '@/types/processo';

export async function dashboard(): Promise<IRespostaProcesso> {
	try {
		await requireAuth();
		const data = await dashboardProcessos();
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao carregar dashboard',
			data: null,
			status: 500,
		};
	}
}
