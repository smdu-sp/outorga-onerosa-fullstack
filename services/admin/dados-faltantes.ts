'use server';

import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import {
	aplicarCategoriaUsoSugerida,
	backfillProcessosDoBiGeosampa,
	compararSeiComBiPorProtocoloAd,
	listarProcessosSeiComProtocoloAd,
	listarProcessosSemCategoriaUso,
	pesquisarCategoriaUsoNasApis,
	type ProcessoDadoFaltante,
	type ProcessoSeiComProtocoloAd,
	type ResultadoBackfillBiGeosampa,
	type ResultadoComparacaoSeiBi,
	type ResultadoPesquisaApi,
} from '@/lib/server/admin-dados-faltantes';

async function requireAdminDados() {
	const session = await requireAuth();
	const ok =
		session.usuario.dev ||
		(await usuarioPermitido(session.usuario.sub, 'processos_ver_todos'));
	if (!ok) throw new Error('Sem permissão para esta operação.');
	return session;
}

export async function listarDadosFaltantes(
	campo: 'categoria_uso' = 'categoria_uso',
): Promise<{ ok: boolean; data: ProcessoDadoFaltante[] | null; error: string | null }> {
	try {
		await requireAdminDados();
		if (campo !== 'categoria_uso') {
			return { ok: false, data: null, error: 'Campo não suportado.' };
		}
		const data = await listarProcessosSemCategoriaUso();
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao listar',
		};
	}
}

export async function listarSeiComProtocoloAd(): Promise<{
	ok: boolean;
	data: ProcessoSeiComProtocoloAd[] | null;
	error: string | null;
}> {
	try {
		await requireAdminDados();
		const data = await listarProcessosSeiComProtocoloAd();
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao listar SEI',
		};
	}
}

export async function pesquisarFiltradosNasApis(
	processoIds: string[],
): Promise<{ ok: boolean; data: ResultadoPesquisaApi[] | null; error: string | null }> {
	try {
		await requireAdminDados();
		if (!processoIds.length) {
			return { ok: false, data: null, error: 'Nenhum processo selecionado.' };
		}
		const data = await pesquisarCategoriaUsoNasApis(processoIds);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro na pesquisa',
		};
	}
}

export async function compararSeiVsBi(
	processoIds: string[],
): Promise<{ ok: boolean; data: ResultadoComparacaoSeiBi[] | null; error: string | null }> {
	try {
		await requireAdminDados();
		if (!processoIds.length) {
			return { ok: false, data: null, error: 'Nenhum processo selecionado.' };
		}
		const data = await compararSeiComBiPorProtocoloAd(processoIds);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro na comparação',
		};
	}
}

export async function aplicarCategoriasEncontradas(
	itens: { processoId: string; tipologia: 'R' | 'nR' | 'R/nR' }[],
): Promise<{ ok: boolean; aplicados: number; ignorados: number; error: string | null }> {
	try {
		await requireAdminDados();
		const { aplicados, ignorados } = await aplicarCategoriaUsoSugerida(itens);
		return { ok: true, aplicados, ignorados, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			aplicados: 0,
			ignorados: 0,
			error: error instanceof Error ? error.message : 'Erro ao aplicar',
		};
	}
}

export async function backfillBiGeosampa(
	processoIds: string[],
): Promise<{
	ok: boolean;
	data: ResultadoBackfillBiGeosampa[] | null;
	error: string | null;
}> {
	try {
		await requireAdminDados();
		if (!processoIds.length) {
			return { ok: false, data: null, error: 'Nenhum processo selecionado.' };
		}
		const data = await backfillProcessosDoBiGeosampa(processoIds);
		return { ok: true, data, error: null };
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro no backfill',
		};
	}
}
