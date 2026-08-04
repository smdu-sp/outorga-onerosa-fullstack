import { prisma } from '@/lib/prisma';
import { dataPagamentoParcela, parcelaArrecadadaNoPeriodo } from '@/lib/parcelas-utils';
import { resolverNomeInteressado } from '@/lib/interessado';
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
	interessado: true,
	cnpj: true,
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
			const interessado = resolverNomeInteressado(p);
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

export async function buscarRelatorio(
	/** `null` = todos os anos; `undefined` = ano corrente */
	anoFiltro?: number | null,
	mesFiltro?: number,
): Promise<IRelatorio> {
	const hoje = new Date();
	const todosAnos = anoFiltro === null;
	const anoAtual = todosAnos ? hoje.getFullYear() : (anoFiltro ?? hoje.getFullYear());
	const mesAtual =
		mesFiltro != null
			? mesFiltro - 1
			: todosAnos || anoFiltro == null || anoFiltro === hoje.getFullYear()
				? hoje.getMonth()
				: anoFiltro < hoje.getFullYear()
					? 11
					: -1;

	const inicioAno = new Date(anoAtual, 0, 1);
	const fimAno = new Date(anoAtual + 1, 0, 1);

	// ── Previsto: vencimentos no ano (ou todos, se filtro "Todos") ──
	const parcelasVencimentoAno = await prisma.parcela.findMany({
		where: todosAnos ? undefined : { vencimento: { gte: inicioAno, lt: fimAno } },
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

	const parcelasArrecadadasAno = todosAnos
		? parcelasPagasAno
		: parcelasPagasAno.filter((p) => parcelaArrecadadaNoPeriodo(p, { ano: anoAtual }));

	const multasPagas = await prisma.multa.findMany({
		where: {
			status_quitacao: true,
			...(todosAnos ? {} : { data_quitacao: { gte: inicioAno, lt: fimAno } }),
		},
		select: { valor: true, data_quitacao: true },
	});

	// ── D26: mensal do ano de referência (calendário/gráficos mensais) ──
	// Com "Todos", o calendário mensal continua no ano corrente; KPIs usam a base completa acima.
	const parcelasVencimentoD26 = todosAnos
		? parcelasVencimentoAno.filter(
				(p) => p.vencimento >= inicioAno && p.vencimento < fimAno,
			)
		: parcelasVencimentoAno;
	const parcelasArrecadadasD26 = todosAnos
		? parcelasPagasAno.filter((p) => parcelaArrecadadaNoPeriodo(p, { ano: anoAtual }))
		: parcelasArrecadadasAno;
	const multasPagasD26 = todosAnos
		? multasPagas.filter(
				(m) =>
					m.data_quitacao != null &&
					m.data_quitacao >= inicioAno &&
					m.data_quitacao < fimAno,
			)
		: multasPagas;

	const prev: (number | null)[] = Array(12).fill(null);
	const real: (number | null)[] = Array(12).fill(null);
	const quebras: (number | null)[] = Array(12).fill(null);
	const antec: (number | null)[] = Array(12).fill(null);

	// Arrecadado no período por tipo (mesma base do real[] / KPIs)
	const arrecTipoBrl = { outorga: 0, cota: 0, aiu: 0, multa: 0 };

	// Métricas FUNDURB (exclui AIU) para os KPIs de gestão do fundo
	let quebrasFundurbBrl = 0;
	let antecFundurbBrl = 0;
	let prevRestanteFundurbBrl = 0;
	const naoAiu = (p: { processo?: { tipo: string | null } | null }) => p.processo?.tipo !== 'AIU';

	for (let m = 0; m < 12; m++) {
		const vencNoMes = parcelasVencimentoD26.filter((p) => p.vencimento.getMonth() === m);
		const pagoNoMes = parcelasArrecadadasD26.filter((p) => {
			const pagamento = dataPagamentoParcela(p);
			return pagamento != null && pagamento.getMonth() === m;
		});
		const temMultaNoMes = multasPagasD26.some(
			(multa) => multa.data_quitacao != null && multa.data_quitacao.getMonth() === m,
		);

		if (vencNoMes.length === 0 && pagoNoMes.length === 0 && !temMultaNoMes) continue;

		const vencNoMesFundurb = vencNoMes.filter(naoAiu);
		const pagoNoMesFundurb = pagoNoMes.filter(naoAiu);
		if (m > mesAtual) {
			prevRestanteFundurbBrl += vencNoMesFundurb.reduce((s, p) => s + p.valor, 0);
		} else {
			quebrasFundurbBrl += vencNoMesFundurb.filter((p) => p.quebra).reduce((s, p) => s + p.valor, 0);
			antecFundurbBrl += pagoNoMesFundurb.filter((p) => p.antecipada).reduce((s, p) => s + p.valor, 0);
		}

		const totalPrev = vencNoMes.reduce((s, p) => s + p.valor, 0);
		const multaNoMes = multasPagasD26
			.filter((multa) => multa.data_quitacao != null && multa.data_quitacao.getMonth() === m)
			.reduce((s, multa) => s + Number(multa.valor), 0);
		const totalReal = pagoNoMes.reduce((s, p) => s + p.valor, 0) + (m <= mesAtual ? multaNoMes : 0);
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
			arrecTipoBrl.multa += multaNoMes;
		}
	}

	// KPIs de tipo no modo "Todos": soma de todo o período (não só o D26 do ano corrente)
	if (todosAnos) {
		arrecTipoBrl.outorga = 0;
		arrecTipoBrl.cota = 0;
		arrecTipoBrl.aiu = 0;
		arrecTipoBrl.multa = 0;
		quebrasFundurbBrl = 0;
		antecFundurbBrl = 0;
		prevRestanteFundurbBrl = 0;
		for (const p of parcelasArrecadadasAno) {
			const tipo = p.processo?.tipo;
			if (tipo === 'COTA') arrecTipoBrl.cota += p.valor;
			else if (tipo === 'AIU') arrecTipoBrl.aiu += p.valor;
			else arrecTipoBrl.outorga += p.valor;
			if (naoAiu(p) && p.antecipada) antecFundurbBrl += p.valor;
		}
		for (const multa of multasPagas) {
			arrecTipoBrl.multa += Number(multa.valor);
		}
		for (const p of parcelasVencimentoAno) {
			if (!naoAiu(p)) continue;
			if (p.quebra) quebrasFundurbBrl += p.valor;
			else if (!p.status_quitacao) prevRestanteFundurbBrl += p.valor;
		}
	}

	const arrecadadoTipo = {
		outorga: +(arrecTipoBrl.outorga / BRL_TO_M).toFixed(1),
		cota: +(arrecTipoBrl.cota / BRL_TO_M).toFixed(1),
		aiu: +(arrecTipoBrl.aiu / BRL_TO_M).toFixed(1),
		multa: +(arrecTipoBrl.multa / BRL_TO_M).toFixed(1),
	};

	// ── Histórico anos anteriores ──
	const anosHist = [anoAtual - 4, anoAtual - 3, anoAtual - 2, anoAtual - 1];
	const hist: Record<number, number[]> = {};

	await Promise.all(
		anosHist.map(async (ano) => {
			const inicio = new Date(ano, 0, 1);
			const fim = new Date(ano + 1, 0, 1);
			const [parcelas, multas] = await Promise.all([
				prisma.parcela.findMany({
					where: { status_quitacao: true },
					select: {
						valor: true,
						vencimento: true,
						data_quitacao: true,
						ano_pagamento: true,
						status_quitacao: true,
					},
				}),
				prisma.multa.findMany({
					where: {
						status_quitacao: true,
						data_quitacao: { gte: inicio, lt: fim },
					},
					select: { valor: true, data_quitacao: true },
				}),
			]);

			const mensal = Array(12).fill(0) as number[];
			for (const p of parcelas) {
				if (!parcelaArrecadadaNoPeriodo(p, { ano })) continue;
				const pagamento = dataPagamentoParcela(p);
				if (!pagamento) continue;
				mensal[pagamento.getMonth()] += p.valor;
			}
			for (const multa of multas) {
				if (!multa.data_quitacao) continue;
				mensal[multa.data_quitacao.getMonth()] += Number(multa.valor);
			}
			hist[ano] = mensal.map((v) => +(v / BRL_TO_M).toFixed(1));
		}),
	);

	// ── Top processos por valor total ──
	const processos = await carregarProcessosRanking();

	const todosProcessos = mapearRankingProcessos(
		processos,
		todosAnos ? {} : { ano: anoAtual },
		hoje,
	);
	const topAno = todosProcessos.slice(0, 10);
	const topMes =
		!todosAnos && mesAtual >= 0
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

	// KPIs FUNDURB (Outorga + Cota + Multa, exclui AIU)
	const fundurb = {
		arrecadado: +((arrecTipoBrl.outorga + arrecTipoBrl.cota + arrecTipoBrl.multa) / BRL_TO_M).toFixed(1),
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
					interessado: true,
					cnpj: true,
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
		const interessado = resolverNomeInteressado(p.processo);
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
