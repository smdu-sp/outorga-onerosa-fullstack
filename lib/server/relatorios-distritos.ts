import { prisma } from '@/lib/prisma';
import { normalizarDistrito, tituloDistrito } from '@/lib/geo/normalizar-distrito';
import {
	anoArrecadacaoParcela,
	parcelaArrecadadaNoPeriodo,
	type FiltroArrecadacao,
	type ParcelaArrecadacao,
} from '@/lib/parcelas-utils';
import type { IRelatorioDistrito, IRelatorioDistritoProcesso } from '@/types/relatorio';

const BRL_TO_M = 1_000_000;

export type FiltroPeriodoDistrito = FiltroArrecadacao;

type ProcessoDistrito = {
	id: string;
	num_processo: string;
	interessado: string;
	pago: number;
	distritoNorm: string;
	distritoNome: string;
};

type ParcelaDistrito = ParcelaArrecadacao & { valor: number };

type ProcessoComDistrito = {
	id: string;
	num_processo: string;
	parcelas: ParcelaDistrito[];
	monitoramento: {
		proprietario_interessado: string | null;
		enquadramento_urbanistico: { distrito: string | null } | null;
	} | null;
	monitoramento_cota: { proprietario_interessado: string | null } | null;
};

function somarParcelasPagas(parcelas: ParcelaDistrito[], filtro: FiltroPeriodoDistrito = {}): number {
	return parcelas
		.filter((p) => parcelaArrecadadaNoPeriodo(p, filtro))
		.reduce((s, p) => s + p.valor, 0);
}

function mapearProcessosPorDistrito(
	processos: ProcessoComDistrito[],
	filtro: FiltroPeriodoDistrito = {},
): ProcessoDistrito[] {
	return processos
		.map((p) => {
			const distritoRaw = p.monitoramento?.enquadramento_urbanistico?.distrito;
			if (!distritoRaw) return null;

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
				distritoNorm: normalizarDistrito(distritoRaw),
				distritoNome: tituloDistrito(distritoRaw),
			};
		})
		.filter((p): p is ProcessoDistrito => p != null);
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
			enquadramento_urbanistico: { select: { distrito: true } },
		},
	},
	monitoramento_cota: { select: { proprietario_interessado: true } },
} as const;

async function carregarProcessosPorDistrito(filtro: FiltroPeriodoDistrito = {}): Promise<ProcessoDistrito[]> {
	const processos = await prisma.processo.findMany({ select: processoSelect });
	return mapearProcessosPorDistrito(processos, filtro);
}

function montarDistritos(processos: ProcessoDistrito[]): IRelatorioDistrito[] {
	const mapa = new Map<
		string,
		{ nome: string; valBrl: number; processos: IRelatorioDistritoProcesso[] }
	>();

	for (const p of processos) {
		if (!mapa.has(p.distritoNorm)) {
			mapa.set(p.distritoNorm, { nome: p.distritoNome, valBrl: 0, processos: [] });
		}
		const entry = mapa.get(p.distritoNorm)!;
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

export async function buscarArrecadacaoPorDistrito(
	filtro: FiltroPeriodoDistrito = {},
): Promise<IRelatorioDistrito[]> {
	const processos = await carregarProcessosPorDistrito(filtro);
	return montarDistritos(processos);
}

export async function buscarAnosComArrecadacao(): Promise<number[]> {
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
				select: { enquadramento_urbanistico: { select: { distrito: true } } },
			},
		},
	});
	const anos = new Set<number>();
	for (const p of processos) {
		if (!p.monitoramento?.enquadramento_urbanistico?.distrito) continue;
		for (const parc of p.parcelas) {
			const ano = anoArrecadacaoParcela(parc);
			if (parc.status_quitacao && ano != null) anos.add(ano);
		}
	}
	return [...anos].sort((a, b) => b - a);
}

export async function buscarResumoDistritos(): Promise<
	Pick<IRelatorioDistrito, 'chave' | 'nome' | 'val' | 'valBrl' | 'proc'>[]
> {
	const distritos = await buscarArrecadacaoPorDistrito();
	return distritos.map(({ chave, nome, val, valBrl, proc }) => ({ chave, nome, val, valBrl, proc }));
}

export function resumirDistritosDeProcessos(
	processos: ProcessoComDistrito[],
	filtro: FiltroPeriodoDistrito = {},
): Pick<IRelatorioDistrito, 'chave' | 'nome' | 'val' | 'valBrl' | 'proc'>[] {
	return montarDistritos(mapearProcessosPorDistrito(processos, filtro)).map(
		({ chave, nome, val, valBrl, proc }) => ({ chave, nome, val, valBrl, proc }),
	);
}

export function descreverPeriodoDistrito(filtro: FiltroPeriodoDistrito): string {
	const MESES = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
	];
	if (filtro.ano == null && filtro.mes == null) return 'Todo o período';
	if (filtro.ano != null && filtro.mes != null) {
		return `${MESES[filtro.mes]} de ${filtro.ano}`;
	}
	if (filtro.ano != null) return `Ano ${filtro.ano}`;
	if (filtro.mes != null) return `${MESES[filtro.mes]} (todos os anos)`;
	return 'Todo o período';
}
