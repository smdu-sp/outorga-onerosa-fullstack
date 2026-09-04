/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { salvarPlanejamento } from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento, MetodoDistribuicao } from '@/types/planejamento-orcamentario';

export async function salvar(
	ano: number,
	parametros: { nome: string; percentual: number }[],
	meses: { mes: number; valor: number; editado_manualmente: boolean }[],
	historicoOverrides: { ano: number; valor: number | null }[],
	distribuicao: MetodoDistribuicao,
	motivoRevisao?: string,
): Promise<IRespostaPlanejamento> {
	try {
		const session = await requirePermissao('planejamento_orcamentario_editar');
		const data = await salvarPlanejamento(
			ano,
			parametros,
			meses,
			historicoOverrides,
			distribuicao,
			session.usuario.sub,
			session.usuario.dev === true,
			motivoRevisao,
		);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao salvar planejamento',
			data: null,
			status: 400,
		};
	}
}
