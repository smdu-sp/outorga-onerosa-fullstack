/** @format */

'use server';

import { requireDev } from '@/lib/auth/session';
import { salvarConfiguracaoPlanejamento } from '@/lib/server/planejamento-orcamentario';
import { IRespostaPlanejamento } from '@/types/planejamento-orcamentario';

/** Exclusivo de usuário DEV — define até quando o prazo de edição do planejamento vale. */
export async function salvarConfiguracao(
	dia_limite: number,
	mes_limite: number,
): Promise<IRespostaPlanejamento> {
	try {
		const session = await requireDev();
		const data = await salvarConfiguracaoPlanejamento(dia_limite, mes_limite, session.usuario.sub);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao salvar configuração',
			data: null,
			status: 400,
		};
	}
}
