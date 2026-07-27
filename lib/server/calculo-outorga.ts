import { prisma } from '@/lib/prisma';
import { RE_PROCESSO } from '@/lib/server/geosampa';
import type { IGeoSampaResult } from '@/types/geosampa';

export class CalculoOutorgaError extends Error {}

/**
 * Placeholder para a futura API de cálculo da outorga onerosa — ainda não existe/
 * não foi integrada (o Técnico hoje só tem GeoSampa e BI, que viraram exclusivos
 * do Admin no momento de inserir o processo). Retorna o mesmo formato de
 * IGeoSampaResult para reaproveitar a persistência já existente em
 * `salvarDadosGeoSampaNoProcesso`/`aplicarPayloadGeoSampaNaFicha`.
 *
 * Troque o corpo desta função pela chamada HTTP real assim que o endpoint da API
 * de cálculo estiver disponível — a assinatura e o formato de retorno já são o
 * que o restante do fluxo do Técnico espera.
 */
export async function consultarCalculoOutorga(numProcesso: string): Promise<IGeoSampaResult> {
	const identificador = numProcesso.trim();
	if (!RE_PROCESSO.test(identificador)) {
		throw new CalculoOutorgaError('Número inválido. Formato esperado: 0000.0000/0000000-0.');
	}

	const existente = await prisma.processo.findUnique({ where: { num_processo: identificador } });
	if (existente) {
		throw new CalculoOutorgaError('Processo já cadastrado.');
	}

	console.warn(
		`[calculo-outorga] STUB — API de cálculo real ainda não integrada (processo ${identificador}).`,
	);

	// Sem integração real ainda: devolve só o número do processo. Os demais campos
	// ficam ausentes de propósito (a UI mostra "—") em vez de inventar valores.
	return { num_processo: identificador };
}
