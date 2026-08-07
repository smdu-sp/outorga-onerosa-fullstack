'use server';

import { requireAuth } from '@/lib/auth/session';
import {
	buscarRankingProcessos,
	buscarRelatorio,
	type FiltroPeriodoRanking,
	type FiltroRelatorioHome,
} from '@/lib/server/relatorios';
import { IRelatorio, IRelatorioTop10 } from '@/types/relatorio';

export async function relatorio(
	/** `null` = todos os anos; `undefined` = ano corrente; ou objeto com intervalo */
	anoOuFiltro?: number | null | FiltroRelatorioHome,
	mes?: number,
): Promise<{ ok: boolean; data: IRelatorio | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarRelatorio(anoOuFiltro, mes);
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

export async function rankingProcessos(
	filtro: FiltroPeriodoRanking = {},
): Promise<{ ok: boolean; data: IRelatorioTop10[] | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarRankingProcessos(filtro);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar processos',
		};
	}
}
