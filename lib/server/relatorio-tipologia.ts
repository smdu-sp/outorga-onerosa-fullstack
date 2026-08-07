/**
 * Relatório por tipologia de uso OODC (R / nR / R/nR).
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import {
	parcelaArrecadadaNoPeriodo,
	processoEntradaNoPeriodo,
	type FiltroArrecadacao,
} from '@/lib/parcelas-utils';
import { normalizarTipologiaUsoOodc } from '@/lib/server/bi-categoria';
import type { IRelatorioTipologia, IRelatorioTipologiaLinha } from '@/types/relatorio';

export type TipologiaBucket = 'R' | 'nR' | 'R/nR' | 'SEM';

const LABELS: Record<TipologiaBucket, string> = {
	R: 'Residencial',
	nR: 'Não Residencial',
	'R/nR': 'Uso Misto',
	SEM: 'Sem classificação',
};

const ORDEM: TipologiaBucket[] = ['R', 'nR', 'R/nR', 'SEM'];

export function normalizarTipologiaUso(raw: string | null | undefined): TipologiaBucket {
	return normalizarTipologiaUsoOodc(raw) ?? 'SEM';
}

export async function buscarRelatorioTipologiaUso(
	filtro: FiltroArrecadacao = {},
): Promise<IRelatorioTipologia> {
	const processos = await prisma.processo.findMany({
		select: {
			id: true,
			data_entrada: true,
			parcelas: {
				select: {
					valor: true,
					status_quitacao: true,
					quebra: true,
					vencimento: true,
					data_quitacao: true,
					ano_pagamento: true,
				},
			},
			monitoramento: {
				select: {
					enquadramento_urbanistico: { select: { tipologia_uso_oodc: true } },
				},
			},
		},
	});

	const mapa = new Map<
		TipologiaBucket,
		{ qtd: number; total: number; arrecadado: number; emAberto: number; quebra: number }
	>();
	for (const b of ORDEM) {
		mapa.set(b, { qtd: 0, total: 0, arrecadado: 0, emAberto: 0, quebra: 0 });
	}

	for (const p of processos) {
		if (!processoEntradaNoPeriodo(p.data_entrada, filtro)) continue;

		const tip = normalizarTipologiaUso(
			p.monitoramento?.enquadramento_urbanistico?.tipologia_uso_oodc,
		);
		const entry = mapa.get(tip)!;
		entry.qtd += 1;

		for (const parc of p.parcelas) {
			entry.total += parc.valor;
			if (parc.quebra) {
				entry.quebra += parc.valor;
			} else if (parc.status_quitacao) {
				if (parcelaArrecadadaNoPeriodo(parc, filtro)) entry.arrecadado += parc.valor;
			} else {
				entry.emAberto += parc.valor;
			}
		}
	}

	const linhas: IRelatorioTipologiaLinha[] = ORDEM.map((codigo) => {
		const e = mapa.get(codigo)!;
		return {
			codigo,
			label: LABELS[codigo],
			qtdProcessos: e.qtd,
			valorTotal: e.total,
			valorArrecadado: e.arrecadado,
			valorEmAberto: e.emAberto,
			valorQuebra: e.quebra,
		};
	}).filter((l) => l.qtdProcessos > 0);

	return {
		linhas,
		totais: {
			qtdProcessos: linhas.reduce((s, l) => s + l.qtdProcessos, 0),
			valorTotal: linhas.reduce((s, l) => s + l.valorTotal, 0),
			valorArrecadado: linhas.reduce((s, l) => s + l.valorArrecadado, 0),
			valorEmAberto: linhas.reduce((s, l) => s + l.valorEmAberto, 0),
			valorQuebra: linhas.reduce((s, l) => s + l.valorQuebra, 0),
		},
	};
}
