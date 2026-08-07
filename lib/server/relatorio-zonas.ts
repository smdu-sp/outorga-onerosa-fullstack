/**
 * Relatório de Outorga × Cota por zona de uso.
 * A planilha DEUSO tem 6 campos de zona (um por lei de zoneamento). Um
 * empreendimento pode ter mais de uma zona; zonas repetidas são deduplicadas.
 * Quando há mais de uma zona distinta, o valor do processo é contado em CADA
 * zona — por isso a soma das zonas pode superar a arrecadação real (`totalGeral`).
 * A zona vem da ficha de monitoramento, disponível para Outorga (PDE) e Cota.
 * A AIU fica de fora (não compõe o FUNDURB). Métrica: valor arrecadado.
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import {
	anoArrecadacaoParcela,
	parcelaArrecadadaNoPeriodo,
	type FiltroArrecadacao,
} from '@/lib/parcelas-utils';
import type { IRelatorioZonaLinha, IRelatorioZonas } from '@/types/relatorio';

const SEM_ZONA = 'Não informado';

/** Os 6 campos de zona de uso da planilha DEUSO (um por lei de zoneamento). */
type EnquadramentoZonas = {
	zona_uso_1_18081: string | null;
	zona_uso_2_17975: string | null;
	zona_uso_3_16402: string | null;
	zona_uso_4_16050: string | null;
	zona_uso_5_13885: string | null;
	zona_uso_6_13885: string | null;
} | null;

/** Zonas distintas do empreendimento (deduplicadas, sem vazios). */
function zonasDistintas(enq: EnquadramentoZonas): string[] {
	if (!enq) return [];
	const set = new Set<string>();
	const campos = [
		enq.zona_uso_1_18081,
		enq.zona_uso_2_17975,
		enq.zona_uso_3_16402,
		enq.zona_uso_4_16050,
		enq.zona_uso_5_13885,
		enq.zona_uso_6_13885,
	];
	for (const v of campos) {
		const limpo = v?.trim();
		if (limpo) set.add(limpo);
	}
	return [...set];
}

export async function buscarOutorgaPorZona(
	ano?: number,
	mes?: number,
	intervalo?: Pick<FiltroArrecadacao, 'dataInicio' | 'dataFim'>,
): Promise<IRelatorioZonas> {
	const processos = await prisma.processo.findMany({
		select: {
			tipo: true,
			parcelas: {
				select: {
					valor: true,
					status_quitacao: true,
					vencimento: true,
					data_quitacao: true,
					ano_pagamento: true,
				},
			},
			monitoramento: {
				select: {
					enquadramento_urbanistico: {
						select: {
							zona_uso_1_18081: true,
							zona_uso_2_17975: true,
							zona_uso_3_16402: true,
							zona_uso_4_16050: true,
							zona_uso_5_13885: true,
							zona_uso_6_13885: true,
						},
					},
				},
			},
		},
	});

	// Anos com arrecadação (para o filtro)
	const anosSet = new Set<number>();
	for (const p of processos) {
		for (const parc of p.parcelas) {
			const a = anoArrecadacaoParcela(parc);
			if (parc.status_quitacao && a != null) anosSet.add(a);
		}
	}
	const anos = [...anosSet].sort((a, b) => b - a);

	const filtro: FiltroArrecadacao = {};
	if (intervalo?.dataInicio || intervalo?.dataFim) {
		if (intervalo.dataInicio) filtro.dataInicio = intervalo.dataInicio;
		if (intervalo.dataFim) filtro.dataFim = intervalo.dataFim;
	} else {
		if (ano != null) filtro.ano = ano;
		if (mes != null) filtro.mes = mes;
	}

	const mapa = new Map<
		string,
		{ outorgaValor: number; outorgaProc: number; cotaValor: number; cotaProc: number }
	>();

	// Arrecadação real (cada processo contado uma única vez, sem dupla contagem por zona)
	let totalGeral = 0;

	for (const p of processos) {
		if (p.tipo === 'AIU') continue; // AIU fora do FUNDURB

		const pago = p.parcelas
			.filter((x) => parcelaArrecadadaNoPeriodo(x, filtro))
			.reduce((s, x) => s + x.valor, 0);
		if (pago <= 0) continue;

		totalGeral += pago;

		const distintas = zonasDistintas(p.monitoramento?.enquadramento_urbanistico ?? null);
		const zonas = distintas.length > 0 ? distintas : [SEM_ZONA];

		// Valor contado em cada zona distinta do empreendimento
		for (const zona of zonas) {
			if (!mapa.has(zona)) {
				mapa.set(zona, { outorgaValor: 0, outorgaProc: 0, cotaValor: 0, cotaProc: 0 });
			}
			const e = mapa.get(zona)!;
			if (p.tipo === 'COTA') {
				e.cotaValor += pago;
				e.cotaProc++;
			} else {
				// PDE ou sem tipo → Outorga
				e.outorgaValor += pago;
				e.outorgaProc++;
			}
		}
	}

	const linhas: IRelatorioZonaLinha[] = [...mapa.entries()]
		.map(([zona, e]) => ({
			zona,
			outorgaValor: e.outorgaValor,
			outorgaProc: e.outorgaProc,
			cotaValor: e.cotaValor,
			cotaProc: e.cotaProc,
			totalValor: e.outorgaValor + e.cotaValor,
			totalProc: e.outorgaProc + e.cotaProc,
		}))
		.sort((a, b) => b.totalValor - a.totalValor);

	return { ano: ano ?? null, mes: mes ?? null, anos, linhas, totalGeral };
}
