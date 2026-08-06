/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import {
	buscarEstatisticasLicenciamento,
	buscarProcessoLicenciamentoPorId,
	buscarProcessosLicenciamento,
} from '@/lib/server/licenciamento';
import { CoordenadoriaAnalise, StatusCicloLicenciamento } from '@prisma/client';

export async function buscarDashboardLicenciamento(coordenadoria?: string) {
	try {
		await requireAuth();
		const coord =
			coordenadoria && coordenadoria !== 'TODAS'
				? (coordenadoria as CoordenadoriaAnalise)
				: undefined;
		const data = await buscarEstatisticasLicenciamento(coord);
		return { ok: true as const, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false as const,
			error: error instanceof Error ? error.message : 'Erro ao buscar dashboard',
			data: null,
			status: 500,
		};
	}
}

export async function buscarTudoLicenciamento(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	coordenadoria: string = 'TODAS',
	statusCiclo: string = 'ATIVO',
) {
	try {
		await requireAuth();
		const data = await buscarProcessosLicenciamento({
			pagina,
			limite,
			busca,
			coordenadoria: coordenadoria as CoordenadoriaAnalise | 'TODAS',
			statusCiclo: statusCiclo as StatusCicloLicenciamento | 'TODOS',
		});
		return { ok: true as const, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false as const,
			error: error instanceof Error ? error.message : 'Erro ao buscar processos',
			data: null,
			status: 500,
		};
	}
}

export async function buscarDetalheLicenciamento(id: string) {
	try {
		await requireAuth();
		const data = await buscarProcessoLicenciamentoPorId(id);
		if (!data) {
			return { ok: false as const, error: 'Processo não encontrado', data: null, status: 404 };
		}
		return { ok: true as const, error: null, data, status: 200 };
	} catch (error) {
		return {
			ok: false as const,
			error: error instanceof Error ? error.message : 'Erro ao buscar processo',
			data: null,
			status: 500,
		};
	}
}
