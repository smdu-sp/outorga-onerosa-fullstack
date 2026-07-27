/** @format */

'use server';

import { buscarDetalheProcesso, atualizarProcesso } from '@/lib/server/processos';
import { garantirAcessoProcesso, requirePermissao } from '@/lib/auth/session';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function atualizarDadosIniciais(
	processoId: string,
	dados: Record<string, unknown>,
): Promise<IRespostaProcessoDetalhe> {
	try {
		const session = await requirePermissao('processos_editar_dados_iniciais');
		const processo = await buscarDetalheProcesso(processoId);
		await garantirAcessoProcesso(session.usuario.sub, { criado_por: processo.criado_por as string | null });
		const data = await atualizarProcesso(processoId, dados as Parameters<typeof atualizarProcesso>[1]);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar dados do processo.',
			data: null,
			status: 400,
		};
	}
}
