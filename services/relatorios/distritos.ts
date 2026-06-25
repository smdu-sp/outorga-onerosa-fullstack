'use server';

import { requireAuth } from '@/lib/auth/session';
import {
	buscarAnosComArrecadacao,
	buscarArrecadacaoPorDistrito,
	type FiltroPeriodoDistrito,
} from '@/lib/server/relatorios-distritos';
import type { IRelatorioDistrito } from '@/types/relatorio';

export async function relatorioDistritos(filtro: FiltroPeriodoDistrito = {}): Promise<{
	ok: boolean;
	data: IRelatorioDistrito[] | null;
	error: string | null;
}> {
	try {
		await requireAuth();
		const data = await buscarArrecadacaoPorDistrito(filtro);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar distritos',
		};
	}
}

export async function anosArrecadacaoDistritos(): Promise<number[]> {
	await requireAuth();
	return buscarAnosComArrecadacao();
}
