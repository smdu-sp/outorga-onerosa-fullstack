'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarOutorgaPorZona } from '@/lib/server/relatorio-zonas';
import type { FiltroArrecadacao } from '@/lib/parcelas-utils';
import { IRelatorioZonas } from '@/types/relatorio';

export async function relatorioZonas(
	ano?: number,
	mes?: number,
	intervalo?: Pick<FiltroArrecadacao, 'dataInicio' | 'dataFim'>,
): Promise<{ ok: boolean; data: IRelatorioZonas | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarOutorgaPorZona(ano, mes, intervalo);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar relatório por zona',
		};
	}
}
