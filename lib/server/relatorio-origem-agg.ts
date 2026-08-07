/**
 * Agregação de processos por sistema de origem (pizza do dashboard).
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import {
	parcelaArrecadadaNoPeriodo,
	processoEntradaNoPeriodo,
	type FiltroArrecadacao,
} from '@/lib/parcelas-utils';
import {
	normalizarSistemaOrigem,
	selectCotaOrigem,
	selectFichaOrigem,
	type SistemaOrigemBucket,
} from '@/lib/server/relatorio-origem';
import type { IRelatorioOrigemSistema } from '@/types/relatorio';

const ORDEM: SistemaOrigemBucket[] = ['SEI/SISACOE', 'PORTAL', 'APROVA DIGITAL', 'Outros'];

export async function buscarArrecadacaoPorOrigem(
	filtro: FiltroArrecadacao = {},
): Promise<IRelatorioOrigemSistema[]> {
	const processos = await prisma.processo.findMany({
		select: {
			id: true,
			origem: true,
			data_entrada: true,
			parcelas: {
				select: {
					valor: true,
					status_quitacao: true,
					vencimento: true,
					data_quitacao: true,
					ano_pagamento: true,
				},
			},
			monitoramento: { select: selectFichaOrigem },
			monitoramento_cota: { select: selectCotaOrigem },
		},
	});

	const mapa = new Map<SistemaOrigemBucket, { qtdProcessos: number; valorArrecadado: number }>();
	for (const bucket of ORDEM) {
		mapa.set(bucket, { qtdProcessos: 0, valorArrecadado: 0 });
	}

	for (const p of processos) {
		if (!processoEntradaNoPeriodo(p.data_entrada, filtro)) continue;

		const monOrigem =
			p.monitoramento?.situacao?.origem ?? p.monitoramento_cota?.origem ?? null;
		const bucket = normalizarSistemaOrigem(monOrigem, p.origem);
		const entry = mapa.get(bucket)!;
		entry.qtdProcessos += 1;
		entry.valorArrecadado += p.parcelas
			.filter((x) => parcelaArrecadadaNoPeriodo(x, filtro))
			.reduce((s, x) => s + x.valor, 0);
	}

	return ORDEM.map((sistema) => {
		const e = mapa.get(sistema)!;
		return {
			sistema,
			qtdProcessos: e.qtdProcessos,
			valorArrecadado: e.valorArrecadado,
		};
	}).filter((r) => r.qtdProcessos > 0 || r.valorArrecadado > 0);
}
