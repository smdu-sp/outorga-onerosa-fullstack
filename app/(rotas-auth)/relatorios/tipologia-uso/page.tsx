/** @format */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { TableSkeleton } from '@/components/data-table';
import { relatorioTipologia } from '@/services/relatorios/tipologia';
import { parseFiltroPeriodo, descreverPeriodo } from '@/lib/server/periodo-relatorio';
import { FiltrosPeriodoDatas } from '../_components/filtros-periodo-datas';
import type { IRelatorioTipologia } from '@/types/relatorio';
import { GraficoTipologiaBarras } from './_components/grafico-barras-tipologia';
import { GraficoTipologiaPizza } from './_components/grafico-pizza-tipologia';
import { BotaoExportarExcel } from '../_components/botao-exportar-excel';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default async function TipologiaUsoPage({ searchParams }: { searchParams: SearchParams }) {
	const params = await searchParams;
	const filtro = parseFiltroPeriodo(params, { anoPadrao: 'todos', mesPadrao: 'omitir' });

	return (
		<Suspense fallback={<TableSkeleton />}>
			<Conteudo filtro={filtro} periodoLabel={descreverPeriodo(filtro)} />
		</Suspense>
	);
}

async function Conteudo({
	filtro,
	periodoLabel,
}: {
	filtro: ReturnType<typeof parseFiltroPeriodo>;
	periodoLabel: string;
}) {
	const resp = await relatorioTipologia(filtro);
	if (!resp.ok || !resp.data) notFound();
	const d = resp.data;

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
				<Link
					href="/relatorios"
					className="flex items-center gap-1 transition-colors hover:text-foreground">
					<ArrowLeft className="h-3.5 w-3.5" />
					Relatórios
				</Link>
				<span>/</span>
				<span className="font-semibold text-foreground">Tipologia de uso</span>
			</div>

			<div className="mb-5 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
						<Home className="h-6 w-6 text-primary" />
						Tipologia de uso OODC
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Residencial, Não Residencial e Uso Misto · {periodoLabel}
					</p>
				</div>
				<Suspense>
					<BotaoExportarExcel tipo="tipologia" />
				</Suspense>
			</div>

			<div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-3.5 py-2.5">
				<FiltroAnoChips />
				<FiltrosPeriodoDatas />
			</div>

			<div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Kpi label="Processos" valor={String(d.totais.qtdProcessos)} />
				<Kpi label="Arrecadado" valor={fmtBrl(d.totais.valorArrecadado)} />
				<Kpi label="Em aberto" valor={fmtBrl(d.totais.valorEmAberto)} />
				<Kpi label="Quebra" valor={fmtBrl(d.totais.valorQuebra)} />
			</div>

			<div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
				<GraficoTipologiaPizza d={d} />
				<GraficoTipologiaBarras d={d} />
			</div>

			<TabelaTipologia d={d} />
		</div>
	);
}

function FiltroAnoChips() {
	const ano = new Date().getFullYear();
	const anos = [ano, ano - 1, ano - 2, ano - 3, ano - 4];
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
				Ano
			</span>
			<Link
				href="?ano=todos"
				className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground">
				Todos
			</Link>
			{anos.map((a) => (
				<Link
					key={a}
					href={`?ano=${a}`}
					className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground">
					{a}
				</Link>
			))}
		</div>
	);
}

function Kpi({ label, valor }: { label: string; valor: string }) {
	return (
		<div className="rounded-xl border border-border bg-card p-4 shadow-xs">
			<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div className="mt-1 font-mono text-lg font-bold">{valor}</div>
		</div>
	);
}

function TabelaTipologia({ d }: { d: IRelatorioTipologia }) {
	return (
		<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
						<th className="px-4 py-3 font-semibold">Tipologia</th>
						<th className="px-4 py-3 text-right font-semibold">Processos</th>
						<th className="px-4 py-3 text-right font-semibold">Total parcelas</th>
						<th className="px-4 py-3 text-right font-semibold">Arrecadado</th>
						<th className="px-4 py-3 text-right font-semibold">Em aberto</th>
						<th className="px-4 py-3 text-right font-semibold">Quebra</th>
					</tr>
				</thead>
				<tbody>
					{d.linhas.map((l) => (
						<tr key={l.codigo} className="border-b border-border/60">
							<td className="px-4 py-2.5 font-medium">{l.label}</td>
							<td className="px-4 py-2.5 text-right font-mono">{l.qtdProcessos}</td>
							<td className="px-4 py-2.5 text-right font-mono">{fmtBrl(l.valorTotal)}</td>
							<td className="px-4 py-2.5 text-right font-mono">
								{fmtBrl(l.valorArrecadado)}
							</td>
							<td className="px-4 py-2.5 text-right font-mono">
								{fmtBrl(l.valorEmAberto)}
							</td>
							<td className="px-4 py-2.5 text-right font-mono">{fmtBrl(l.valorQuebra)}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="bg-muted/30 text-sm font-semibold">
						<td className="px-4 py-3">Total</td>
						<td className="px-4 py-3 text-right font-mono">{d.totais.qtdProcessos}</td>
						<td className="px-4 py-3 text-right font-mono">
							{fmtBrl(d.totais.valorTotal)}
						</td>
						<td className="px-4 py-3 text-right font-mono">
							{fmtBrl(d.totais.valorArrecadado)}
						</td>
						<td className="px-4 py-3 text-right font-mono">
							{fmtBrl(d.totais.valorEmAberto)}
						</td>
						<td className="px-4 py-3 text-right font-mono">
							{fmtBrl(d.totais.valorQuebra)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
