'use server';

import { requireAuth } from '@/lib/auth/session';
import { buscarRelatorioMes } from '@/lib/server/relatorio-mes';
import { IRelatorioMesDetalhe } from '@/types/relatorio';

export async function relatorioMes(
	ano: number,
	mes: number,
): Promise<{ ok: boolean; data: IRelatorioMesDetalhe | null; error: string | null }> {
	try {
		await requireAuth();
		const data = await buscarRelatorioMes(ano, mes);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao carregar relatório do mês',
		};
	}
}
