'use client';

import { IRelatorio } from '@/types/relatorio';
import { BarChart3, CheckCircle2, TrendingDown, TrendingUp, FolderOpen, AlertTriangle } from 'lucide-react';

const fmtM = (v: number | null, d = 1) =>
	v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}M`;
const fmtPct = (v: number, d = 1) => v.toFixed(d) + '%';

interface KpiCardProps {
	label: string;
	value: string;
	sub: string;
	icon: React.ReactNode;
	color?: string;
	bar?: number | null;
}

function KpiCard({ label, value, sub, icon, color, bar }: KpiCardProps) {
	return (
		<div className="rounded-xl border border-border bg-card px-5 py-4 shadow-xs">
			<div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
				{icon}
				{label}
			</div>
			<div
				className={`text-[22px] font-bold tracking-tight ${
					color === 'primary'
						? 'text-primary'
						: color === 'green'
							? 'text-green-700 dark:text-green-400'
							: color === 'amber'
								? 'text-amber-600'
								: color === 'red'
									? 'text-red-600'
									: color === 'purple'
										? 'text-violet-600'
										: 'text-foreground'
				}`}>
				{value}
			</div>
			<div className="mt-1 text-xs text-muted-foreground">{sub}</div>
			{bar != null && (
				<div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full transition-all"
						style={{
							width: `${Math.min(bar, 100)}%`,
							background: bar >= 95 ? '#16a34a' : bar >= 80 ? '#d97706' : '#dc2626',
						}}
					/>
				</div>
			)}
		</div>
	);
}

export function KpiCards({ d }: { d: IRelatorio | null }) {
	const totalReal = d?.d26.real.filter((v) => v != null).reduce((a, b) => a! + b!, 0) ?? 0;
	const metaAnual = d?.metaAnual ?? 1;
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const meses = d?.meses ?? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

	// Arrecadado por tipo — FUNDURB (Outorga + Cota + Multa) e AIU (à parte, fora do FUNDURB)
	const arr = d?.arrecadadoTipo ?? { outorga: 0, cota: 0, aiu: 0, multa: 0 };
	const arrFundurb = arr.outorga + arr.cota + (arr.multa ?? 0);
	const arrAiu = arr.aiu;
	const arrGeral = arrFundurb + arrAiu;

	const pctMeta = (totalReal! / metaAnual) * 100;

	// KPIs de gestão do fundo — FUNDURB, excluindo AIU
	const fundurb = d?.fundurb ?? { arrecadado: 0, quebras: 0, antecipacoes: 0, prevRestante: 0, processos: 0 };
	const inadimpl =
		fundurb.arrecadado + fundurb.quebras > 0
			? (fundurb.quebras / (fundurb.arrecadado + fundurb.quebras)) * 100
			: 0;

	// Estimativa de quebras futuras baseada na taxa FUNDURB observada no ano corrente
	const quebraRate =
		fundurb.arrecadado + fundurb.quebras > 0
			? fundurb.quebras / (fundurb.arrecadado + fundurb.quebras)
			: 0;
	const remainingLiq = Math.max(fundurb.prevRestante - fundurb.prevRestante * quebraRate, 0);

	const mesProxLabel = mesAtual < 11 ? meses[mesAtual + 1] : null;
	const mesRemLabel = mesProxLabel ? `${mesProxLabel}–Dez ${d?.anoAtual ?? ''}` : '';

	const cards: KpiCardProps[] = [
		{
			label: `Arrecadado Geral ${d?.anoAtual ?? new Date().getFullYear()}`,
			value: fmtM(arrGeral, 0),
			sub: fmtPct(pctMeta) + ' da meta anual',
			icon: <BarChart3 className="h-3 w-3" />,
			color: 'primary',
			bar: pctMeta,
		},
		{
			label: 'Arrecadado FUNDURB',
			value: fmtM(arrFundurb, 0),
			sub: 'Outorga + Cota + Multa',
			icon: <BarChart3 className="h-3 w-3" />,
			color: 'green',
		},
		{
			label: 'Arrecadado AIU',
			value: fmtM(arrAiu, 0),
			sub: 'Fora do FUNDURB',
			icon: <BarChart3 className="h-3 w-3" />,
			color: 'purple',
		},
		{
			label: 'A Receber Líquido',
			value: fmtM(remainingLiq, 0),
			sub: `${mesRemLabel} · FUNDURB (aj. quebras ${fmtPct(quebraRate * 100, 1)})`,
			icon: <TrendingUp className="h-3 w-3" />,
		},
		{
			label: 'Valor em Quebras',
			value: fmtM(fundurb.quebras),
			sub: 'FUNDURB · acordos encerrados pelo munícipe',
			icon: <AlertTriangle className="h-3 w-3" />,
			color: 'amber',
		},
		{
			label: 'Antecipações',
			value: fmtM(fundurb.antecipacoes),
			sub: 'FUNDURB · pago antes do vencimento',
			icon: <CheckCircle2 className="h-3 w-3" />,
			color: 'purple',
		},
		{
			label: 'Processos Ativos',
			value: fundurb.processos.toLocaleString('pt-BR'),
			sub: `FUNDURB · Outorga: ${d?.pde.count ?? 0} · Cota: ${d?.cota.count ?? 0}`,
			icon: <FolderOpen className="h-3 w-3" />,
		},
		{
			label: 'Taxa Inadimplência',
			value: fmtPct(inadimpl),
			sub: 'FUNDURB · valor perdido / total esperado',
			icon: <TrendingDown className="h-3 w-3" />,
			color: 'red',
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
			{cards.map((c) => (
				<KpiCard key={c.label} {...c} />
			))}
		</div>
	);
}
