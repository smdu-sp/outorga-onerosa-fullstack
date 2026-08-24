/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { sugerirPlanejamento } from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento, MetodoDistribuicao } from '@/types/planejamento-orcamentario';

export async function gerarSugestao(
	ano: number,
	parametros: { nome: string; percentual: number }[],
	historicoOverrides: { ano: number; valor: number | null }[],
	distribuicao: MetodoDistribuicao,
): Promise<IRespostaPlanejamento> {
	try {
		await requirePermissao('planejamento_orcamentario_editar');
		const data = await sugerirPlanejamento(ano, parametros, { historicoOverrides, distribuicao });
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao gerar sugestão de planejamento',
			data: null,
			status: 400,
		};
	}
}
