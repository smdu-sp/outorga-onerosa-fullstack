'use server';

import { auth } from '@/lib/auth/auth';

export interface IEnquadramentoResult {
	enquadramento: {
		distrito: string;
		subprefeitura: string;
		macrozona: string;
		macroarea: string;
		subsetor: string;
		zonas: string[];
		tipologia_uso_oodc: string;
	};
	parametros: {
		coeficiente_basico: number;
		coeficiente_maximo: number;
		area_terreno: number;
		valor_m2_quadro14: number;
		fator_planejamento: number;
		fator_social: number;
	};
}

export async function consultarEnquadramento(
	modo: 'SQL' | 'PROCESSO',
	identificador: string,
): Promise<{ ok: boolean; data?: IEnquadramentoResult; error?: string }> {
	const session = await auth();
	if (!session) return { ok: false, error: 'Sessão expirada. Faça login novamente.' };

	const baseURL = process.env.NEXT_PUBLIC_API_URL;
	const param   = modo === 'SQL' ? 'sql' : 'processo';

	try {
		const resp = await fetch(
			`${baseURL}processos/enquadramento?${param}=${encodeURIComponent(identificador)}`,
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session?.access_token}`,
				},
				cache: 'no-store',
			},
		);

		if (!resp.ok) {
			const err = await resp.json().catch(() => ({})) as { message?: string };
			return {
				ok: false,
				error: err.message || `Erro ${resp.status}: não foi possível localizar o identificador.`,
			};
		}

		const data = (await resp.json()) as IEnquadramentoResult;
		return { ok: true, data };
	} catch {
		return { ok: false, error: 'Não foi possível conectar à API. Verifique a conexão e tente novamente.' };
	}
}
