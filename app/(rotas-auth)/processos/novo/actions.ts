'use server';

import { requirePermissao } from '@/lib/auth/session';
import { consultarGeoSampa, GeoSampaConsultaError } from '@/lib/server/geosampa';
import type { GeoSampaLogEntry, IGeoSampaResult } from '@/types/geosampa';

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
	try {
		await requirePermissao('processos_criar_geosampa');
	} catch (error) {
		if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
		return { ok: false, error: 'Sem permissão para esta operação.' };
	}

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
