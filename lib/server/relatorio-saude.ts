/**
 * Relatório "Saúde da arrecadação": análise de coorte das parcelas por ano de
 * vencimento — quebra, inadimplência, antecipação e tempo de pagamento.
 * Usa apenas dados de parcelas (cobertura ~100%), portanto é confiável.
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import { normalizarSubprefeitura, tituloSubprefeitura } from '@/lib/geo/normalizar-subprefeitura';
import {
	dataNoPeriodoFiltro,
	type FiltroArrecadacao,
} from '@/lib/parcelas-utils';
import type {
	IRelatorioSaude,
	IRelatorioSaudeKpis,
	IRelatorioSaudeRegiao,
	IRelatorioSaudeTipo,
} from '@/types/relatorio';

const DIA_MS = 1000 * 60 * 60 * 24;

type ParcelaSaude = {
	valor: number;
	vencimento: Date;
	data_quitacao: Date | null;
	status_quitacao: boolean;
	quebra: boolean;
	antecipada: boolean;
	dias_antecipacao: number | null;
	processo_id: string;
	processo: {
		tipo: string | null;
		monitoramento: {
			enquadramento_urbanistico: { subprefeitura: string | null } | null;
		} | null;
	};
};

const pct = (n: number, d: number) => (d > 0 ? +((n / d) * 100).toFixed(1) : 0);
const media = (soma: number, n: number) => (n > 0 ? +(soma / n).toFixed(1) : null);

function calcularKpis(universo: ParcelaSaude[], hoje: Date): IRelatorioSaudeKpis {
	let previsto = 0,
		arrecadado = 0,
		quebraValor = 0,
		quebraCount = 0,
		emAbertoValor = 0,
		emAbertoCount = 0,
		vencidoValor = 0,
		vencidoCount = 0,
		antecipadoValor = 0,
		antecipadoCount = 0,
		somaDiasAntec = 0,
		countDiasAntec = 0,
		comDataQuitCount = 0,
		pagoPrazoCount = 0,
		pagoAtrasoCount = 0,
		somaDiasAtraso = 0;

	for (const p of universo) {
		previsto += p.valor;

		if (p.quebra) {
			quebraValor += p.valor;
			quebraCount++;
			continue;
		}

		if (p.status_quitacao) {
			arrecadado += p.valor;
			if (p.antecipada) {
				antecipadoValor += p.valor;
				antecipadoCount++;
				if (p.dias_antecipacao != null) {
					somaDiasAntec += p.dias_antecipacao;
					countDiasAntec++;
				}
			}
			if (p.data_quitacao) {
				comDataQuitCount++;
				const dias = Math.round((p.data_quitacao.getTime() - p.vencimento.getTime()) / DIA_MS);
				if (dias > 0) {
					pagoAtrasoCount++;
					somaDiasAtraso += dias;
				} else {
					pagoPrazoCount++;
				}
			}
		} else {
			emAbertoValor += p.valor;
			emAbertoCount++;
			if (p.vencimento < hoje) {
				vencidoValor += p.valor;
				vencidoCount++;
			}
		}
	}

	const quitadasCount = universo.filter((p) => p.status_quitacao && !p.quebra).length;

	return {
		previsto,
		arrecadado,
		quebraValor,
		quebraCount,
		emAbertoValor,
		emAbertoCount,
		vencidoValor,
		vencidoCount,
		antecipadoValor,
		antecipadoCount,
		mediaDiasAntecipacao: media(somaDiasAntec, countDiasAntec),
		comDataQuitCount,
		pagoPrazoCount,
		pagoAtrasoCount,
		mediaDiasAtraso: media(somaDiasAtraso, pagoAtrasoCount),
		coberturaDataQuit: pct(comDataQuitCount, quitadasCount),
		taxaQuebra: pct(quebraValor, previsto),
		taxaInadimplencia: pct(vencidoValor, previsto),
		taxaArrecadacao: pct(arrecadado, previsto),
	};
}

function agruparPorSubprefeitura(universo: ParcelaSaude[], hoje: Date): IRelatorioSaudeRegiao[] {
	const mapa = new Map<
		string,
		{
			nome: string;
			previsto: number;
			arrecadado: number;
			emAbertoValor: number;
			quebraValor: number;
			vencidoValor: number;
			procs: Set<string>;
		}
	>();

	for (const p of universo) {
		const raw = p.processo.monitoramento?.enquadramento_urbanistico?.subprefeitura;
		if (!raw) continue;
		const chave = normalizarSubprefeitura(raw);
		if (!mapa.has(chave)) {
			mapa.set(chave, {
				nome: tituloSubprefeitura(raw),
				previsto: 0,
				arrecadado: 0,
				emAbertoValor: 0,
				quebraValor: 0,
				vencidoValor: 0,
				procs: new Set(),
			});
		}
		const e = mapa.get(chave)!;
		e.previsto += p.valor;
		e.procs.add(p.processo_id);
		if (p.quebra) e.quebraValor += p.valor;
		else if (p.status_quitacao) e.arrecadado += p.valor;
		else {
			e.emAbertoValor += p.valor;
			if (p.vencimento < hoje) e.vencidoValor += p.valor;
		}
	}

	return Array.from(mapa.values())
		.map((e) => ({
			nome: e.nome,
			previsto: e.previsto,
			arrecadado: e.arrecadado,
			emAbertoValor: e.emAbertoValor,
			quebraValor: e.quebraValor,
			vencidoValor: e.vencidoValor,
			taxaQuebra: pct(e.quebraValor, e.previsto),
			taxaInadimplencia: pct(e.vencidoValor, e.previsto),
			proc: e.procs.size,
		}))
		.sort((a, b) => b.previsto - a.previsto);
}

function agruparPorTipo(universo: ParcelaSaude[]): IRelatorioSaudeTipo[] {
	const mapa = new Map<string, { previsto: number; arrecadado: number; quebraValor: number }>();
	for (const p of universo) {
		const tipo = p.processo.tipo ?? 'PDE';
		if (!mapa.has(tipo)) mapa.set(tipo, { previsto: 0, arrecadado: 0, quebraValor: 0 });
		const e = mapa.get(tipo)!;
		e.previsto += p.valor;
		if (p.quebra) e.quebraValor += p.valor;
		else if (p.status_quitacao) e.arrecadado += p.valor;
	}
	return Array.from(mapa.entries())
		.map(([tipo, e]) => ({
			tipo,
			previsto: e.previsto,
			arrecadado: e.arrecadado,
			quebraValor: e.quebraValor,
			taxaQuebra: pct(e.quebraValor, e.previsto),
		}))
		.sort((a, b) => b.previsto - a.previsto);
}

function distribuicaoPagamento(universo: ParcelaSaude[]) {
	const buckets = [
		{ label: 'Antecipado / no prazo', count: 0, valor: 0, test: (d: number) => d <= 0 },
		{ label: 'Atraso 1–30 dias', count: 0, valor: 0, test: (d: number) => d >= 1 && d <= 30 },
		{ label: 'Atraso 31–90 dias', count: 0, valor: 0, test: (d: number) => d >= 31 && d <= 90 },
		{ label: 'Atraso 90+ dias', count: 0, valor: 0, test: (d: number) => d > 90 },
	];
	for (const p of universo) {
		if (!p.status_quitacao || p.quebra || !p.data_quitacao) continue;
		const dias = Math.round((p.data_quitacao.getTime() - p.vencimento.getTime()) / DIA_MS);
		const b = buckets.find((x) => x.test(dias));
		if (b) {
			b.count++;
			b.valor += p.valor;
		}
	}
	return buckets.map(({ label, count, valor }) => ({ label, count, valor }));
}

export async function buscarSaudeArrecadacao(
	anoFiltro?: number,
	intervalo?: Pick<FiltroArrecadacao, 'dataInicio' | 'dataFim'>,
): Promise<IRelatorioSaude> {
	const hoje = new Date();
	const parcelas: ParcelaSaude[] = await prisma.parcela.findMany({
		select: {
			valor: true,
			vencimento: true,
			data_quitacao: true,
			status_quitacao: true,
			quebra: true,
			antecipada: true,
			dias_antecipacao: true,
			processo_id: true,
			processo: {
				select: {
					tipo: true,
					monitoramento: {
						select: {
							enquadramento_urbanistico: { select: { subprefeitura: true } },
						},
					},
				},
			},
		},
	});

	const anos = [...new Set(parcelas.map((p) => p.vencimento.getFullYear()))].sort((a, b) => b - a);
	const ano = intervalo?.dataInicio || intervalo?.dataFim ? null : (anoFiltro ?? null);
	const universo =
		intervalo?.dataInicio || intervalo?.dataFim
			? parcelas.filter((p) =>
					dataNoPeriodoFiltro(p.vencimento, {
						dataInicio: intervalo.dataInicio,
						dataFim: intervalo.dataFim,
					}),
				)
			: ano != null
				? parcelas.filter((p) => p.vencimento.getFullYear() === ano)
				: parcelas;

	return {
		ano,
		anos,
		kpis: calcularKpis(universo, hoje),
		porSubprefeitura: agruparPorSubprefeitura(universo, hoje),
		porTipo: agruparPorTipo(universo),
		distribuicaoPagamento: distribuicaoPagamento(universo),
	};
}
