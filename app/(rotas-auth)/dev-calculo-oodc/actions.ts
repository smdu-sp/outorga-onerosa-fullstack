'use server';

import { requireDev } from '@/lib/auth/session';
import type { EnderecoValorUnitario, ValorUnitarioEncontrado } from '@/lib/oodc/tipos';
import {
	montarRascunhoPorNumeroProcesso,
	OodcMemorialError,
	type RascunhoCalculoOodc,
} from '@/lib/server/oodc-memorial';
import { buscarValorReferencia } from '@/lib/server/oodc-valor-referencia';

function ehRedirect(error: unknown): error is Error {
	return error instanceof Error && error.message.includes('NEXT_REDIRECT');
}

/** Busca o V (R$/m²) vigente para até 10 endereços — só acessível para usuários DEV. */
export async function buscarValorReferenciaAction(
	enderecos: EnderecoValorUnitario[],
): Promise<{ ok: boolean; valores?: ValorUnitarioEncontrado[]; vMax?: number | null; error?: string }> {
	try {
		await requireDev();
	} catch (error) {
		if (ehRedirect(error)) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	try {
		const { valores, vMax } = await buscarValorReferencia(enderecos);
		return { ok: true, valores, vMax };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}

/** Consulta BI + GeoSampa e devolve o rascunho do memorial (macrozona, SQL, tipologias…). */
export async function buscarDadosProcessoOodcAction(
	numProcesso: string,
): Promise<{ ok: boolean; rascunho?: RascunhoCalculoOodc; error?: string }> {
	try {
		await requireDev();
	} catch (error) {
		if (ehRedirect(error)) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	if (!numProcesso.trim()) return { ok: false, error: 'Informe o número do processo.' };

	try {
		const rascunho = await montarRascunhoPorNumeroProcesso(numProcesso);
		return { ok: true, rascunho };
	} catch (error) {
		if (error instanceof OodcMemorialError) return { ok: false, error: error.message };
		return { ok: false, error: (error as Error).message };
	}
}
