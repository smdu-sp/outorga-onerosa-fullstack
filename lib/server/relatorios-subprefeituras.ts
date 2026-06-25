import { prisma } from '@/lib/prisma';
import { normalizarSubprefeitura, tituloSubprefeitura } from '@/lib/geo/normalizar-subprefeitura';
import {
	anoArrecadacaoParcela,
	parcelaArrecadadaNoPeriodo,
	type FiltroArrecadacao,
	type ParcelaArrecadacao,
} from '@/lib/parcelas-utils';
import type {
	IRelatorioSubprefeituraDetalhe,
	IRelatorioSubprefeituraProcesso,
} from '@/types/relatorio';

const BRL_TO_M = 1_000_000;

export type FiltroPeriodoSubprefeitura = FiltroArrecadacao;

type ProcessoSubprefeitura = {
	id: string;
	num_processo: string;
	interessado: string;
	pago: number;
	subprefeituraChave: string;
	subprefeituraNome: string;
};

type ParcelaSubprefeitura = ParcelaArrecadacao & { valor: number };

type ProcessoComSubprefeitura = {
	id: string;
	num_processo: string;
	parcelas: ParcelaSubprefeitura[];
	monitoramento: {
		proprietario_interessado: string | null;
		enquadramento_urbanistico: { subprefeitura: string | null } | null;
	} | null;
	monitoramento_cota: { proprietario_interessado: string | null } | null;
};

function somarParcelasPagas(
	parcelas: ParcelaSubprefeitura[],
	filtro: FiltroPeriodoSubprefeitura = {},
): number {
	return parcelas
		.filter((p) => parcelaArrecadadaNoPeriodo(p, filtro))
		.reduce((s, p) => s + p.valor, 0);
}

function mapearProcessosPorSubprefeitura(
	processos: ProcessoComSubprefeitura[],
	filtro: FiltroPeriodoSubprefeitura = {},
): ProcessoSubprefeitura[] {
	return processos
		.map((p) => {
			const subRaw = p.monitoramento?.enquadramento_urbanistico?.subprefeitura;
			if (!subRaw) return null;

			const pago = somarParcelasPagas(p.parcelas, filtro);
			if (pago <= 0) return null;

			const interessado =
				p.monitoramento?.proprietario_interessado ??
				p.monitoramento_cota?.proprietario_interessado ??
				p.num_processo;

			return {
				id: p.id,
				num_processo: p.num_processo,
				interessado,
				pago,
				subprefeituraChave: normalizarSubprefeitura(subRaw),
				subprefeituraNome: tituloSubprefeitura(subRaw),
			};
		})
		.filter((p): p is ProcessoSubprefeitura => p != null);
}

const processoSelect = {
	id: true,
	num_processo: true,
	parcelas: {
		select: {
			valor: true,
			status_quitacao: true,
			vencimento: true,
			data_quitacao: true,
			ano_pagamento: true,
			antecipada: true,
		},
	},
	monitoramento: {
		select: {
			proprietario_interessado: true,
			enquadramento_urbanistico: { select: { subprefeitura: true } },
		},
	},
	monitoramento_cota: { select: { proprietario_interessado: true } },
} as const;

async function carregarProcessosPorSubprefeitura(
	filtro: FiltroPeriodoSubprefeitura = {},
): Promise<ProcessoSubprefeitura[]> {
	const processos = await prisma.processo.findMany({ select: processoSelect });
	return mapearProcessosPorSubprefeitura(processos, filtro);
}

function montarSubprefeituras(
	processos: ProcessoSubprefeitura[],
): IRelatorioSubprefeituraDetalhe[] {
	const mapa = new Map<
		string,
		{ nome: string; valBrl: number; processos: IRelatorioSubprefeituraProcesso[] }
	>();

	for (const p of processos) {
		if (!mapa.has(p.subprefeituraChave)) {
			mapa.set(p.subprefeituraChave, { nome: p.subprefeituraNome, valBrl: 0, processos: [] });
		}
		const entry = mapa.get(p.subprefeituraChave)!;
		entry.valBrl += p.pago;
		entry.processos.push({
			id: p.id,
			num: p.num_processo,
			interessado: p.interessado,
			val: +(p.pago / BRL_TO_M).toFixed(2),
			valBrl: p.pago,
		});
	}

	return Array.from(mapa.entries())
		.map(([chave, { nome, valBrl, processos: procs }]) => ({
			chave,
			nome,
			valBrl,
			val: +(valBrl / BRL_TO_M).toFixed(2),
			proc: procs.length,
			processos: procs.sort((a, b) => b.valBrl - a.valBrl),
		}))
		.sort((a, b) => b.valBrl - a.valBrl);
}

export async function buscarArrecadacaoPorSubprefeitura(
	filtro: FiltroPeriodoSubprefeitura = {},
): Promise<IRelatorioSubprefeituraDetalhe[]> {
	const processos = await carregarProcessosPorSubprefeitura(filtro);
	return montarSubprefeituras(processos);
}

export async function buscarAnosComArrecadacaoSubprefeitura(): Promise<number[]> {
	const processos = await prisma.processo.findMany({
		select: {
			parcelas: {
				select: {
					status_quitacao: true,
					data_quitacao: true,
					ano_pagamento: true,
				},
			},
			monitoramento: {
				select: { enquadramento_urbanistico: { select: { subprefeitura: true } } },
			},
		},
	});
	const anos = new Set<number>();
	for (const p of processos) {
		if (!p.monitoramento?.enquadramento_urbanistico?.subprefeitura) continue;
		for (const parc of p.parcelas) {
			const ano = anoArrecadacaoParcela(parc);
			if (parc.status_quitacao && ano != null) anos.add(ano);
		}
	}
	return [...anos].sort((a, b) => b - a);
}

export function descreverPeriodoSubprefeitura(filtro: FiltroPeriodoSubprefeitura): string {
	const MESES = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
	];
	if (filtro.ano == null && filtro.mes == null) return 'Todo o período';
	if (filtro.ano != null && filtro.mes != null) return `${MESES[filtro.mes]} de ${filtro.ano}`;
	if (filtro.ano != null) return `Ano ${filtro.ano}`;
	if (filtro.mes != null) return `${MESES[filtro.mes]} (todos os anos)`;
	return 'Todo o período';
}
