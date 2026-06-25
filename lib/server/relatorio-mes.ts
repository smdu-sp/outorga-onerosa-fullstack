import { prisma } from '@/lib/prisma';
import { IRelatorioMesDetalhe, IRelatorioMesProcesso } from '@/types/relatorio';

const MESES_NOME = [
	'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
	'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_PRIORITY = { quebra: 4, aberto: 3, pago_atraso: 2, pago_prazo: 1 } as const;

type StatusParcela = 'pago_prazo' | 'pago_atraso' | 'aberto' | 'quebra';

function resolverStatus(p: {
	quebra: boolean;
	status_quitacao: boolean;
	vencimento: Date;
	data_quitacao: Date | null;
}): StatusParcela {
	if (p.quebra) return 'quebra';
	if (p.status_quitacao) {
		const quitDate = p.data_quitacao ?? p.vencimento;
		return quitDate <= p.vencimento ? 'pago_prazo' : 'pago_atraso';
	}
	return 'aberto';
}

export async function buscarRelatorioMes(ano: number, mes: number): Promise<IRelatorioMesDetalhe> {
	const mesIdx = mes - 1;
	const inicioMes = new Date(ano, mesIdx, 1);
	const fimMes = new Date(ano, mesIdx + 1, 1);
	const inicioMesAnt = new Date(ano - 1, mesIdx, 1);
	const fimMesAnt = new Date(ano - 1, mesIdx + 1, 1);

	const [parcelasVenc, parcelasArrec, prevAnt, realAnt] = await Promise.all([
		// Parcelas com vencimento no mês (universo previsto)
		prisma.parcela.findMany({
			where: { vencimento: { gte: inicioMes, lt: fimMes } },
			select: {
				id: true,
				valor: true,
				vencimento: true,
				data_quitacao: true,
				ano_pagamento: true,
				status_quitacao: true,
				quebra: true,
				antecipada: true,
				processo: {
					select: {
						id: true,
						num_processo: true,
						tipo: true,
						monitoramento: { select: { proprietario_interessado: true } },
						monitoramento_cota: { select: { proprietario_interessado: true } },
					},
				},
			},
		}),
		// Parcelas arrecadadas no mês (pelo data de quitação)
		prisma.parcela.findMany({
			where: {
				status_quitacao: true,
				data_quitacao: { gte: inicioMes, lt: fimMes },
			},
			select: {
				id: true,
				valor: true,
				vencimento: true,
				data_quitacao: true,
				antecipada: true,
			},
		}),
		// Previsto mesmo mês ano anterior
		prisma.parcela.aggregate({
			where: { vencimento: { gte: inicioMesAnt, lt: fimMesAnt } },
			_sum: { valor: true },
		}),
		// Realizado mesmo mês ano anterior
		prisma.parcela.aggregate({
			where: {
				status_quitacao: true,
				data_quitacao: { gte: inicioMesAnt, lt: fimMesAnt },
			},
			_sum: { valor: true },
		}),
	]);

	// Totais
	const totalPrevisto = parcelasVenc.reduce((s, p) => s + p.valor, 0);
	const totalRealizado = parcelasArrec.reduce((s, p) => s + p.valor, 0);
	const totalQuebras = parcelasVenc.filter((p) => p.quebra).reduce((s, p) => s + p.valor, 0);
	const totalAntec = parcelasArrec.filter((p) => p.antecipada).reduce((s, p) => s + p.valor, 0);

	// Contagem de status
	let pagoPrazo = 0, pagoAtraso = 0, aberto = 0, quebraCount = 0;
	for (const p of parcelasVenc) {
		const s = resolverStatus(p);
		if (s === 'pago_prazo') pagoPrazo++;
		else if (s === 'pago_atraso') pagoAtraso++;
		else if (s === 'aberto') aberto++;
		else quebraCount++;
	}

	// Agrupar por processo (pior status vence)
	const procMap = new Map<string, IRelatorioMesProcesso & { _valorBrl: number }>();
	for (const p of parcelasVenc) {
		const proc = p.processo;
		const interessado =
			proc.monitoramento?.proprietario_interessado ??
			proc.monitoramento_cota?.proprietario_interessado ??
			proc.num_processo;
		const status = resolverStatus(p);

		const existing = procMap.get(proc.id);
		if (existing) {
			existing._valorBrl += p.valor;
			existing.valor = existing._valorBrl;
			if (STATUS_PRIORITY[status] > STATUS_PRIORITY[existing.status]) {
				existing.status = status;
				existing.vencimento = p.vencimento.toISOString().slice(0, 10);
				existing.quitacao = p.data_quitacao?.toISOString().slice(0, 10) ?? null;
			}
		} else {
			procMap.set(proc.id, {
				id: proc.id,
				num: proc.num_processo,
				interessado,
				tipo: proc.tipo ?? 'PDE',
				valor: p.valor,
				_valorBrl: p.valor,
				status,
				vencimento: p.vencimento.toISOString().slice(0, 10),
				quitacao: p.data_quitacao?.toISOString().slice(0, 10) ?? null,
			});
		}
	}

	const processos = Array.from(procMap.values())
		.map(({ _valorBrl: _, ...rest }) => rest)
		.sort((a, b) => b.valor - a.valor);

	// Distribuição por semana (1–7, 8–14, 15–21, 22–28, 29+)
	const semanasReal = [0, 0, 0, 0, 0];
	const semanasPrev = [0, 0, 0, 0, 0];

	for (const p of parcelasArrec) {
		const dia = p.data_quitacao!.getDate();
		const idx = Math.min(Math.floor((dia - 1) / 7), 4);
		semanasReal[idx] += p.valor;
	}
	for (const p of parcelasVenc) {
		const dia = p.vencimento.getDate();
		const idx = Math.min(Math.floor((dia - 1) / 7), 4);
		semanasPrev[idx] += p.valor;
	}

	const semanas = ['1–7', '8–14', '15–21', '22–28', '29+']
		.map((label, i) => ({ label, previsto: semanasPrev[i], realizado: semanasReal[i] }))
		.filter((s) => s.previsto > 0 || s.realizado > 0);

	return {
		ano,
		mes,
		nomeMes: MESES_NOME[mesIdx],
		previsto: totalPrevisto,
		realizado: totalRealizado,
		quebras: totalQuebras,
		antecipacoes: totalAntec,
		semanas,
		processos,
		anoAnterior: {
			previsto: prevAnt._sum.valor ?? 0,
			realizado: realAnt._sum.valor ?? 0,
		},
		countStatus: { pagoPrazo, pagoAtraso, aberto, quebra: quebraCount },
	};
}
