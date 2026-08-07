'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarSaudeArrecadacao } from '@/lib/server/relatorio-saude';
import type { FiltroArrecadacao } from '@/lib/parcelas-utils';
import { IRelatorioSaude } from '@/types/relatorio';

export async function relatorioSaude(
	ano?: number,
	intervalo?: Pick<FiltroArrecadacao, 'dataInicio' | 'dataFim'>,
): Promise<{ ok: boolean; data: IRelatorioSaude | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarSaudeArrecadacao(ano, intervalo);
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
