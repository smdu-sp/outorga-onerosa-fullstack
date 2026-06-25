'use server';

import { requireAuth } from '@/lib/auth/session';
import {
	buscarAnosComArrecadacaoSubprefeitura,
	buscarArrecadacaoPorSubprefeitura,
	type FiltroPeriodoSubprefeitura,
} from '@/lib/server/relatorios-subprefeituras';
import type { IRelatorioSubprefeituraDetalhe } from '@/types/relatorio';

export async function relatorioSubprefeituras(
	filtro: FiltroPeriodoSubprefeitura = {},
): Promise<{ ok: boolean; data: IRelatorioSubprefeituraDetalhe[] | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarArrecadacaoPorSubprefeitura(filtro);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar subprefeituras',
		};
	}
}

export async function anosArrecadacaoSubprefeituras(): Promise<number[]> {
	await requireAuth();
	return buscarAnosComArrecadacaoSubprefeitura();
}
