import { prisma } from '@/lib/prisma';
import { dataPagamentoParcela, parcelaArrecadadaNoPeriodo } from '@/lib/parcelas-utils';
import { resumirDistritosDeProcessos } from '@/lib/server/relatorios-distritos';
import { IRelatorio, IRelatorioPdeCota } from '@/types/relatorio';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const BRL_TO_M = 1_000_000;

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

	for (let m = 0; m < 12; m++) {
		const vencNoMes = parcelasVencimentoAno.filter((p) => p.vencimento.getMonth() === m);
		const pagoNoMes = parcelasArrecadadasAno.filter((p) => {
			const pagamento = dataPagamentoParcela(p);
			return pagamento != null && pagamento.getMonth() === m;
		});

		if (vencNoMes.length === 0 && pagoNoMes.length === 0) continue;

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
		}
	}

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

	// ── Top processos por valor total no ano ──
	const processos = await prisma.processo.findMany({
		select: {
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
				select: {
					proprietario_interessado: true,
					enquadramento_urbanistico: { select: { subprefeitura: true, distrito: true } },
				},
			},
			monitoramento_cota: { select: { proprietario_interessado: true } },
		},
	});

	const todosProcessos = processos
		.map((p) => {
			const parcelasAno = p.parcelas.filter(
				(x) => x.vencimento >= inicioAno && x.vencimento < fimAno,
			);
			if (parcelasAno.length === 0) return null;
			const total = parcelasAno.reduce((s, x) => s + x.valor, 0);
			const pago = p.parcelas
				.filter((x) => x.status_quitacao && parcelaArrecadadaNoPeriodo(x, { ano: anoAtual }))
				.reduce((s, x) => s + x.valor, 0);
			const status: 'andamento' | 'quitado' | 'quebra' =
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
				venc: proximaParc
					? proximaParc.vencimento.toISOString().slice(0, 10)
					: null,
			};
		})
		.filter((p): p is NonNullable<typeof p> => p !== null)
		.sort((a, b) => b.total - a.total);

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

	const processosComValor = todosProcessos.slice(0, 100);

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
		top: processosComValor,
		subs,
		distritos,
		alertas,
		totalProcessos: todosProcessos.length,
		pde,
		cota,
	};
}
