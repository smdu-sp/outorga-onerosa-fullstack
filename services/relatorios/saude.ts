'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarSaudeArrecadacao } from '@/lib/server/relatorio-saude';
import { IRelatorioSaude } from '@/types/relatorio';

export async function relatorioSaude(
	ano?: number,
): Promise<{ ok: boolean; data: IRelatorioSaude | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarSaudeArrecadacao(ano);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar saúde da arrecadação',
		};
	}
}
