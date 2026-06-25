import {
	mapGeoSampaParaMonitoramento,
	type GeoSampaMonitoramentoPayload,
} from '@/lib/enquadramento-persistencia';
import { parseDataCivil } from '@/lib/datas';
import { prisma } from '@/lib/prisma';
import { GeosampaWfsClient } from '@/lib/server/geosampa-wfs.client';
import { mapOutorgaWfsParaGeoSampa } from '@/lib/server/geosampa-wfs.mapper';
import type { IGeoSampaResult } from '@/types/geosampa';
import {
	IncidenciaCotaSolidariedade,
	OrigemMonitoramento,
	Prisma,
	SituacaoMonitoramento,
	StatusPagamento,
	TipoLicencaMonitoramento,
} from '@prisma/client';

export type SyncGeoSampaOutorgaStats = {
	processosCriados: number;
	ignoradosJaExistem: number;
	ignoradosSemProcesso: number;
	erros: number;
	totalWfs: number;
};

export type SyncGeoSampaOutorgaOptions = {
	dryRun?: boolean;
	limit?: number;
	pageSize?: number;
	onProgress?: (msg: string) => void;
};

function mapStatusPagamento(situacao?: string): StatusPagamento {
	const text = situacao?.trim().toUpperCase() ?? '';
	if (text.includes('QUITADO')) return 'QUITADO';
	return 'EM_PAGAMENTO';
}

async function aplicarPayloadInicial(
	tx: Prisma.TransactionClient,
	fichaId: string,
	payload: GeoSampaMonitoramentoPayload,
) {
	const {
		coordenada,
		localizacao_lote,
		enderecos,
		enquadramento_urbanistico,
		subcategorias_uso,
		calculo_outorga,
		situacao,
		licencas,
		anotacoes_deuso,
		...dadosFicha
	} = payload;

	if (Object.keys(dadosFicha).length > 0) {
		await tx.monitoramentoFicha.update({
			where: { id: fichaId },
			data: dadosFicha,
		});
	}

	if (coordenada) {
		await tx.monitoramentoCoordenada.create({
			data: { monitoramento_ficha_id: fichaId, ...coordenada },
		});
	}

	if (localizacao_lote) {
		await tx.monitoramentoLocalizacaoLote.create({
			data: { monitoramento_ficha_id: fichaId, ...localizacao_lote },
		});
	}

	if (enquadramento_urbanistico) {
		await tx.monitoramentoEnquadramentoUrbanistico.create({
			data: { monitoramento_ficha_id: fichaId, ...enquadramento_urbanistico },
		});
	}

	if (subcategorias_uso) {
		await tx.monitoramentoSubcategoriaUso.create({
			data: { monitoramento_ficha_id: fichaId, ...subcategorias_uso },
		});
	}

	if (calculo_outorga) {
		await tx.monitoramentoCalculoOutorga.create({
			data: { monitoramento_ficha_id: fichaId, ...calculo_outorga },
		});
	}

	if (situacao) {
		await tx.monitoramentoSituacao.create({
			data: {
				monitoramento_ficha_id: fichaId,
				incidencia_cota_solidariedade: situacao.incidencia_cota_solidariedade as
					| IncidenciaCotaSolidariedade
					| undefined,
				situacao: situacao.situacao as SituacaoMonitoramento | undefined,
				origem: situacao.origem as OrigemMonitoramento | undefined,
			},
		});
	}

	if (anotacoes_deuso) {
		await tx.monitoramentoAnotacaoDeuso.create({
			data: {
				monitoramento_ficha_id: fichaId,
				...anotacoes_deuso,
				data_informacao_dmus: anotacoes_deuso.data_informacao_dmus
					? parseDataCivil(anotacoes_deuso.data_informacao_dmus)
					: undefined,
			},
		});
	}

	if (enderecos?.length) {
		await tx.monitoramentoEndereco.createMany({
			data: enderecos.map((endereco, index) => ({
				...endereco,
				ordem: endereco.ordem || index + 1,
				monitoramento_ficha_id: fichaId,
			})),
		});
	}

	if (licencas?.length) {
		const lista = licencas
			.filter((l) => l.tipo)
			.map((licenca) => ({
				monitoramento_ficha_id: fichaId,
				tipo: licenca.tipo as TipoLicencaMonitoramento,
				numero: licenca.numero,
				tipo_documento: licenca.tipo_documento,
				data_expedicao: licenca.data_expedicao
					? parseDataCivil(licenca.data_expedicao)
					: undefined,
			}));
		if (lista.length > 0) {
			await tx.monitoramentoLicenca.createMany({ data: lista });
		}
	}
}

async function sincronizarRegistroOutorga(
	feature: Awaited<ReturnType<GeosampaWfsClient['listarOutorgaPaginado']>>['features'][0],
	stats: SyncGeoSampaOutorgaStats,
	dryRun: boolean,
) {
	const numProcesso = feature.properties.cd_processo?.trim();
	if (!numProcesso) {
		stats.ignoradosSemProcesso += 1;
		return;
	}

	const processoExistente = await prisma.processo.findUnique({
		where: { num_processo: numProcesso },
		select: { id: true },
	});

	if (processoExistente) {
		stats.ignoradosJaExistem += 1;
		return;
	}

	if (dryRun) {
		stats.processosCriados += 1;
		return;
	}

	const geoSampa: IGeoSampaResult = mapOutorgaWfsParaGeoSampa(feature, undefined, numProcesso);
	const payload = mapGeoSampaParaMonitoramento(geoSampa, {
		modo: 'PROCESSO',
		identificador: numProcesso,
	});

	await prisma.$transaction(async (tx) => {
		const processo = await tx.processo.create({
			data: {
				num_processo: numProcesso,
				status_pagamento: mapStatusPagamento(feature.properties.tx_situacao),
			},
		});
		const ficha = await tx.monitoramentoFicha.create({
			data: { processo_id: processo.id },
		});
		await aplicarPayloadInicial(tx, ficha.id, payload);
	});

	stats.processosCriados += 1;
}

export async function sincronizarOutorgaDoGeoSampa(
	options: SyncGeoSampaOutorgaOptions = {},
): Promise<SyncGeoSampaOutorgaStats> {
	const wfs = new GeosampaWfsClient();
	const pageSize = options.pageSize ?? 500;
	const dryRun = options.dryRun ?? false;
	const log = options.onProgress ?? (() => {});

	const stats: SyncGeoSampaOutorgaStats = {
		processosCriados: 0,
		ignoradosJaExistem: 0,
		ignoradosSemProcesso: 0,
		erros: 0,
		totalWfs: 0,
	};

	let startIndex = 0;
	let processados = 0;

	log(
		`Iniciando sync GeoSampa outorga_onerosa (somente novos${dryRun ? ', dry-run' : ''})...`,
	);

	while (true) {
		if (options.limit != null && processados >= options.limit) break;

		const pagina = await wfs.listarOutorgaPaginado(startIndex, pageSize);
		const total = pagina.totalFeatures ?? pagina.numberMatched ?? pagina.features.length;
		if (stats.totalWfs === 0) stats.totalWfs = total;

		if (!pagina.features.length) break;

		for (const feature of pagina.features) {
			if (options.limit != null && processados >= options.limit) break;

			try {
				await sincronizarRegistroOutorga(feature, stats, dryRun);
			} catch (error) {
				stats.erros += 1;
				const proc = feature.properties.cd_processo ?? '?';
				log(`Erro em ${proc}: ${(error as Error).message}`);
			}

			processados += 1;
			if (processados % 100 === 0) {
				log(`Progresso: ${processados}/${stats.totalWfs}`);
			}
		}

		startIndex += pagina.features.length;
		if (startIndex >= total) break;
	}

	return stats;
}
