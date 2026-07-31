/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import {
	quitarMultaProcesso,
	removerMultaProcesso,
	reverterQuitarMultaProcesso,
	salvarMultaProcesso,
	type IDadosMulta,
} from '@/lib/server/multas';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function salvarMulta(
	processoId: string,
	dados: IDadosMulta,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await salvarMultaProcesso(processoId, dados);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao salvar multa.',
			data: null,
			status: 400,
		};
	}
}

export async function quitarMulta(
	processoId: string,
	dataQuitacao?: string,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await quitarMultaProcesso(processoId, dataQuitacao);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao quitar multa.',
			data: null,
			status: 400,
		};
	}
}

export async function reverterQuitarMulta(processoId: string): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await reverterQuitarMultaProcesso(processoId);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao reverter quitação da multa.',
			data: null,
			status: 400,
		};
	}
}

export async function removerMulta(processoId: string): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await removerMultaProcesso(processoId);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao remover multa.',
			data: null,
			status: 400,
		};
	}
}
