'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarRelatorioTipologiaUso } from '@/lib/server/relatorio-tipologia';
import type { FiltroArrecadacao } from '@/lib/parcelas-utils';
import type { IRelatorioTipologia } from '@/types/relatorio';

export async function relatorioTipologia(
	filtro: FiltroArrecadacao = {},
): Promise<{ ok: boolean; data: IRelatorioTipologia | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarRelatorioTipologiaUso(filtro);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar tipologia de uso',
		};
	}
}
