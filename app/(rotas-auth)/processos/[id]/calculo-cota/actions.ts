'use server';

import { garantirAcessoProcesso, requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import type {
	EnderecoValorUnitarioCota,
	EntradaCalculoCota,
	ResultadoCalculoCota,
	ValorUnitarioEncontradoCota,
} from '@/lib/cota/tipos';
import { buscarValorReferenciaCota } from '@/lib/server/cota-valor-referencia';
import { salvarMemorialCalculoCota } from '@/lib/server/cota-memorial';

function ehRedirect(error: unknown): error is Error {
	return error instanceof Error && error.message.includes('NEXT_REDIRECT');
}

/** Mesmo nível de acesso da tela de detalhe do processo (ver `garantirAcessoProcesso`). */
async function garantirAcesso(processoId: string) {
	const session = await requireAuth();
	const processo = await prisma.processo.findUnique({
		where: { id: processoId },
		select: { criado_por: true, status_pagamento: true },
	});
	if (!processo) throw new Error('Processo não encontrado.');
	await garantirAcessoProcesso(session.usuario.sub, processo);
	return session;
}

/** Busca o Vm² (R$/m²) para até 6 endereços. */
export async function buscarValorReferenciaCotaAction(
	processoId: string,
	enderecos: EnderecoValorUnitarioCota[],
): Promise<{ ok: boolean; valores?: ValorUnitarioEncontradoCota[]; vMax?: number | null; error?: string }> {
	try {
		await garantirAcesso(processoId);
	} catch (error) {
		if (ehRedirect(error)) throw error;
		return { ok: false, error: (error as Error).message || 'Sem permissão para esta operação.' };
	}

	try {
		const { valores, vMax } = await buscarValorReferenciaCota(enderecos);
		return { ok: true, valores, vMax };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}

/** Salva uma nova versão do memorial de cálculo da Cota de Solidariedade para o processo. */
export async function salvarMemorialCalculoCotaAction(
	processoId: string,
	entrada: EntradaCalculoCota,
	resultado: ResultadoCalculoCota,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	let session;
	try {
		session = await garantirAcesso(processoId);
	} catch (error) {
		if (ehRedirect(error)) throw error;
		return { ok: false, error: (error as Error).message || 'Sem permissão para esta operação.' };
	}

	try {
		const memorial = await salvarMemorialCalculoCota(processoId, entrada, resultado, session.usuario.sub);
		return { ok: true, id: memorial.id };
	} catch (error) {
		return { ok: false, error: (error as Error).message };
	}
}
