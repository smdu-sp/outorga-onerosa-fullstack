import { prisma } from '@/lib/prisma';
import { dataPagamentoParcela, parcelaArrecadadaNoPeriodo } from '@/lib/parcelas-utils';
import { resumirDistritosDeProcessos } from '@/lib/server/relatorios-distritos';
import {
	resolverOrigemOutorga,
	selectCotaOrigem,
	selectFichaOrigem,
} from '@/lib/server/relatorio-origem';
import { IRelatorio, IRelatorioPdeCota, IRelatorioTop10 } from '@/types/relatorio';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const BRL_TO_M = 1_000_000;

/** Filtro de período por vencimento das parcelas (mesma semântica do mapa de subprefeituras). */
export type FiltroPeriodoRanking = {
	/** Ano civil; undefined = todos os anos */
	ano?: number;
	/** 0 = janeiro … 11 = dezembro; undefined = todos os meses */
	mes?: number;
};

const processoRankingSelect = {
	id: true,
	num_processo: true,
	tipo: true,
	status_pagamento: true,
	parcelas: {
		select: {
			valor: true,
			status_quitacao: true,
			vencimento: true,
			data_quitacao: true,
			ano_pagamento: true,
			antecipada: true,
			quebra: true,
		},
	},
	monitoramento: {
		select: { proprietario_interessado: true, ...selectFichaOrigem },
	},
	monitoramento_cota: {
		select: { proprietario_interessado: true, ...selectCotaOrigem },
	},
} as const;

function parcelaNoPeriodo(
	vencimento: Date,
	filtro: FiltroPeriodoRanking,
): boolean {
	const ano = vencimento.getFullYear();
	const mes = vencimento.getMonth();
	if (filtro.ano != null && ano !== filtro.ano) return false;
	if (filtro.mes != null && mes !== filtro.mes) return false;
	return true;
}

function mapearRankingProcessos(
	processos: Awaited<ReturnType<typeof carregarProcessosRanking>>,
	filtro: FiltroPeriodoRanking,
	hoje: Date,
): IRelatorioTop10[] {
	return processos
		.map((p) => {
			const parcelasPeriodo = p.parcelas.filter((x) => parcelaNoPeriodo(x.vencimento, filtro));
			if (parcelasPeriodo.length === 0) return null;

			const total = parcelasPeriodo.reduce((s, x) => s + x.valor, 0);
			const pago = parcelasPeriodo
				.filter((x) => x.status_quitacao)
				.reduce((s, x) => s + x.valor, 0);

			const status: IRelatorioTop10['status'] =
				p.status_pagamento === 'QUITADO'
					? 'quitado'
					: p.status_pagamento === 'QUEBRA'
						? 'quebra'
						: 'andamento';
			const interessado =
				p.monitoramento?.proprietario_interessado ??
				p.monitoramento_cota?.proprietario_interessado ??
				p.num_processo;
			const subprefeitura =
				p.monitoramento?.enquadramento_urbanistico?.subprefeitura ?? '';
			const origem = resolverOrigemOutorga(p.monitoramento, p.monitoramento_cota);

			const proximaParc = p.parcelas
				.filter((x) => !x.status_quitacao && !x.quebra && x.vencimento >= hoje)
				.sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())[0];

			return {
				id: p.id,
				num: p.num_processo,
				int: interessado,
				tipo: p.tipo ?? 'PDE',
				total: +(total / BRL_TO_M).toFixed(2),
				pago: +(pago / BRL_TO_M).toFixed(2),
				status,
				sub: subprefeitura,
				venc: proximaParc ? proximaParc.vencimento.toISOString().slice(0, 10) : null,
				sistema: origem.sistema,
				empreendimento: origem.empreendimento,
				distrito: origem.distrito,
			};
		})
		.filter((p): p is NonNullable<typeof p> => p !== null)
		.sort((a, b) => b.total - a.total);
}

async function carregarProcessosRanking() {
	return prisma.processo.findMany({ select: processoRankingSelect });
}

/** Ranking completo de processos por valor total no período (vencimento). */
export async function buscarRankingProcessos(
	filtro: FiltroPeriodoRanking = {},
): Promise<IRelatorioTop10[]> {
	const processos = await carregarProcessosRanking();
	return mapearRankingProcessos(processos, filtro, new Date());
}

export async function buscarRelatorio(anoFiltro?: number, mesFiltro?: number): Promise<IRelatorio> {
	const hoje = new Date();
	const anoAtual = anoFiltro ?? hoje.getFullYear();
	const mesAtual =
		mesFiltro != null
			? mesFiltro - 1
			: anoFiltro == null || anoFiltro === hoje.getFullYear()
				? hoje.getMonth()
				: anoFiltro < hoje.getFullYear()
					? 11
					: -1;

	const inicioAno = new Date(anoAtual, 0, 1);
	const fimAno = new Date(anoAtual + 1, 0, 1);

	// ── Previsto: vencimentos no ano ──
	const parcelasVencimentoAno = await prisma.parcela.findMany({
		where: { vencimento: { gte: inicioAno, lt: fimAno } },
		select: {
			valor: true,
			vencimento: true,
			status_quitacao: true,
			quebra: true,
			antecipada: true,
			processo: { select: { tipo: true } },
		},
	});

	// ── Arrecadado: pagamentos efetivos no ano (data_quitacao / ano_pagamento) ──
	const parcelasPagasAno = await prisma.parcela.findMany({
		where: { status_quitacao: true },
		select: {
			valor: true,
			vencimento: true,
			data_quitacao: true,
			ano_pagamento: true,
			antecipada: true,
			quebra: true,
			status_quitacao: true,
			processo: { select: { tipo: true } },
		},
	});

	const parcelasArrecadadasAno = parcelasPagasAno.filter((p) =>
		parcelaArrecadadaNoPeriodo(p, { ano: anoAtual }),
	);

	// ── D26: mensal do ano atual ──
	const prev: (number | null)[] = Array(12).fill(null);
	const real: (number | null)[] = Array(12).fill(null);
	const quebras: (number | null)[] = Array(12).fill(null);
	const antec: (number | null)[] = Array(12).fill(null);

	// Arrecadado no ano por tipo (mesma base do real[]): FUNDURB = outorga + cota; AIU à parte
	const arrecTipoBrl = { outorga: 0, cota: 0, aiu: 0 };

	// Métricas FUNDURB (exclui AIU) para os KPIs de gestão do fundo
	let quebrasFundurbBrl = 0;
	let antecFundurbBrl = 0;
	let prevRestanteFundurbBrl = 0;
	const naoAiu = (p: { processo?: { tipo: string | null } | null }) => p.processo?.tipo !== 'AIU';

	for (let m = 0; m < 12; m++) {
		const vencNoMes = parcelasVencimentoAno.filter((p) => p.vencimento.getMonth() === m);
		const pagoNoMes = parcelasArrecadadasAno.filter((p) => {
			const pagamento = dataPagamentoParcela(p);
			return pagamento != null && pagamento.getMonth() === m;
		});

		if (vencNoMes.length === 0 && pagoNoMes.length === 0) continue;

		const vencNoMesFundurb = vencNoMes.filter(naoAiu);
		const pagoNoMesFundurb = pagoNoMes.filter(naoAiu);
		if (m > mesAtual) {
			prevRestanteFundurbBrl += vencNoMesFundurb.reduce((s, p) => s + p.valor, 0);
		} else {
			quebrasFundurbBrl += vencNoMesFundurb.filter((p) => p.quebra).reduce((s, p) => s + p.valor, 0);
			antecFundurbBrl += pagoNoMesFundurb.filter((p) => p.antecipada).reduce((s, p) => s + p.valor, 0);
		}

		const totalPrev = vencNoMes.reduce((s, p) => s + p.valor, 0);
		const totalReal = pagoNoMes.reduce((s, p) => s + p.valor, 0);
		const totalQuebra = vencNoMes
			.filter((p) => p.quebra)
			.reduce((s, p) => s + p.valor, 0);
		const totalAntec = pagoNoMes
			.filter((p) => p.antecipada)
			.reduce((s, p) => s + p.valor, 0);

		if (totalPrev > 0) prev[m] = +(totalPrev / BRL_TO_M).toFixed(1);
		if (m <= mesAtual) {
			if (totalReal > 0) real[m] = +(totalReal / BRL_TO_M).toFixed(1);
			if (totalQuebra > 0) quebras[m] = +(totalQuebra / BRL_TO_M).toFixed(1);
			if (totalAntec > 0) antec[m] = +(totalAntec / BRL_TO_M).toFixed(1);
			for (const p of pagoNoMes) {
				const tipo = p.processo?.tipo;
				if (tipo === 'COTA') arrecTipoBrl.cota += p.valor;
				else if (tipo === 'AIU') arrecTipoBrl.aiu += p.valor;
				else arrecTipoBrl.outorga += p.valor; // PDE ou sem tipo → Outorga
			}
		}
	}

	const arrecadadoTipo = {
		outorga: +(arrecTipoBrl.outorga / BRL_TO_M).toFixed(1),
		cota: +(arrecTipoBrl.cota / BRL_TO_M).toFixed(1),
		aiu: +(arrecTipoBrl.aiu / BRL_TO_M).toFixed(1),
	};

	// ── Histórico anos anteriores ──
	const anosHist = [anoAtual - 4, anoAtual - 3, anoAtual - 2, anoAtual - 1];
	const hist: Record<number, number[]> = {};

	await Promise.all(
		anosHist.map(async (ano) => {
			const parcelas = await prisma.parcela.findMany({
				where: { status_quitacao: true },
				select: {
					valor: true,
					vencimento: true,
					data_quitacao: true,
					ano_pagamento: true,
					status_quitacao: true,
				},
			});

			const mensal = Array(12).fill(0) as number[];
			for (const p of parcelas) {
				if (!parcelaArrecadadaNoPeriodo(p, { ano })) continue;
				const pagamento = dataPagamentoParcela(p);
				if (!pagamento) continue;
				mensal[pagamento.getMonth()] += p.valor;
			}
			hist[ano] = mensal.map((v) => +(v / BRL_TO_M).toFixed(1));
		}),
	);

	// ── Top processos por valor total ──
	const processos = await carregarProcessosRanking();

	const todosProcessos = mapearRankingProcessos(processos, { ano: anoAtual }, hoje);
	const topAno = todosProcessos.slice(0, 10);
	const topMes =
		mesAtual >= 0
			? mapearRankingProcessos(processos, { ano: anoAtual, mes: mesAtual }, hoje).slice(0, 10)
			: [];
	const topTodo = mapearRankingProcessos(processos, {}, hoje).slice(0, 10);

	function agruparTipo(lista: typeof todosProcessos): IRelatorioPdeCota {
		return {
			total: +lista.reduce((s, p) => s + p.total, 0).toFixed(2),
			pago: +lista.reduce((s, p) => s + p.pago, 0).toFixed(2),
			count: lista.length,
			andamento: lista.filter((p) => p.status === 'andamento').length,
			quitado: lista.filter((p) => p.status === 'quitado').length,
			quebra: lista.filter((p) => p.status === 'quebra').length,
		};
	}

	const pde = agruparTipo(todosProcessos.filter((p) => p.tipo === 'PDE'));
	const cota = agruparTipo(todosProcessos.filter((p) => p.tipo === 'COTA'));
	const aiu = agruparTipo(todosProcessos.filter((p) => p.tipo === 'AIU'));

	// KPIs FUNDURB (Outorga + Cota, exclui AIU)
	const fundurb = {
		arrecadado: +((arrecTipoBrl.outorga + arrecTipoBrl.cota) / BRL_TO_M).toFixed(1),
		quebras: +(quebrasFundurbBrl / BRL_TO_M).toFixed(1),
		antecipacoes: +(antecFundurbBrl / BRL_TO_M).toFixed(1),
		prevRestante: +(prevRestanteFundurbBrl / BRL_TO_M).toFixed(1),
		processos: pde.count + cota.count,
	};

	// ── Subprefeituras ──
	const subMap = new Map<string, { val: number; proc: Set<string> }>();
	for (const p of processos) {
		const sub = p.monitoramento?.enquadramento_urbanistico?.subprefeitura;
		if (!sub) continue;
		const pago = p.parcelas
			.filter((x) => x.status_quitacao)
			.reduce((s, x) => s + x.valor, 0);
		if (!subMap.has(sub)) subMap.set(sub, { val: 0, proc: new Set() });
		const entry = subMap.get(sub)!;
		entry.val += pago;
		entry.proc.add(p.id);
	}
	const subs = Array.from(subMap.entries())
		.map(([nome, { val, proc }]) => ({
			nome,
			val: +(val / BRL_TO_M).toFixed(1),
			proc: proc.size,
		}))
		.sort((a, b) => b.val - a.val)
		.slice(0, 12);

	// ── Vencimentos próximos (7 dias) ──
	const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
	const parcelasProximas = await prisma.parcela.findMany({
		where: {
			vencimento: { gte: hoje, lte: em7dias },
			status_quitacao: false,
			quebra: false,
		},
		orderBy: { vencimento: 'asc' },
		include: {
			processo: {
				select: {
					tipo: true,
					num_processo: true,
					monitoramento: { select: { proprietario_interessado: true } },
					monitoramento_cota: { select: { proprietario_interessado: true } },
				},
			},
		},
	});

	const alertas = parcelasProximas.map((p) => {
		const dias = Math.ceil(
			(p.vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
		);
		const interessado =
			p.processo.monitoramento?.proprietario_interessado ??
			p.processo.monitoramento_cota?.proprietario_interessado ??
			p.processo.num_processo;
		return {
			num: p.processo.num_processo,
			int: interessado,
			val: +(p.valor / BRL_TO_M).toFixed(2),
			venc: p.vencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
			dias,
			tipo: p.processo.tipo ?? 'PDE',
		};
	});

	// ── Meta anual: soma de todos os prev ──
	const metaAnual = prev.reduce<number>((s, v) => s + (v ?? 0), 0);

	const distritos = resumirDistritosDeProcessos(processos);

	return {
		anoAtual,
		mesAtual,
		metaAnual: +metaAnual.toFixed(0) || 1,
		meses: MESES,
		d26: { prev, real, quebras, antec },
		hist,
		top: { ano: topAno, mes: topMes, todo: topTodo },
		subs,
		distritos,
		alertas,
		totalProcessos: todosProcessos.length,
		pde,
		cota,
		aiu,
		arrecadadoTipo,
		fundurb,
	};
}
