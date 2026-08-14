/** @format */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { backfillProcessosDoBiGeosampa } from '@/lib/server/admin-dados-faltantes';
import { buscarDetalheProcesso } from '@/lib/server/processos';
import type { ResultadoBackfillBiGeosampa } from '@/lib/server/admin-dados-faltantes';
import type { IProcessoDetalhe, IRespostaProcessoDetalhe } from '@/types/processo-detalhe';

export type RespostaAtualizarBi = IRespostaProcessoDetalhe & {
	resultado?: ResultadoBackfillBiGeosampa | null;
};

/**
 * Atualiza um processo a partir do BI (SQLs, tipologia) e enriquece cada lote no GeoSampa.
 */
export async function atualizarProcessoDoBi(
	processoId: string,
): Promise<RespostaAtualizarBi> {
	try {
		await requireAuth();
		if (!processoId?.trim()) {
			return { ok: false, error: 'Processo inválido.', data: null, status: 400 };
		}

		const [resultado] = await backfillProcessosDoBiGeosampa([processoId]);
		const data = (await buscarDetalheProcesso(processoId)) as unknown as IProcessoDetalhe;

		if (!resultado) {
			return {
				ok: false,
				error: 'Falha ao consultar o BI.',
				data,
				resultado: null,
				status: 400,
			};
		}

		if (resultado.status === 'erro') {
			return {
				ok: false,
				error: resultado.detalhe ?? 'Erro ao atualizar pelo BI.',
				data,
				resultado,
				status: 400,
			};
		}

		if (resultado.status === 'nao_encontrado') {
			return {
				ok: false,
				error: resultado.detalhe ?? 'Nenhum dado encontrado no BI / GeoSampa.',
				data,
				resultado,
				status: 404,
			};
		}

		return {
			ok: true,
			error: null,
			data,
			resultado,
			status: 200,
		};
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Erro ao atualizar pelo BI.',
			data: null,
			resultado: null,
			status: 400,
		};
	}
}
