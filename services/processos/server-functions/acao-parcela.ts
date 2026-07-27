/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import {
	aplicarAcaoParcela,
	atualizarParcelaProcesso,
	criarParcelaProcesso,
	criarParcelasEmLote,
	type AcaoParcela,
	type IDadosParcela,
	type IDadosParcelasEmLote,
} from '@/lib/server/parcelas';
import { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export async function acaoParcela(
	processoId: string,
	parcelaId: string,
	acao: AcaoParcela,
	dataQuitacao?: string,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao(
			acao === 'reverter-antecipacao' ? 'parcelas_reverter_antecipacao' : 'parcelas_editar',
		);
		const data = await aplicarAcaoParcela(processoId, parcelaId, acao, dataQuitacao);
		return {
			ok: true,
			error: null,
			data: data as unknown as IProcessoDetalhe,
			status: 200,
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar parcela.',
			data: null,
			status: 400,
		};
	}
}

export async function criarParcela(
	processoId: string,
	dados: IDadosParcela,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await criarParcelaProcesso(processoId, dados);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 201 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao criar parcela.',
			data: null,
			status: 400,
		};
	}
}

export async function criarParcelasEmLoteAction(
	processoId: string,
	dados: IDadosParcelasEmLote,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await criarParcelasEmLote(processoId, dados);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 201 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao criar parcelas em lote.',
			data: null,
			status: 400,
		};
	}
}

export async function atualizarParcela(
	parcelaId: string,
	dados: IDadosParcela,
): Promise<IRespostaProcessoDetalhe> {
	try {
		await requirePermissao('parcelas_editar');
		const data = await atualizarParcelaProcesso(parcelaId, dados);
		return { ok: true, error: null, data: data as unknown as IProcessoDetalhe, status: 200 };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar parcela.',
			data: null,
			status: 400,
		};
	}
}
