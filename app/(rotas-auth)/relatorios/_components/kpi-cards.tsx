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
	const totalQuebras = d?.d26.quebras.filter((v) => v != null).reduce((a, b) => a! + b!, 0) ?? 0;
	const totalAntec = d?.d26.antec.filter((v) => v != null).reduce((a, b) => a! + b!, 0) ?? 0;
	const metaAnual = d?.metaAnual ?? 1;
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const meses = d?.meses ?? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
	const remaining =
		d?.d26.prev.slice(mesAtual + 1).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const pctMeta = (totalReal! / metaAnual) * 100;
	const inadimpl = totalReal! + totalQuebras! > 0 ? (totalQuebras! / (totalReal! + totalQuebras!)) * 100 : 0;

	// Estimativa de quebras futuras baseada na taxa observada no ano corrente
	const quebraRate = totalReal + totalQuebras > 0 ? totalQuebras / (totalReal + totalQuebras) : 0;
	const estimatedFutureQuebras = remaining * quebraRate;
	const remainingLiq = Math.max(remaining - estimatedFutureQuebras, 0);

	const mesProxLabel = mesAtual < 11 ? meses[mesAtual + 1] : null;
	const mesRemLabel = mesProxLabel ? `${mesProxLabel}–Dez ${d?.anoAtual ?? ''}` : '';

	const cards: KpiCardProps[] = [
		{
			label: `Arrecadado ${d?.anoAtual ?? new Date().getFullYear()}`,
			value: fmtM(totalReal as number, 0),
			sub: fmtPct(pctMeta) + ' da meta anual',
			icon: <BarChart3 className="h-3 w-3" />,
			color: 'primary',
			bar: pctMeta,
		},
		{
			label: 'A Receber Líquido',
			value: fmtM(remainingLiq, 0),
			sub: `${mesRemLabel} (aj. taxa quebras ${fmtPct(quebraRate * 100, 1)})`,
			icon: <TrendingUp className="h-3 w-3" />,
		},
		{
			label: 'Valor em Quebras',
			value: fmtM(totalQuebras as number),
			sub: 'Acordos encerrados por parte do munícipe',
			icon: <AlertTriangle className="h-3 w-3" />,
			color: 'amber',
		},
		{
			label: 'Antecipações',
			value: fmtM(totalAntec as number),
			sub: 'Pago antes do vencimento',
			icon: <CheckCircle2 className="h-3 w-3" />,
			color: 'purple',
		},
		{
			label: 'Processos Ativos',
			value: (d?.totalProcessos ?? 0).toLocaleString('pt-BR'),
			sub: `PDE: ${d?.pde.count ?? 0} · COTA: ${d?.cota.count ?? 0}`,
			icon: <FolderOpen className="h-3 w-3" />,
		},
		{
			label: 'Taxa Inadimplência',
			value: fmtPct(inadimpl),
			sub: 'Valor perdido / total esperado',
			icon: <TrendingDown className="h-3 w-3" />,
			color: 'red',
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
			{cards.map((c) => (
				<KpiCard key={c.label} {...c} />
			))}
		</div>
	);
}
