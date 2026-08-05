import { normalizarSql, parseSqlParaLocalizacao } from '@/lib/geosampa-sql.util';
import { parseNumeroBr } from '@/lib/parse-numero-br';
import { prisma } from '@/lib/prisma';
import { RE_PROCESSO } from '@/lib/server/geosampa';
import type { IGeoSampaResult } from '@/types/geosampa';

export class CalculoOutorgaError extends Error {}

const CALCULO_OUTORGA_BASE_URL = (process.env.CALCULO_OUTORGA_API_URL || 'http://10.75.35.64').replace(
	/\/$/,
	'',
);

type ProcurarProcessoResponse = {
	processo: {
		processoSei: string;
		dataAutuacao?: string;
		protocolo?: string;
		dataProtocolo?: string;
		sqlIncra?: string;
		codlog?: string;
	};
	outorga?: {
		parametrosDeCalculo?: {
			valorM2?: number;
			fatorPlanejamento?: number;
			fatorSocial?: number;
		};
	};
};

type CalcularOutorgaResponse = {
	outorga: {
		parametrosDeCalculo?: {
			valorM2?: number;
			fatorPlanejamento?: number;
			fatorSocial?: number;
			areaComputavel?: number;
			areaTerreno?: number;
		} | null;
		// API real devolve número puro (ex.: 7969683), não a string "R$ 0,00" da
		// especificação original — parseNumeroBr trata os dois formatos.
		valorOutorga: number | string;
	};
};

async function chamarApiCalculoOutorga<T>(path: string, init?: RequestInit): Promise<T> {
	let resposta: Response;
	try {
		resposta = await fetch(`${CALCULO_OUTORGA_BASE_URL}${path}`, {
			...init,
			headers: { Accept: 'application/json', ...init?.headers },
			signal: AbortSignal.timeout(15_000),
		});
	} catch {
		throw new CalculoOutorgaError('Não foi possível conectar à API de cálculo da outorga.');
	}

	if (!resposta.ok) {
		if (resposta.status === 404) {
			throw new CalculoOutorgaError('Processo não encontrado na API de cálculo da outorga.');
		}
		throw new CalculoOutorgaError(`API de cálculo da outorga retornou erro (HTTP ${resposta.status}).`);
	}

	try {
		return (await resposta.json()) as T;
	} catch {
		throw new CalculoOutorgaError('Resposta inválida da API de cálculo da outorga.');
	}
}

async function procurarProcessoNaApi(processoSei: string): Promise<ProcurarProcessoResponse> {
	const corpo = await chamarApiCalculoOutorga<ProcurarProcessoResponse>(
		`/api/antares/procurarProcesso?processo_sei=${encodeURIComponent(processoSei)}`,
	);
	if (!corpo?.processo?.processoSei) {
		throw new CalculoOutorgaError('Resposta da API de cálculo da outorga veio sem dados do processo.');
	}
	return corpo;
}

async function calcularOutorgaNaApi(
	processoSei: string,
	areaComputavel: number,
	areaTerreno: number,
): Promise<CalcularOutorgaResponse> {
	const corpo = await chamarApiCalculoOutorga<CalcularOutorgaResponse>('/api/antares/calcularOutorga', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ processoSei, areaComputavel, areaTerreno }),
	});
	if (corpo?.outorga?.valorOutorga == null) {
		throw new CalculoOutorgaError('Resposta da API de cálculo da outorga veio sem o valor calculado.');
	}
	return corpo;
}

function mapCalculoParaGeoSampaResult(
	dadosProcesso: ProcurarProcessoResponse,
	dadosCalculo: CalcularOutorgaResponse,
	areaComputavel: number,
	areaTerreno: number,
): IGeoSampaResult {
	const { processo } = dadosProcesso;
	// A API às vezes devolve parametrosDeCalculo vazio em calcularOutorga — cai para
	// os parâmetros já trazidos por procurarProcesso (mesma localização).
	const params = dadosCalculo.outorga.parametrosDeCalculo ?? dadosProcesso.outorga?.parametrosDeCalculo;
	const sqlBruto = processo.sqlIncra?.trim() || undefined;
	const sqlFormatado = sqlBruto ? normalizarSql(sqlBruto) : null;
	const localizacaoDoSql = sqlFormatado
		? parseSqlParaLocalizacao(sqlFormatado)
		: sqlBruto
			? parseSqlParaLocalizacao(sqlBruto)
			: null;

	return {
		num_processo: processo.processoSei,
		data_autuacao: processo.dataAutuacao,
		sql_incra: sqlBruto,
		sql_formatado: sqlFormatado ?? undefined,
		localizacao_lote:
			localizacaoDoSql || processo.codlog
				? { ...localizacaoDoSql, codigo_logradouro: processo.codlog }
				: undefined,
		calculo_outorga: {
			valor_m2_quadro14: params?.valorM2,
			fp_uso_r: params?.fatorPlanejamento,
			fs_uso_r: params?.fatorSocial,
			// Área computável/terreno são as informadas pelo usuário — mais confiável
			// do que confiar no eco da API, que nem sempre as devolve.
			area_terreno: areaTerreno,
			area_computavel_total: areaComputavel,
			contrapartida_total: parseNumeroBr(dadosCalculo.outorga.valorOutorga),
		},
	};
}

/**
 * Consulta a API de cálculo da outorga onerosa pelo número do processo SEI e
 * pelas áreas informadas no momento da criação do processo. Encadeia
 * `procurarProcesso` (identificação + parâmetros base) e `calcularOutorga` (valor
 * calculado a partir da área computável/terreno informadas). Devolve o mesmo
 * formato de IGeoSampaResult para reaproveitar a persistência já existente em
 * `salvarDadosGeoSampaNoProcesso`/`aplicarPayloadGeoSampaNaFicha`, que grava o
 * cálculo no banco quando o processo é confirmado.
 */
export async function consultarCalculoOutorga(
	numProcesso: string,
	areaComputavel: number,
	areaTerreno: number,
): Promise<IGeoSampaResult> {
	const identificador = numProcesso.trim();
	if (!RE_PROCESSO.test(identificador)) {
		throw new CalculoOutorgaError('Número inválido. Formato esperado: 0000.0000/0000000-0.');
	}
	if (!(areaComputavel > 0)) {
		throw new CalculoOutorgaError('Informe a área computável (m²).');
	}
	if (!(areaTerreno > 0)) {
		throw new CalculoOutorgaError('Informe a área do terreno (m²).');
	}

	const existente = await prisma.processo.findUnique({ where: { num_processo: identificador } });
	if (existente) {
		throw new CalculoOutorgaError('Processo já cadastrado.');
	}

	const dadosProcesso = await procurarProcessoNaApi(identificador);
	const dadosCalculo = await calcularOutorgaNaApi(identificador, areaComputavel, areaTerreno);

	return mapCalculoParaGeoSampaResult(dadosProcesso, dadosCalculo, areaComputavel, areaTerreno);
}
