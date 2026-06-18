'use server';

import { auth } from '@/lib/auth/auth';
import { consultarGeoSampa, GeoSampaConsultaError } from '@/lib/server/geosampa';
import type { IEnquadramentoResult, IGeoSampaResult } from '@/types/geosampa';

export type { IEnquadramentoResult, IGeoSampaResult };

export async function consultarEnquadramento(
	modo: 'SQL' | 'PROCESSO',
	identificador: string,
): Promise<{ ok: boolean; data?: IGeoSampaResult; error?: string }> {
	const session = await auth();
	if (!session) return { ok: false, error: 'Sessão expirada. Faça login novamente.' };

	try {
		const data =
			modo === 'SQL'
				? await consultarGeoSampa(identificador.trim())
				: await consultarGeoSampa(undefined, identificador.trim());
		return { ok: true, data };
	} catch (error) {
		if (error instanceof GeoSampaConsultaError) {
			return { ok: false, error: error.message };
		}
		return {
			ok: false,
			error: 'Não foi possível consultar o GeoSampa. Verifique a conexão e tente novamente.',
		};
	}
}
