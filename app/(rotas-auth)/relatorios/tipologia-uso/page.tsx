/** @format */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { RelatorioSubpaginaSkeleton } from '@/components/skeleton-blocks';
import { PageHeader, PageShell, StatGroup } from '@/components/page-shell';
import { FiltroBar, FiltroChip, filtroLabelClass } from '@/components/filtro-ui';
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
		<Suspense fallback={<RelatorioSubpaginaSkeleton />}>
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
		<PageShell>
			<PageHeader
				icon={Home}
				title="Tipologia de uso OODC"
				breadcrumb={
					<Link
						href="/relatorios"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
						<ArrowLeft className="h-3.5 w-3.5" />
						Relatórios
						<span className="mx-1 opacity-40">/</span>
						<span className="text-foreground">Tipologia de uso</span>
					</Link>
				}
				actions={
					<Suspense>
						<BotaoExportarExcel tipo="tipologia" />
					</Suspense>
				}>
				<span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					Residencial, Não Residencial e Uso Misto · {periodoLabel}
				</span>
			</PageHeader>

			<FiltroBar className="gap-4">
				<FiltroAnoChips />
				<FiltrosPeriodoDatas />
			</FiltroBar>

			<StatGroup className="mb-6">
				<div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
					<Kpi label="Processos" valor={String(d.totais.qtdProcessos)} />
					<Kpi label="Arrecadado" valor={fmtBrl(d.totais.valorArrecadado)} />
					<Kpi label="Em aberto" valor={fmtBrl(d.totais.valorEmAberto)} />
					<Kpi label="Quebra" valor={fmtBrl(d.totais.valorQuebra)} />
				</div>
			</StatGroup>

			<div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
				<GraficoTipologiaPizza d={d} />
				<GraficoTipologiaBarras d={d} />
			</div>

			<TabelaTipologia d={d} />
		</PageShell>
	);
}

function FiltroAnoChips() {
	const ano = new Date().getFullYear();
	const anos = [ano, ano - 1, ano - 2, ano - 3, ano - 4];
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className={filtroLabelClass}>Ano</span>
			<FiltroChip href="?ano=todos" ativo={false}>
				Todos
			</FiltroChip>
			{anos.map((a) => (
				<FiltroChip key={a} href={`?ano=${a}`} ativo={false}>
					{a}
				</FiltroChip>
			))}
		</div>
	);
}

function Kpi({ label, valor }: { label: string; valor: string }) {
	return (
		<div className="bg-card p-4">
			<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div className="mt-1 font-mono text-lg font-bold">{valor}</div>
		</div>
	);
}

function TabelaTipologia({ d }: { d: IRelatorioTipologia }) {
	return (
		<div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
			<div className="overflow-x-auto">
				<table className="w-full border-separate border-spacing-0 text-sm">
					<thead>
						<tr className="bg-primary">
							<th className="whitespace-nowrap px-3.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Tipologia</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Processos</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Total parcelas</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Arrecadado</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Em aberto</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Quebra</th>
						</tr>
					</thead>
					<tbody>
						{d.linhas.map((l) => (
							<tr key={l.codigo} className="border-t border-border transition-colors hover:bg-primary-soft">
								<td className="px-3.5 py-2.5 font-medium">{l.label}</td>
								<td className="px-3.5 py-2.5 text-right font-mono">{l.qtdProcessos}</td>
								<td className="px-3.5 py-2.5 text-right font-mono">{fmtBrl(l.valorTotal)}</td>
								<td className="px-3.5 py-2.5 text-right font-mono">
									{fmtBrl(l.valorArrecadado)}
								</td>
								<td className="px-3.5 py-2.5 text-right font-mono">
									{fmtBrl(l.valorEmAberto)}
								</td>
								<td className="px-3.5 py-2.5 text-right font-mono">{fmtBrl(l.valorQuebra)}</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr className="border-t border-border bg-muted/30 text-sm font-semibold">
							<td className="px-3.5 py-3">Total</td>
							<td className="px-3.5 py-3 text-right font-mono">{d.totais.qtdProcessos}</td>
							<td className="px-3.5 py-3 text-right font-mono">
								{fmtBrl(d.totais.valorTotal)}
							</td>
							<td className="px-3.5 py-3 text-right font-mono">
								{fmtBrl(d.totais.valorArrecadado)}
							</td>
							<td className="px-3.5 py-3 text-right font-mono">
								{fmtBrl(d.totais.valorEmAberto)}
							</td>
							<td className="px-3.5 py-3 text-right font-mono">
								{fmtBrl(d.totais.valorQuebra)}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}
