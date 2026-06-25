'use server';

import { auth } from '@/lib/auth/auth';
import { consultarGeoSampa, GeoSampaConsultaError } from '@/lib/server/geosampa';
import type { GeoSampaLogEntry, IEnquadramentoResult, IGeoSampaResult } from '@/types/geosampa';

export type { IEnquadramentoResult, IGeoSampaResult };

export async function consultarEnquadramento(
	modo: 'SQL' | 'PROCESSO',
	identificador: string,
): Promise<{
	ok: boolean;
	data?: IGeoSampaResult;
	error?: string;
	modoSalvamento?: 'SQL' | 'PROCESSO';
	identificadorSalvamento?: string;
	logs?: GeoSampaLogEntry[];
}> {
	const session = await auth();
	if (!session) return { ok: false, error: 'Sessão expirada. Faça login novamente.' };

	const entries: GeoSampaLogEntry[] = [];
	const log = (level: GeoSampaLogEntry['level'], msg: string) =>
		entries.push({ ts: Date.now(), level, msg });

	try {
		const resultado =
			modo === 'SQL'
				? await consultarGeoSampa(identificador.trim(), undefined, log)
				: await consultarGeoSampa(undefined, identificador.trim(), log);
		return {
			ok: true,
			data: resultado.data,
			modoSalvamento: resultado.modoSalvamento,
			identificadorSalvamento: resultado.identificadorSalvamento,
			logs: entries,
		};
	} catch (error) {
		if (error instanceof GeoSampaConsultaError) {
			return { ok: false, error: error.message, logs: entries };
		}
		return {
			ok: false,
			error: 'Não foi possível consultar o GeoSampa. Verifique a conexão e tente novamente.',
			logs: entries,
		};
	}
}
