/** @format */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Ban, Clock, HeartPulse, Info, TrendingUp, Zap } from 'lucide-react';
import { TableSkeleton } from '@/components/data-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { relatorioSaude } from '@/services/relatorios/saude';
import type {
	IRelatorioSaude,
	IRelatorioSaudeKpis,
	IRelatorioSaudeRegiao,
} from '@/types/relatorio';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default async function SaudeArrecadacaoPage({ searchParams }: { searchParams: SearchParams }) {
	const params = await searchParams;
	const anoRaw = typeof params.ano === 'string' ? params.ano : undefined;
	const ano = anoRaw === 'todos' ? undefined : anoRaw ? Number(anoRaw) : new Date().getFullYear();

	return (
		<Suspense fallback={<TableSkeleton />}>
			<Conteudo ano={ano} />
		</Suspense>
	);
}

async function Conteudo({ ano }: { ano?: number }) {
	const resp = await relatorioSaude(ano);
	if (!resp.ok || !resp.data) notFound();
	const d = resp.data;

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			{/* Breadcrumb */}
			<div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
				<Link href="/relatorios" className="flex items-center gap-1 hover:text-foreground transition-colors">
					<ArrowLeft className="h-3.5 w-3.5" />
					Relatórios
				</Link>
				<span>/</span>
				<span className="font-semibold text-foreground">Saúde da arrecadação</span>
			</div>

			{/* Título + descrição */}
			<div className="mb-5">
				<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
					<HeartPulse className="h-6 w-6 text-primary" />
					Saúde da arrecadação
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Coorte de parcelas por ano de vencimento — quebra, inadimplência, antecipação e
					tempo de pagamento.
				</p>
			</div>

			{/* Filtro de ano */}
			<FiltroAno anos={d.anos} anoAtual={d.ano} />

			{/* Aviso de cobertura */}
			{d.kpis.coberturaDataQuit < 95 && (
				<div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
					<Info className="mt-0.5 h-4 w-4 shrink-0" />
					<span>
						O <strong>tempo de pagamento</strong> é calculado apenas sobre as parcelas
						quitadas que possuem data exata de quitação (
						<strong>{fmtPct(d.kpis.coberturaDataQuit)}</strong> das quitadas). As demais
						registram somente o ano. Valores de arrecadação, quebra e inadimplência não são
						afetados.
					</span>
				</div>
			)}

			<div className="flex flex-col gap-6">
				<Kpis kpis={d.kpis} />
				<DistribuicaoPagamento d={d} />
				<PorSubprefeitura regioes={d.porSubprefeitura} />
				<PorTipo d={d} />
			</div>
		</div>
	);
}

function FiltroAno({ anos, anoAtual }: { anos: number[]; anoAtual: number | null }) {
	const chip = (label: string, ativo: boolean, href: string) => (
		<Link
			key={label}
			href={href}
			className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
				ativo
					? 'border-foreground bg-foreground text-background'
					: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
			}`}>
			{label}
		</Link>
	);

	return (
		<div className="mb-6 flex flex-wrap items-center gap-2">
			<span className="text-xs text-muted-foreground">Coorte de vencimento:</span>
			{chip('Todos os anos', anoAtual == null, '?ano=todos')}
			{anos.map((a) => chip(String(a), anoAtual === a, `?ano=${a}`))}
		</div>
	);
}

function Kpis({ kpis }: { kpis: IRelatorioSaudeKpis }) {
	const cards = [
		{
			label: 'Previsto na coorte',
			valor: fmtBrl(kpis.previsto),
			sub: 'total de vencimentos',
			icon: <Clock className="h-4 w-4 text-muted-foreground" />,
			cor: 'text-foreground',
			tooltip: 'Soma de todas as parcelas com vencimento no período selecionado.',
		},
		{
			label: 'Arrecadado',
			valor: fmtBrl(kpis.arrecadado),
			sub: `${fmtPct(kpis.taxaArrecadacao)} do previsto`,
			icon: <TrendingUp className="h-4 w-4 text-green-600" />,
			cor: 'text-green-700 dark:text-green-400',
			tooltip: 'Parcelas quitadas (exceto quebras) da coorte.',
		},
		{
			label: 'Inadimplência',
			valor: fmtBrl(kpis.vencidoValor),
			sub: `${fmtPct(kpis.taxaInadimplencia)} · ${kpis.vencidoCount} parcelas vencidas`,
			icon: <Clock className="h-4 w-4 text-red-500" />,
			cor: kpis.vencidoValor > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
			tooltip: 'Parcelas vencidas, ainda em aberto e sem quebra. Valor efetivamente em atraso.',
		},
		{
			label: 'Quebras',
			valor: fmtBrl(kpis.quebraValor),
			sub: `${fmtPct(kpis.taxaQuebra)} · ${kpis.quebraCount} parcelas`,
			icon: <Ban className="h-4 w-4 text-amber-500" />,
			cor: kpis.quebraValor > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
			tooltip: 'Parcelas de contratos em situação de quebra — valor que não será arrecadado.',
		},
		{
			label: 'Antecipação',
			valor: fmtBrl(kpis.antecipadoValor),
			sub:
				kpis.mediaDiasAntecipacao != null
					? `média ${kpis.mediaDiasAntecipacao} dias · ${kpis.antecipadoCount} parcelas`
					: `${kpis.antecipadoCount} parcelas`,
			icon: <Zap className="h-4 w-4 text-blue-500" />,
			cor: 'text-blue-700 dark:text-blue-400',
			tooltip: 'Parcelas pagas antes do vencimento.',
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
			{cards.map((c) => (
				<div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-xs">
					<div className="mb-2 flex items-center gap-2">
						{c.icon}
						<span className="text-xs text-muted-foreground">{c.label}</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="ml-auto h-3 w-3 shrink-0 cursor-help text-muted-foreground/50 hover:text-muted-foreground" />
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-[240px] text-center leading-relaxed">
								{c.tooltip}
							</TooltipContent>
						</Tooltip>
					</div>
					<div className={`text-xl font-bold ${c.cor}`}>{c.valor}</div>
					<div className="mt-1 text-[11px] text-muted-foreground">{c.sub}</div>
				</div>
			))}
		</div>
	);
}

function DistribuicaoPagamento({ d }: { d: IRelatorioSaude }) {
	const total = d.distribuicaoPagamento.reduce((s, b) => s + b.count, 0);
	const cores = ['bg-green-500', 'bg-amber-400', 'bg-orange-500', 'bg-red-500'];

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-1 flex items-center gap-2 text-sm font-semibold">
				<Clock className="h-4 w-4 text-muted-foreground" />
				Tempo de pagamento
			</div>
			<p className="mb-4 text-xs text-muted-foreground">
				Distribuição das {total.toLocaleString('pt-BR')} parcelas quitadas com data de
				quitação, pelo atraso em relação ao vencimento.
				{d.kpis.pagoAtrasoCount > 0 && d.kpis.mediaDiasAtraso != null && (
					<> Entre as pagas com atraso, a média é de <strong>{d.kpis.mediaDiasAtraso} dias</strong>.</>
				)}
			</p>

			{total === 0 ? (
				<p className="py-4 text-sm text-muted-foreground">Sem parcelas com data de quitação.</p>
			) : (
				<div className="flex flex-col gap-3">
					{/* Barra empilhada */}
					<div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
						{d.distribuicaoPagamento.map((b, i) => (
							<div
								key={b.label}
								className={cores[i]}
								style={{ width: `${(b.count / total) * 100}%` }}
								title={`${b.label}: ${b.count}`}
							/>
						))}
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{d.distribuicaoPagamento.map((b, i) => (
							<div key={b.label} className="flex items-start gap-2">
								<span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cores[i]}`} />
								<div className="min-w-0">
									<div className="text-[11px] text-muted-foreground">{b.label}</div>
									<div className="text-sm font-semibold">
										{b.count.toLocaleString('pt-BR')}{' '}
										<span className="text-[11px] font-normal text-muted-foreground">
											({fmtPct((b.count / total) * 100)})
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function riscoClasse(taxa: number) {
	if (taxa >= 20) return 'text-red-600 dark:text-red-400 font-semibold';
	if (taxa >= 10) return 'text-amber-600 dark:text-amber-400 font-medium';
	return 'text-muted-foreground';
}

function PorSubprefeitura({ regioes }: { regioes: IRelatorioSaudeRegiao[] }) {
	return (
		<div className="rounded-xl border border-border bg-card shadow-xs">
			<div className="border-b border-border px-5 py-4 text-sm font-semibold">
				Risco por subprefeitura
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border text-xs text-muted-foreground">
							<th className="px-5 py-3 text-left font-medium">Subprefeitura</th>
							<th className="px-4 py-3 text-right font-medium">Previsto</th>
							<th className="px-4 py-3 text-right font-medium">Arrecadado</th>
							<th className="px-4 py-3 text-right font-medium">Em aberto</th>
							<th className="px-4 py-3 text-right font-medium">Inadimplência</th>
							<th className="px-4 py-3 text-right font-medium">Quebra</th>
							<th className="px-4 py-3 text-right font-medium">Proc.</th>
						</tr>
					</thead>
					<tbody>
						{regioes.length === 0 && (
							<tr>
								<td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
									Sem dados no período.
								</td>
							</tr>
						)}
						{regioes.map((r) => (
							<tr key={r.nome} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
								<td className="px-5 py-3 font-medium">{r.nome}</td>
								<td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
									{fmtBrl(r.previsto)}
								</td>
								<td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-400">
									{fmtBrl(r.arrecadado)}
								</td>
								<td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
									{fmtBrl(r.emAbertoValor)}
								</td>
								<td className={`px-4 py-3 text-right tabular-nums ${riscoClasse(r.taxaInadimplencia)}`}>
									{fmtPct(r.taxaInadimplencia)}
								</td>
								<td className={`px-4 py-3 text-right tabular-nums ${riscoClasse(r.taxaQuebra)}`}>
									{fmtPct(r.taxaQuebra)}
								</td>
								<td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.proc}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
				Previsto = arrecadado + em aberto + quebra. <strong>Em aberto</strong> inclui parcelas a
				vencer e vencidas; a <strong>inadimplência</strong> é a parte já vencida. Percentuais
				sobre o previsto da subprefeitura, com destaque em{' '}
				<span className="text-amber-600 dark:text-amber-400">amber ≥ 10%</span> e{' '}
				<span className="text-red-600 dark:text-red-400">vermelho ≥ 20%</span>.
			</div>
		</div>
	);
}

function PorTipo({ d }: { d: IRelatorioSaude }) {
	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 text-sm font-semibold">Por tipo de outorga</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{d.porTipo.map((t) => {
					const taxaArrec = t.previsto > 0 ? (t.arrecadado / t.previsto) * 100 : 0;
					return (
						<div key={t.tipo} className="rounded-lg border border-border p-4">
							<div className="mb-2 flex items-center justify-between">
								<span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
									{t.tipo}
								</span>
								<span className="text-xs text-muted-foreground">{fmtPct(taxaArrec)} arrecadado</span>
							</div>
							<div className="text-lg font-bold">{fmtBrl(t.previsto)}</div>
							<div className="mt-1 text-[11px] text-muted-foreground">previsto</div>
							<div className="mt-2 flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Quebra</span>
								<span className={riscoClasse(t.taxaQuebra)}>
									{fmtPct(t.taxaQuebra)} · {fmtBrl(t.quebraValor)}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
