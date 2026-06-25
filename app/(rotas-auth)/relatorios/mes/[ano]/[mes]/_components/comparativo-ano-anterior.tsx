'use client';

import { IRelatorioMesDetalhe } from '@/types/relatorio';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function ComparativoAnoAnterior({ d }: { d: IRelatorioMesDetalhe }) {
	const { anoAnterior, realizado, previsto, ano, nomeMes } = d;
	const varReal = anoAnterior.realizado > 0
		? ((realizado - anoAnterior.realizado) / anoAnterior.realizado) * 100
		: null;
	const varPrev = anoAnterior.previsto > 0
		? ((previsto - anoAnterior.previsto) / anoAnterior.previsto) * 100
		: null;

	function VarBadge({ pct }: { pct: number | null }) {
		if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
		const pos = pct >= 0;
		return (
			<span
				className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
					pos
						? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
						: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
				}`}>
				{pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
				{pos ? '+' : ''}{pct.toFixed(1)}%
			</span>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Minus className="h-4 w-4 text-muted-foreground" />
				Comparativo — {nomeMes} {ano} vs {nomeMes} {ano - 1}
			</div>
			<div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
				<div>
					<div className="text-xs text-muted-foreground mb-1">Previsto {ano}</div>
					<div className="text-lg font-bold">{fmtBrl(previsto)}</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground mb-1">Previsto {ano - 1}</div>
					<div className="text-lg font-bold text-muted-foreground">{fmtBrl(anoAnterior.previsto)}</div>
					<div className="mt-1"><VarBadge pct={varPrev} /></div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground mb-1">Realizado {ano}</div>
					<div className="text-lg font-bold text-green-700 dark:text-green-400">{fmtBrl(realizado)}</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground mb-1">Realizado {ano - 1}</div>
					<div className="text-lg font-bold text-muted-foreground">{fmtBrl(anoAnterior.realizado)}</div>
					<div className="mt-1"><VarBadge pct={varReal} /></div>
				</div>
			</div>
		</div>
	);
}
