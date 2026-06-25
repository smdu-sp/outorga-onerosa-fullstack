'use client';

import { IRelatorio } from '@/types/relatorio';
import { Target } from 'lucide-react';

const fmtM = (v: number, d = 0) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}M`;
const fmtPct = (v: number, d = 1) => v.toFixed(d) + '%';

const CENARIOS = [
	{ label: 'Conservador', mult: 0.92, color: '#dc2626' },
	{ label: 'Central', mult: 0.97, color: '#d97706' },
	{ label: 'Otimista', mult: 1.02, color: '#16a34a' },
];


export function ProjecaoFechamento({ d }: { d: IRelatorio | null }) {
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const metaAnual = d?.metaAnual ?? 1;

	const collected =
		d?.d26.real.filter((v) => v != null).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const remPrev =
		d?.d26.prev.slice(mesAtual + 1).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;

	const totalPrevPassado =
		d?.d26.prev.slice(0, mesAtual + 1).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const totalQuebras =
		d?.d26.quebras.filter((v) => v != null).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const taxaQuebrasHistorica =
		totalPrevPassado > 0 ? ((totalQuebras / totalPrevPassado) * 100).toFixed(1) : '—';

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Target className="h-4 w-4 text-muted-foreground" />
				Projeção de Fechamento — {d?.anoAtual ?? new Date().getFullYear()}
			</div>
			<p className="mb-4 text-xs leading-relaxed text-muted-foreground">
				Coletado <b className="text-foreground">Jan–{d?.meses[mesAtual] ?? '?'}:</b>{' '}
				{fmtM(collected)}&nbsp;·&nbsp; Previsto restante:{' '}
				{fmtM(remPrev)}&nbsp;·&nbsp; Meta:{' '}
				<b className="text-foreground">{fmtM(metaAnual)}</b>
			</p>
			<div className="grid grid-cols-3 gap-3">
				{CENARIOS.map((sc) => {
					const year = collected + remPrev * sc.mult;
					const gap = year - metaAnual;
					const pct = (year / metaAnual) * 100;
					return (
						<div key={sc.label} className="flex flex-col items-center gap-1 text-center">
							<div className="text-lg font-bold" style={{ color: sc.color }}>
								{fmtM(year)}
							</div>
							<div className="text-[11px] font-semibold text-muted-foreground">
								{sc.label}
							</div>
							<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full"
									style={{
										width: `${Math.min(pct, 100)}%`,
										background: sc.color,
									}}
								/>
							</div>
							<div className="text-[10px] font-semibold" style={{ color: sc.color }}>
								{fmtPct(pct)}{' '}
								{gap >= 0
									? `(+${gap.toFixed(0)}M)`
									: `(${gap.toFixed(0)}M)`}
							</div>
						</div>
					);
				})}
			</div>
			<div className="mt-4 rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
				⚠ Projeções consideram taxa de quebras histórica de ~{taxaQuebrasHistorica}% e sazonalidade de
				pagamentos. Antecipações extraordinárias podem melhorar o cenário central.
			</div>
		</div>
	);
}
