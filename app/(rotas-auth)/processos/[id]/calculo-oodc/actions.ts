'use server';

import { requireDev } from '@/lib/auth/session';
import type { EnderecoValorUnitario, EntradaCalculoOodc, ResultadoCalculoOodc, ValorUnitarioEncontrado } from '@/lib/oodc/tipos';
import { buscarValorReferencia } from '@/lib/server/oodc-valor-referencia';
import { salvarMemorialCalculo, type FlagsMemorialCalculo } from '@/lib/server/oodc-memorial';

function ehRedirect(error: unknown): error is Error {
	return error instanceof Error && error.message.includes('NEXT_REDIRECT');
}

/** Busca o V (R$/m²) vigente para até 10 endereços — usado para completar/atualizar
 * endereços além do #1 (que já vem automático no rascunho). */
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

/** Salva uma nova versão do memorial de cálculo para o processo. */
export async function salvarMemorialCalculoAction(
	processoId: string,
	entrada: EntradaCalculoOodc,
	resultado: ResultadoCalculoOodc,
	flags: FlagsMemorialCalculo,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	let session;
	try {
		session = await requireDev();
	} catch (error) {
		if (ehRedirect(error)) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

	try {
		const memorial = await salvarMemorialCalculo(processoId, entrada, resultado, flags, session.usuario.sub);
		return { ok: true, id: memorial.id };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}
