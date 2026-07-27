/** @format */

'use server';

import { buscarDetalheProcesso, recalcularContrapartidaProcesso } from '@/lib/server/processos';
import { garantirAcessoProcesso, requirePermissao } from '@/lib/auth/session';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function recalcularContrapartida(processoId: string): Promise<IRespostaProcessoDetalhe> {
	try {
		const session = await requirePermissao('processos_recalcular');
		const processo = await buscarDetalheProcesso(processoId);
		await garantirAcessoProcesso(session.usuario.sub, { criado_por: processo.criado_por as string | null });
		const data = await recalcularContrapartidaProcesso(processoId);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao recalcular contrapartida.',
			data: null,
			status: 400,
		};
	}
}
