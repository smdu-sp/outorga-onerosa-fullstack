/**
 * Relatório por tipologia de uso OODC (R / nR / R/nR).
 *
 * O período (`ano`/`mês`/`de`–`até`) segue a mesma semântica dos demais
 * relatórios financeiros: parcela quitada entra pela data de pagamento;
 * em aberto e quebra, pelo vencimento. Processo sem `data_entrada` não é
 * excluído — basta ter parcela no período (parcelamentos de anos anteriores
 * que pagam no ano filtrado entram). `data_entrada` no período ainda inclui
 * processos novos sem movimento financeiro.
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import {
	dataNoPeriodoFiltro,
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
		let arrecadado = 0;
		let emAberto = 0;
		let quebra = 0;
		let total = 0;
		let temParcelaNoPeriodo = false;

		for (const parc of p.parcelas) {
			if (parc.quebra) {
				if (!dataNoPeriodoFiltro(parc.vencimento, filtro)) continue;
				quebra += parc.valor;
				total += parc.valor;
				temParcelaNoPeriodo = true;
			} else if (parc.status_quitacao) {
				if (!parcelaArrecadadaNoPeriodo(parc, filtro)) continue;
				arrecadado += parc.valor;
				total += parc.valor;
				temParcelaNoPeriodo = true;
			} else {
				if (!dataNoPeriodoFiltro(parc.vencimento, filtro)) continue;
				emAberto += parc.valor;
				total += parc.valor;
				temParcelaNoPeriodo = true;
			}
		}

		if (!temParcelaNoPeriodo && !processoEntradaNoPeriodo(p.data_entrada, filtro)) continue;

		const tip = normalizarTipologiaUso(
			p.monitoramento?.enquadramento_urbanistico?.tipologia_uso_oodc,
		);
		const entry = mapa.get(tip)!;
		entry.qtd += 1;
		entry.total += total;
		entry.arrecadado += arrecadado;
		entry.emAberto += emAberto;
		entry.quebra += quebra;
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
