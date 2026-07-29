'use server';

import { requireDev } from '@/lib/auth/session';
import { buscarAssuntosPorProcessoNoBi, mapearAssuntoBiParaIdOodc } from '@/lib/server/bi-cadastro';
import { buscarValorReferencia } from '@/lib/server/oodc-valor-referencia';
import type { EnderecoValorUnitario, ValorUnitarioEncontrado } from '@/lib/oodc/tipos';

/** Busca o V (R$/m²) vigente para até 10 endereços — só acessível para usuários DEV. */
export async function buscarValorReferenciaAction(
	enderecos: EnderecoValorUnitario[],
): Promise<{ ok: boolean; valores?: ValorUnitarioEncontrado[]; vMax?: number | null; error?: string }> {
	try {
		await requireDev();
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	try {
		const { valores, vMax } = await buscarValorReferencia(enderecos);
		return { ok: true, valores, vMax };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}

export interface CandidatoAssuntoBi {
	assunto: string;
	idSugerido: number | null;
	dataEmissao?: string;
}

/** Busca no BI (dbo.Cadastros → dbo.Assuntos) os assuntos de um processo, pelo número do processo. */
export async function buscarAssuntoPorProcessoAction(
	numProcesso: string,
): Promise<{ ok: boolean; candidatos?: CandidatoAssuntoBi[]; error?: string }> {
	try {
		await requireDev();
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	if (!numProcesso.trim()) return { ok: false, error: 'Informe o número do processo.' };

	try {
		const encontrados = await buscarAssuntosPorProcessoNoBi(numProcesso);
		const candidatos = encontrados.map((e) => ({
			assunto: e.assunto,
			idSugerido: mapearAssuntoBiParaIdOodc(e.assunto),
			dataEmissao: e.dataEmissao,
		}));
		return { ok: true, candidatos };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}
